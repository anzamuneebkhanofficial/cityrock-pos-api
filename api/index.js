/** @format */

import app from '../src/app.js';
import connectDB from '../src/config/db.js';

let isBootstrapDone = false;

/**
 * Vercel Serverless Function Handler
 * Wraps the Express application with cold-start database connection and default seeding.
 * Reuses warm connections and cached state across subsequent invocations.
 */
export default async function handler(req, res) {
  try {
    // 1. Ensure MongoDB connection is established (cached across warm lambda invocations)
    await connectDB();
  } catch (error) {
    console.error('[Vercel Serverless] Fatal database connection failure:', error);
    return res.status(503).json({
      success: false,
      message: 'Database service unavailable. Please check MONGO_URI configuration in Vercel settings.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // 3. Forward request to Express application
  return app(req, res);
}
