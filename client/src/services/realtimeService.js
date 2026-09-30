const getRealtimeUrl = (sessionId) => {
  if (import.meta.env.VITE_REALTIME_URL) {
    return `${import.meta.env.VITE_REALTIME_URL.replace(/\/$/, '')}/realtime/interviews/${sessionId}`;
  }
  const apiUrl = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? 'https://localhost:5000/api' : 'http://localhost:5000/api');
  return `${apiUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '')}/realtime/interviews/${sessionId}`;
};

export const createInterviewRealtime = ({ sessionId, onEvent, onStatus }) => {
  let socket;
  let closed = false;
  let retryCount = 0;
  let retryTimer;

  const connect = () => {
    if (closed) return;
    onStatus('Connecting to live session...');
    socket = new WebSocket(getRealtimeUrl(sessionId));
    socket.onopen = () => {
      retryCount = 0;
      socket.send(JSON.stringify({ type: 'AUTH', token: localStorage.getItem('token') }));
    };
    socket.onmessage = (message) => {
      let payload;
      try {
        payload = JSON.parse(message.data);
      } catch {
        onStatus('Received an invalid live-session event');
        return;
      }
      if (payload.type === 'CONNECTED') onStatus('Live session connected');
      if (payload.type === 'EVENT') onEvent(payload.event);
      if (payload.type === 'ERROR') onStatus(payload.message);
    };
    socket.onerror = () => onStatus('Live session unavailable');
    socket.onclose = () => {
      if (closed || retryCount >= 5) {
        onStatus('Live session disconnected');
        return;
      }
      const delay = Math.min(1000 * 2 ** retryCount, 16000);
      retryCount += 1;
      onStatus(`Reconnecting in ${Math.ceil(delay / 1000)}s...`);
      retryTimer = window.setTimeout(connect, delay);
    };
  };

  connect();

  return {
    send(event) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'EVENT', event }));
      }
    },
    close() {
      closed = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    },
  };
};