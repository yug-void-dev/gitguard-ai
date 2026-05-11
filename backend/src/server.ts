/**
 * @file src/server.ts
 * @description Application entry point.
 *
 * Responsibilities:
 * 1. Validate environment variables (via env import)
 * 2. Connect to MongoDB
 * 3. Create and start the Express server
 * 4. Register graceful shutdown handlers
 */

import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './lib/logger';
import { startWorker, stopWorker } from './queue';
import { closeRedisConnection } from './config/redis-config';

const PORT = env.PORT;

async function bootstrap(): Promise<void> {
  // ── 1. Connect to database ────────────────────────────────────────────
  await connectDatabase();

  // ── 2. Start BullMQ review worker ────────────────────────────────────
  startWorker();

  // ── 3. Create Express app ─────────────────────────────────────────────
  const app = createApp();

  // ── 4. Start listening ────────────────────────────────────────────────
  const server = app.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        environment: env.NODE_ENV,
        pid: process.pid,
      },
      `🚀  GitGuard AI Backend listening on port ${PORT}`,
    );
  });

  // ── 4. Graceful shutdown ──────────────────────────────────────────────
  // Handle SIGTERM (Docker stop, Kubernetes eviction) and SIGINT (Ctrl+C)
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received — draining connections…');

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      // Stop the BullMQ worker (waits for in-flight jobs to finish)
      await stopWorker();

      // Close Redis connection (after worker is stopped)
      await closeRedisConnection();

      // Close database connection
      await disconnectDatabase();

      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force exit after 15 seconds if graceful shutdown stalls
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15_000);
  };

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  // ── 5. Unhandled rejection guard ─────────────────────────────────────
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ reason }, 'Unhandled Promise rejection — exiting');
    process.exit(1);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error({ error }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

// Start the server
bootstrap().catch((error: unknown) => {
  logger.error({ error }, 'Failed to start application');
  process.exit(1);
});
