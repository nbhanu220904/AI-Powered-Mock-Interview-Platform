import { Router } from 'express';
import {
  startInterview,
  submitTextAnswer,
  submitVoiceAnswer,
  submitCode,
  endInterview,
  getInterview,
  transcribeOnly,
  speakText,
  getVideoSession,
  startVideoSession,
  updateVideoSession,
  addVideoTranscript,
  endVideoSession,
} from '../controllers/interview.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { uploadAudio } from '../middleware/upload.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/start', startInterview);
router.post('/transcribe', uploadAudio, transcribeOnly);
router.post('/:id/answer', submitTextAnswer);
router.post('/:id/answer-audio', uploadAudio, submitVoiceAnswer);
router.post('/:id/code', submitCode);
router.post('/:id/end', endInterview);
router.get('/:id', getInterview);
router.post('/:id/speak', speakText);
router.post('/:id/video/session', startVideoSession);
router.get('/:id/video/session', getVideoSession);
router.patch('/:id/video/session', updateVideoSession);
router.post('/:id/video/transcript', addVideoTranscript);
router.post('/:id/video/end', endVideoSession);

export default router;