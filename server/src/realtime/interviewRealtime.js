import WebSocket, { WebSocketServer } from 'ws';
import { verifyToken } from '../utils/jwt.utils.js';
import Interview from '../models/Interview.model.js';

const allowedEvents = new Set([
  'INTERVIEW_STARTED',
  'AI_SPEAKING_STARTED',
  'AI_SPEAKING_STOPPED',
  'USER_SPEAKING_STARTED',
  'USER_SPEAKING_STOPPED',
  'TRANSCRIPT_PARTIAL',
  'TRANSCRIPT_FINAL',
  'AI_RESPONSE_STARTED',
  'AI_RESPONSE_COMPLETED',
  'METRICS_UPDATED',
  'CONNECTION_CHANGED',
  'INTERVIEW_COMPLETED',
]);

const sessionClients = new Map();

const send = (socket, message) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
};

const broadcast = (sessionId, message) => {
  const clients = sessionClients.get(sessionId) || new Set();
  clients.forEach((client) => send(client, message));
};

const removeClient = (sessionId, socket) => {
  const clients = sessionClients.get(sessionId);
  if (!clients) return;
  clients.delete(socket);
  if (clients.size === 0) sessionClients.delete(sessionId);
};

export const createInterviewRealtime = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost');
    const match = url.pathname.match(/^\/realtime\/interviews\/([^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit('connection', client, request, match[1]);
    });
  });

  wss.on('connection', (socket, request, sessionId) => {
    let authenticated = false;
    let userId = null;

    const authTimeout = setTimeout(() => {
      if (!authenticated) socket.close(1008, 'Authentication required');
    }, 10000);

    socket.on('message', async (rawMessage) => {
      if (rawMessage.length > 256 * 1024) {
        socket.close(1009, 'Message too large');
        return;
      }
      let message;
      try {
        message = JSON.parse(rawMessage.toString());
      } catch {
        socket.close(1003, 'Invalid message');
        return;
      }

      if (!authenticated) {
        if (message.type !== 'AUTH' || !message.token) {
          socket.close(1008, 'Authentication required');
          return;
        }
        try {
          const tokenPayload = verifyToken(message.token);
          const interview = await Interview.findOne({ _id: sessionId, userId: tokenPayload.id });
          if (!interview) {
            socket.close(1008, 'Interview access denied');
            return;
          }
          authenticated = true;
          userId = tokenPayload.id;
          clearTimeout(authTimeout);
          if (!sessionClients.has(sessionId)) sessionClients.set(sessionId, new Set());
          sessionClients.get(sessionId).add(socket);
          send(socket, { type: 'CONNECTED', sessionId });
        } catch {
          socket.close(1008, 'Invalid authentication');
        }
        return;
      }

      if (message.type !== 'EVENT' || !message.event || !allowedEvents.has(message.event.type)) {
        send(socket, { type: 'ERROR', message: 'Unsupported interview event' });
        return;
      }

      const event = {
        ...message.event,
        sessionId,
        userId,
        timestamp: message.event.timestamp || new Date().toISOString(),
      };
      broadcast(sessionId, { type: 'EVENT', event });
    });

    socket.on('close', () => {
      clearTimeout(authTimeout);
      if (authenticated) removeClient(sessionId, socket);
    });
  });

  return wss;
};