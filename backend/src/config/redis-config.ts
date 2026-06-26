/**
 * @file src/config/redis.ts
 * @description Shared IORedis connection factory for BullMQ.
 *
 * System Design Rationale:
 * ─────────────────────────
 * BullMQ requires its own IORedis connection (cannot share with a generic Redis
 * client). We create a single shared connection that both the Queue and Worker
 * reuse — BullMQ automatically handles multiplexing internally.
 *
 * The connection is configured with:
 *  • maxRetriesPerRequest: null  — required by BullMQ (disables per-req timeout)
 *  • enableReadyCheck: false     — required by BullMQ
 *  • Automatic reconnect on error (IORedis default behaviour)
 *
 * @module config/redis
 */

import IORedis from 'ioredis';
import { env } from './env';
import { logger } from '../lib/logger';

let _connection: IORedis | null = null;

/**
 * Returns the singleton IORedis connection used by BullMQ.
 * Creates it on first call; subsequent calls return the cached instance.
 */
export function getRedisConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      tls: env.REDIS_HOST !== 'localhost' && env.REDIS_HOST !== '127.0.0.1' ? {} : undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false, // Required by BullMQ
      lazyConnect: false,
    });

    _connection.on('connect', () => {
      logger.info({ host: env.REDIS_HOST, port: env.REDIS_PORT }, '🔴 Redis connected');
    });

    _connection.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
    });

    _connection.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return _connection;
}

/**
 * Gracefully closes the Redis connection.
 * Called during application shutdown AFTER the BullMQ worker has stopped.
 */
export async function closeRedisConnection(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = null;
    logger.info('Redis connection closed gracefully');
  }
}
