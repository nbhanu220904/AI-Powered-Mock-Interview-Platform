// ============================================
// routes/index.js - Central Route Registry
// ============================================
// This file combines all route modules into one.
// All routes are prefixed with /api in app.js:
//   app.use('/api', routes);
//
// So the final URLs are:
//   /api/auth/...
//   /api/resume/...
//   /api/interview/...
//   /api/history/...
// Reference: Router, app.use() - reference-backend.md
// ============================================

import { Router } from 'express';
import authRoutes from './auth.routes.js';

// TODO: Import resume, interview, and history routes as you build them
import resumeRoutes from './resume.routes.js';
import interviewRoutes from './interview.routes.js';
import historyRoutes from './history.routes.js';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);           // → /api/auth/...

// TODO: Mount resume, interview, and history routes as you build them
router.use('/resume', resumeRoutes);       // → /api/resume/...
router.use('/interview', interviewRoutes); // → /api/interview/...
router.use('/history', historyRoutes);     // → /api/history/...

export default router;
