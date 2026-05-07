/**
 * @file src/config/database.ts
 * @description MongoDB connection management with Mongoose.
 *
 * Handles connection lifecycle, reconnection logic, and graceful shutdown.
 */

import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../lib/logger';

/** Connection options for production-grade reliability */
const MONGOOSE_OPTIONS: mongoose.ConnectOptions = {
  // Automatically retry failed operations
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Establishes a connection to MongoDB.
 * Logs success/failure and attaches connection event listeners.
 */
export async function connectDatabase(): Promise<void> {
  try {
    logger.info({ uri: maskUri(env.MONGODB_URI) }, 'Connecting to MongoDB…');

    await mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);

    logger.info('✅  MongoDB connected successfully');
  } catch (error) {
    logger.error({ error }, '❌  Failed to connect to MongoDB');
    throw error;
  }
}

/**
 * Gracefully closes the MongoDB connection.
 * Called during application shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error({ error }, 'Error closing MongoDB connection');
  }
}

/**
 * Masks credentials in a MongoDB URI for safe logging.
 * e.g. mongodb://user:pass@host/db → mongodb://***:***@host/db
 */
function maskUri(uri: string): string {
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
}

// Attach Mongoose event listeners for observability
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

mongoose.connection.on('error', (err: Error) => {
  logger.error({ error: err }, 'MongoDB connection error');
});
