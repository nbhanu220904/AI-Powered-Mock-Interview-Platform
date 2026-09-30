export const INTERVIEW_STATES = Object.freeze({
  INITIALIZING: 'initializing',
  CHECKING_DEVICES: 'checking_devices',
  READY: 'ready',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  AI_RESPONDING: 'ai_responding',
  PAUSED: 'paused',
  RECONNECTING: 'reconnecting',
  COMPLETED: 'completed',
  ERROR: 'error',
});

export const initialVideoInterviewState = {
  status: INTERVIEW_STATES.INITIALIZING,
  cameraEnabled: true,
  microphoneEnabled: true,
  screenSharing: false,
  transcriptOpen: true,
  metricsOpen: true,
  deviceError: '',
  connection: 'Local media ready',
  transcript: [],
  metrics: {
    speakingSeconds: 0,
    responseSeconds: 0,
    wordsPerMinute: 0,
    fillerWords: 0,
    responses: 0,
  },
};

export function videoInterviewReducer(state, action) {
  switch (action.type) {
    case 'STATUS_CHANGED':
      return { ...state, status: action.status };
    case 'SESSION_HYDRATED':
      return {
        ...state,
        transcript: action.transcript || [],
        metrics: { ...state.metrics, ...(action.metrics || {}) },
        status: action.status || state.status,
      };
    case 'DEVICE_ERROR':
      return { ...state, status: INTERVIEW_STATES.ERROR, deviceError: action.message };
    case 'CAMERA_CHANGED':
      return { ...state, cameraEnabled: action.enabled };
    case 'MICROPHONE_CHANGED':
      return { ...state, microphoneEnabled: action.enabled };
    case 'SCREEN_SHARE_CHANGED':
      return { ...state, screenSharing: action.enabled };
    case 'PANEL_CHANGED':
      return { ...state, [action.panel]: action.open };
    case 'CONNECTION_CHANGED':
      return { ...state, connection: action.connection };
    case 'TRANSCRIPT_ADDED':
      return { ...state, transcript: [...state.transcript, action.entry] };
    case 'METRICS_CHANGED':
      return { ...state, metrics: { ...state.metrics, ...action.metrics } };
    case 'REALTIME_EVENT':
      if (action.event.type === 'CONNECTION_CHANGED') {
        return { ...state, connection: action.event.status || 'Connected' };
      }
      if (action.event.type === 'TRANSCRIPT_PARTIAL' || action.event.type === 'TRANSCRIPT_FINAL') {
        return { ...state, transcript: [...state.transcript, { ...action.event, speaker: action.event.speaker || 'interviewer', isFinal: action.event.type === 'TRANSCRIPT_FINAL' }] };
      }
      if (action.event.type === 'METRICS_UPDATED') {
        return { ...state, metrics: { ...state.metrics, ...(action.event.metrics || {}) } };
      }
      return state;
    default:
      return state;
  }
}