/** @format */

import 'dotenv/config';
import app from './src/app.js';
import connectDB, { disconnectDB } from './src/config/db.js';

const PORT = process.env.PORT || 5000;
let server;
let isShuttingDown = false;

const shutdown = async (exitCode = 0, reason = 'signal') => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[Server] Shutting down gracefully...');
  console.log(`[Server] Shutdown reason: ${reason}`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      console.log('[Server] Express server closed.');
    }
    await disconnectDB();
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    exitCode = 1;
  } finally {
    process.exitCode = exitCode;
  }
};

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(
        `🚀 CityRock POS Express Server running at http://localhost:${PORT}`,
      );
      console.log(`📡 API Base: http://localhost:${PORT}/api/v1`);
      console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
      console.log(`====================================================`);
    });

    server.on('error', (error) => {
      console.error('[Server] Listener error:', error);
      void shutdown(1, 'listener error');
    });

    process.once('SIGTERM', () => void shutdown(0, 'SIGTERM'));
    process.once('SIGINT', () => void shutdown(0, 'SIGINT'));
    process.once('uncaughtException', (error) => {
      console.error('[Server] Uncaught exception:', error);
      void shutdown(1, 'uncaughtException');
    });
    process.once('unhandledRejection', (reason) => {
      console.error('[Server] Unhandled promise rejection:', reason);
      void shutdown(1, 'unhandledRejection');
    });
  } catch (error) {
    console.error('[Server] Fatal bootstrap error:', error);
    await disconnectDB();
    process.exitCode = 1;
  }
};

startServer();
