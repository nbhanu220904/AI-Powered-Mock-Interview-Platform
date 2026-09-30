import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaChartBar,
  FaCircle,
  FaClosedCaptioning,
  FaDesktop,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaRedo,
  FaVideo,
  FaVideoSlash,
  FaWifi,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  addVideoTranscript,
  endVideoSession,
  getVideoSession,
  startVideoSession,
  updateVideoSession,
} from '../../services/interviewService.js';
import { createInterviewRealtime } from '../../services/realtimeService.js';
import {
  INTERVIEW_STATES,
  initialVideoInterviewState,
  videoInterviewReducer,
} from './interviewState.js';
import './index.css';

const fillerWordPattern = /\b(um|uh|like|basically|you know)\b/gi;

function VideoInterviewPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const startedAtRef = useRef(null);
  const responseStartedAtRef = useRef(null);
  const [state, dispatch] = useReducer(videoInterviewReducer, initialVideoInterviewState);
  const [session, setSession] = useState(null);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [candidateText, setCandidateText] = useState('');
  const [ending, setEnding] = useState(false);
  const realtimeRef = useRef(null);

  const stopStream = useCallback((stream) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const requestMedia = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support camera and microphone access.');
    }

    dispatch({ type: 'STATUS_CHANGED', status: INTERVIEW_STATES.CHECKING_DEVICES });
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        dispatch({
          type: 'DEVICE_ERROR',
          message: `${track.kind === 'video' ? 'Camera' : 'Microphone'} disconnected. Reconnect it and retry.`,
        });
      };
    });
    if (videoRef.current) videoRef.current.srcObject = stream;
    startedAtRef.current = Date.now();
    dispatch({ type: 'STATUS_CHANGED', status: INTERVIEW_STATES.READY });
    dispatch({ type: 'CONNECTION_CHANGED', connection: 'Camera and microphone ready' });
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [videoSession] = await Promise.all([
          getVideoSession(sessionId),
          requestMedia(),
        ]);
        if (!active) return;
        setSession(videoSession);
        dispatch({
          type: 'SESSION_HYDRATED',
          transcript: videoSession.transcript,
          metrics: videoSession.metrics,
          status: videoSession.status === 'active' ? INTERVIEW_STATES.LISTENING : undefined,
        });
      } catch (error) {
        if (!active) return;
        const message = error.response?.data?.message || error.message || 'Unable to access your devices.';
        dispatch({ type: 'DEVICE_ERROR', message });
        toast.error(message);
      }
    };
    load();
    return () => {
      active = false;
      stopStream(streamRef.current);
      stopStream(screenStreamRef.current);
    };
  }, [requestMedia, sessionId, stopStream]);

  useEffect(() => {
    if (!session || session.status !== 'active') return undefined;
    realtimeRef.current = createInterviewRealtime({
      sessionId,
      onEvent: (event) => dispatch({ type: 'REALTIME_EVENT', event }),
      onStatus: (connection) => dispatch({ type: 'CONNECTION_CHANGED', connection }),
    });
    return () => {
      realtimeRef.current?.close();
      realtimeRef.current = null;
    };
  }, [session, sessionId]);

  useEffect(() => {
    const handleDeviceChange = () => {
      if (!streamRef.current?.getTracks().some((track) => track.readyState === 'live')) {
        dispatch({ type: 'DEVICE_ERROR', message: 'Camera or microphone is no longer available.' });
      }
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
  }, []);

  useEffect(() => {
    if (!session || session.status !== 'active') return undefined;
    const heartbeat = window.setInterval(() => {
      updateVideoSession(sessionId, {
        status: document.visibilityState === 'hidden' ? 'paused' : 'active',
        metrics: state.metrics,
      }).catch(() => {
        dispatch({ type: 'CONNECTION_CHANGED', connection: 'Reconnecting to interview session...' });
      });
    }, 30000);
    return () => window.clearInterval(heartbeat);
  }, [session, sessionId, state.metrics]);

  const toggleTrack = (kind) => {
    const track = streamRef.current?.getTracks().find((item) => item.kind === kind);
    if (!track) return;
    track.enabled = !track.enabled;
    dispatch({
      type: kind === 'video' ? 'CAMERA_CHANGED' : 'MICROPHONE_CHANGED',
      enabled: track.enabled,
    });
  };

  const toggleScreenShare = async () => {
    if (state.screenSharing) {
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
      dispatch({ type: 'SCREEN_SHARE_CHANGED', enabled: false });
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error('Screen sharing is not supported in this browser.');
      return;
    }
    try {
      screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current.getVideoTracks()[0].onended = () => {
        dispatch({ type: 'SCREEN_SHARE_CHANGED', enabled: false });
      };
      dispatch({ type: 'SCREEN_SHARE_CHANGED', enabled: true });
    } catch {
      toast.error('Screen sharing was not enabled.');
    }
  };

  const beginInterview = async () => {
    try {
      const nextSession = await startVideoSession(sessionId);
      setSession(nextSession);
      dispatch({ type: 'STATUS_CHANGED', status: INTERVIEW_STATES.LISTENING });
      toast.success('Your interview has started.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to start the interview.');
    }
  };

  const submitTranscript = async () => {
    const text = candidateText.trim();
    if (!text || state.status === INTERVIEW_STATES.PROCESSING) return;
    const entry = { speaker: 'candidate', text, isFinal: true, timestamp: new Date().toISOString() };
    dispatch({ type: 'STATUS_CHANGED', status: INTERVIEW_STATES.PROCESSING });
    dispatch({ type: 'TRANSCRIPT_ADDED', entry });
    realtimeRef.current?.send({ type: 'TRANSCRIPT_FINAL', speaker: 'candidate', text, timestamp: entry.timestamp });
    setCandidateText('');
    const responseSeconds = responseStartedAtRef.current
      ? Math.round((Date.now() - responseStartedAtRef.current) / 1000)
      : 0;
    const words = text.split(/\s+/).filter(Boolean).length;
    const elapsedMinutes = Math.max((Date.now() - (startedAtRef.current || Date.now())) / 60000, 1 / 60);
    const metrics = {
      responseSeconds,
      responses: state.metrics.responses + 1,
      fillerWords: state.metrics.fillerWords + (text.match(fillerWordPattern) || []).length,
      wordsPerMinute: Math.round(words / elapsedMinutes),
    };
    dispatch({ type: 'METRICS_CHANGED', metrics });
    realtimeRef.current?.send({ type: 'METRICS_UPDATED', metrics });
    try {
      await addVideoTranscript(sessionId, entry);
      await updateVideoSession(sessionId, { status: 'active', metrics });
      dispatch({ type: 'STATUS_CHANGED', status: INTERVIEW_STATES.AI_RESPONDING });
      window.setTimeout(() => dispatch({ type: 'STATUS_CHANGED', status: INTERVIEW_STATES.LISTENING }), 900);
    } catch (error) {
      dispatch({ type: 'STATUS_CHANGED', status: INTERVIEW_STATES.RECONNECTING });
      toast.error(error.response?.data?.message || 'Transcript could not be saved.');
    }
  };

  const finishInterview = async () => {
    setEnding(true);
    try {
      await endVideoSession(sessionId, state.metrics);
      dispatch({ type: 'STATUS_CHANGED', status: INTERVIEW_STATES.COMPLETED });
      navigate(`/feedback/${sessionId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save the interview.');
    } finally {
      setEnding(false);
      setShowEndConfirmation(false);
    }
  };

  const retryDevices = async () => {
    try {
      await requestMedia();
    } catch (error) {
      dispatch({ type: 'DEVICE_ERROR', message: error.message });
    }
  };

  const statusLabel = state.status.replaceAll('_', ' ');
  const started = session?.status === 'active' || state.status === INTERVIEW_STATES.LISTENING;

  return (
    <main className="video-interview-page">
      <header className="video-interview-header">
        <div>
          <span className="video-interview-eyebrow">NxtMock live interview</span>
          <h1>{session?.role || 'Interview session'}</h1>
        </div>
        <div className="video-interview-connection" aria-live="polite">
          <FaWifi aria-hidden="true" />
          <span>{state.connection}</span>
        </div>
      </header>

      <section className="video-interview-workspace">
        <div className="video-interview-stage">
          <div className="video-interview-video-shell">
            <video ref={videoRef} autoPlay muted playsInline aria-label="Your camera preview" />
            <div className="video-interview-ai-card">
              <div className={`video-interview-ai-avatar ${state.status === INTERVIEW_STATES.AI_RESPONDING ? 'is-speaking' : ''}`}>
                <FaCircle aria-hidden="true" />
              </div>
              <div>
                <strong>NxtMock AI</strong>
                <span>{statusLabel}</span>
              </div>
            </div>
            <div className="video-interview-live-badge"><FaCircle aria-hidden="true" /> Live</div>
          </div>

          {state.deviceError && (
            <div className="video-interview-error" role="alert">
              <span>{state.deviceError}</span>
              <button type="button" onClick={retryDevices}><FaRedo aria-hidden="true" /> Retry</button>
            </div>
          )}

          <div className="video-interview-controls" aria-label="Interview controls">
            <button type="button" className="video-control-button" onClick={() => toggleTrack('audio')} aria-label={state.microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'}>
              {state.microphoneEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
              <span>{state.microphoneEnabled ? 'Mic' : 'Muted'}</span>
            </button>
            <button type="button" className="video-control-button" onClick={() => toggleTrack('video')} aria-label={state.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}>
              {state.cameraEnabled ? <FaVideo /> : <FaVideoSlash />}
              <span>{state.cameraEnabled ? 'Camera' : 'Camera off'}</span>
            </button>
            <button type="button" className="video-control-button" onClick={toggleScreenShare} aria-label="Toggle screen sharing">
              <FaDesktop /><span>{state.screenSharing ? 'Stop share' : 'Share'}</span>
            </button>
            <button type="button" className="video-control-button" onClick={() => dispatch({ type: 'PANEL_CHANGED', panel: 'transcriptOpen', open: !state.transcriptOpen })} aria-label="Toggle transcript">
              <FaClosedCaptioning /><span>Transcript</span>
            </button>
            <button type="button" className="video-control-button" onClick={() => dispatch({ type: 'PANEL_CHANGED', panel: 'metricsOpen', open: !state.metricsOpen })} aria-label="Toggle metrics">
              <FaChartBar /><span>Metrics</span>
            </button>
            <button type="button" className="video-control-button video-control-end" onClick={() => setShowEndConfirmation(true)} disabled={ending}>
              <FaPhoneSlash /><span>End</span>
            </button>
          </div>
        </div>

        <aside className="video-interview-sidebar">
          <div className="video-interview-session-status">
            <span className="video-interview-status-dot" />
            <div><strong>{started ? 'Interview in progress' : 'Prepare for your interview'}</strong><span>{statusLabel}</span></div>
          </div>

          {!started && (
            <div className="video-interview-consent">
              <p>Your camera and microphone are used for this mock interview. Your transcript and metrics are saved to your private interview session.</p>
              <button type="button" className="video-interview-primary" onClick={beginInterview} disabled={state.status !== INTERVIEW_STATES.READY}>Start interview</button>
            </div>
          )}

          {state.transcriptOpen && (
            <section className="video-interview-panel" aria-label="Live transcript">
              <div className="video-interview-panel-heading"><h2>Live transcript</h2><FaClosedCaptioning aria-hidden="true" /></div>
              <div className="video-interview-transcript" aria-live="polite">
                {state.transcript.length === 0 && <p className="video-interview-empty">Your saved transcript will appear here.</p>}
                {state.transcript.map((entry, index) => <p key={`${entry.timestamp}-${index}`} className="video-interview-transcript-entry"><strong>{entry.speaker === 'candidate' ? 'You' : 'NxtMock AI'}</strong><span>{entry.text}</span></p>)}
              </div>
              <textarea value={candidateText} onChange={(event) => { setCandidateText(event.target.value); responseStartedAtRef.current ||= Date.now(); }} placeholder="Type a response while streaming speech is being configured..." aria-label="Interview response" disabled={!started} />
              <button type="button" className="video-interview-secondary" onClick={submitTranscript} disabled={!candidateText.trim() || !started}>Save response</button>
            </section>
          )}

          {state.metricsOpen && (
            <section className="video-interview-panel" aria-label="Live performance metrics">
              <div className="video-interview-panel-heading"><h2>Live performance</h2><FaChartBar aria-hidden="true" /></div>
              <div className="video-interview-metrics-grid">
                <span>Responses<strong>{state.metrics.responses}</strong></span>
                <span>Words/min<strong>{state.metrics.wordsPerMinute}</strong></span>
                <span>Filler words<strong>{state.metrics.fillerWords}</strong></span>
                <span>Response time<strong>{state.metrics.responseSeconds}s</strong></span>
              </div>
            </section>
          )}
        </aside>
      </section>

      {showEndConfirmation && (
        <div className="video-interview-modal-backdrop" role="presentation">
          <div className="video-interview-modal" role="dialog" aria-modal="true" aria-labelledby="end-interview-title">
            <h2 id="end-interview-title">End interview?</h2>
            <p>Your current progress will be saved and your existing feedback report will be generated.</p>
            <div><button type="button" className="video-interview-secondary" onClick={() => setShowEndConfirmation(false)}>Continue</button><button type="button" className="video-interview-danger" onClick={finishInterview} disabled={ending}>{ending ? 'Saving...' : 'End interview'}</button></div>
          </div>
        </div>
      )}
    </main>
  );
}

export default VideoInterviewPage;