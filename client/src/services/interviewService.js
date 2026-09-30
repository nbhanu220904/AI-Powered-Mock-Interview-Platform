import API from './api.js';

const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await API.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

const getResume = async () => {
  try {
    const response = await API.get('/resume');
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

const startInterview = async (role, resumeText, totalQuestions) => {
  const response = await API.post('/interview/start', { role, resumeText, totalQuestions });
  return response.data.data;
};

const submitTextAnswer = async (interviewId, answer) => {
  const response = await API.post(`/interview/${interviewId}/answer`, { answer });
  return response.data.data;
};

const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'answer.webm');

  const response = await API.post('/interview/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

const submitCode = async (interviewId, code, language) => {
  const response = await API.post(`/interview/${interviewId}/code`, { code, language });
  return response.data.data;
};

const endInterview = async (interviewId) => {
  const response = await API.post(`/interview/${interviewId}/end`);
  return response.data.data;
};

const getInterview = async (interviewId) => {
  const response = await API.get(`/interview/${interviewId}`);
  return response.data.data;
};

const startVideoSession = async (interviewId) => {
  const response = await API.post(`/interview/${interviewId}/video/session`, {
    consent: true,
  });
  return response.data.data;
};

const getVideoSession = async (interviewId) => {
  const response = await API.get(`/interview/${interviewId}/video/session`);
  return response.data.data;
};

const updateVideoSession = async (interviewId, updates) => {
  const response = await API.patch(`/interview/${interviewId}/video/session`, updates);
  return response.data.data;
};

const addVideoTranscript = async (interviewId, transcript) => {
  const response = await API.post(`/interview/${interviewId}/video/transcript`, transcript);
  return response.data.data;
};

const endVideoSession = async (interviewId, metrics) => {
  const response = await API.post(`/interview/${interviewId}/video/end`, { metrics });
  return response.data.data;
};

export {
  uploadResume,
  getResume,
  startInterview,
  submitTextAnswer,
  transcribeAudio,
  submitCode,
  endInterview,
  getInterview,
  startVideoSession,
  getVideoSession,
  updateVideoSession,
  addVideoTranscript,
  endVideoSession,
};