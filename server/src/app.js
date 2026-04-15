// ============================================
// app.js - Express Application Setup
// ============================================
// This file configures the Express app with:
//   - CORS (so React frontend can talk to us)
//   - Body parsing (JSON + large payloads)
//   - API routes
//   - Error handling
// ============================================

import express from 'express';
import cors from 'cors';

// Import all routes (bundled in one index file)
import routes from './routes/index.js';

// Import the global error handler
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

// ---- Create the Express App ----
const app = express();

const normalizeOrigin = (value = '') => value.replace(/\/+$/, '');

const allowedOrigins = [
	process.env.CLIENT_URL,
	'http://localhost:5173',
	'https://nxtmock-ai.vercel.app',
]
	.filter(Boolean)
	.map(normalizeOrigin);

const corsOptions = {
	origin(origin, callback) {
		// Allow non-browser requests (no Origin header) such as health checks.
		if (!origin) return callback(null, true);

		const normalizedOrigin = normalizeOrigin(origin);
		if (allowedOrigins.includes(normalizedOrigin)) {
			return callback(null, true);
		}

		return callback(new Error(`CORS blocked for origin: ${origin}`));
	},
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
};

// ============================================
// MIDDLEWARE (runs on every request, in order)
// ============================================

// 1. CORS: Allow our frontend (React) to talk to this backend
//    Without this, browsers will block requests from localhost:5173 → localhost:5000
// app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));


// 2. Body Parser: Convert incoming JSON requests to JavaScript objects
//    10mb limit to handle large resume text and interview data
app.use(express.json({ limit: '10mb' }));

// ============================================
// ROUTES
// ============================================

// Mount all API routes under /api
// /api/auth      → authentication routes
// /api/interview → interview routes (start, answer, feedback)
// /api/resume    → resume upload and parsing routes
// /api/history   → interview history routes
app.use('/api', routes);

// ============================================
// ERROR HANDLING (must be AFTER routes)
// ============================================

// Handle 404 - Route not found
app.use(notFoundHandler);

// Handle all other errors (500, validation errors, etc.)
app.use(errorHandler);

// Export the app (used in server.js)
export default app;
