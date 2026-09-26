/** @format */

import mongoose from 'mongoose';

/**
 * Global cache maintains active connection across warm lambda invocations on Vercel
 * and prevents connection duplication across hot-reloads.
 */
let cached = globalThis.mongoose;

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

mongoose.connection.on('error', (error) => {
  console.error('[MongoDB] Runtime error:', error);
});

const connectDB = async () => {
  // If already connected and ready, return existing connection immediately
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  if (!cached.promise) {
    const isVercel = Boolean(process.env.VERCEL);
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cityrock';

    // Serverless environments need smaller connection pools to prevent Atlas limit exhaustion
    const options = isVercel
      ? {
          maxPoolSize: 10,
          minPoolSize: 0,
          maxIdleTimeMS: 10000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        }
      : {
          maxPoolSize: 50,
          minPoolSize: 5,
          maxIdleTimeMS: 30000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        };

    cached.promise = mongoose
      .connect(mongoUri, options)
      .then((m) => {
        const mode = isVercel ? 'serverless' : 'persistent';
        console.log(
          `[MongoDB] Connected successfully: ${m.connection.host}/${m.connection.name} (mode: ${mode})`,
        );
        return m.connection;
      })
      .catch((error) => {
        console.error('[MongoDB] Initial connection failed:', error.message);
        cached.promise = null; // Reset so retry can be attempted on next invocation
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('[MongoDB] Connection closed.');
  }
};

export default connectDB;
