/**
 * @file src/queue/reviewQueue.ts
 * @description BullMQ Queue instance for the AI code review pipeline.
 *
 * System Design Rationale:
 * ─────────────────────────
 * We use the Singleton pattern here: one Queue instance is created and reused
 * across the entire application. Creating multiple Queue instances for the same
 * queue name is safe in BullMQ but wastes Redis connections — the singleton
 * avoids that overhead.
 *
 * The Queue instance is used by PRODUCERS (webhook service enqueues jobs).
 * The Worker instance (reviewWorker.ts) is the CONSUMER.
 *
 * Queue Configuration:
 *  • defaultJobOptions.attempts: 3 (BullMQ auto-retries with back-off)
 *  • defaultJobOptions.backoff: exponential (aligned with retryStrategy.ts)
 *  • removeOnComplete: keep last 100 (dashboard visibility without unbounded growth)
 *  • removeOnFail: keep last 50 (debugging failed jobs)
 *
 * @module queue/reviewQueue
 */

import { Queue, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis-config';
import { ReviewJobPayload } from '../types/analysis';
import { logger } from '../lib/logger';

// ─── Queue Name ───────────────────────────────────────────────────────────────

export const REVIEW_QUEUE_NAME = 'review-pr';

// ─── Singleton ────────────────────────────────────────────────────────────────

let _queue: Queue<ReviewJobPayload> | null = null;

/**
 * Returns the singleton BullMQ Queue instance.
 * Creates it on first call; subsequent calls return the cached instance.
 */
export function getReviewQueue(): Queue<ReviewJobPayload> {
  if (!_queue) {
    _queue = new Queue<ReviewJobPayload>(REVIEW_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1_000, // 1s, 2s, 4s
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });

    _queue.on('error', (error) => {
      logger.error({ error, queue: REVIEW_QUEUE_NAME }, 'BullMQ Queue error');
    });

    logger.info({ queue: REVIEW_QUEUE_NAME }, '📦 BullMQ review queue initialised');
  }

  return _queue;
}

/**
 * Enqueues a PR review job.
 *
 * @param payload  - The full ReviewJobPayload
 * @param eventId  - Used as the BullMQ job ID for idempotency and correlation
 * @returns The created BullMQ Job
 */
export async function enqueueReviewJob(
  payload: ReviewJobPayload,
  eventId: string,
): Promise<Job<ReviewJobPayload>> {
  const queue = getReviewQueue();

  const job = await queue.add('review-pr', payload, {
    jobId: eventId, // Idempotent: same eventId won't be re-queued
  });

  logger.info(
    {
      jobId: job.id,
      eventId,
      repository: payload.repositoryFullName,
      prNumber: payload.prNumber,
    },
    '✅ Review job enqueued',
  );

  return job;
}

/**
 * Gracefully closes the queue connection.
 * Called during application shutdown.
 */
export async function closeReviewQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
    logger.info({ queue: REVIEW_QUEUE_NAME }, 'BullMQ queue connection closed');
  }
}
