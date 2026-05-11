/**
 * @file src/queue/queueMetrics.ts
 * @description Performance monitoring for the BullMQ review pipeline.
 *
 * System Design Rationale:
 * ─────────────────────────
 * Two concerns are handled here:
 *
 *  1. STAGE TIMING  — Wraps each pipeline stage (context build, LLM call,
 *     enrichment, DB persist) in process.hrtime.bigint() timers and emits
 *     a structured pino log entry. These logs can be ingested by Datadog /
 *     Grafana / CloudWatch for latency dashboards.
 *
 *  2. QUEUE DEPTH API — Exposes a lightweight metrics snapshot via
 *     BullMQ's getJobCounts(). Used by the GET /api/queue/metrics endpoint
 *     so the Week-4 dashboard can show real-time queue health.
 *
 * @module queue/queueMetrics
 */

import { getReviewQueue } from './reviewQueue';
import { logger } from '../lib/logger';

// ─── Stage Timer ──────────────────────────────────────────────────────────────

export interface StageMetrics {
  stage: string;
  durationMs: number;
  jobId: string;
  repositoryFullName: string;
  success: boolean;
  error?: string;
}

/**
 * Wraps an async pipeline stage with high-resolution timing.
 *
 * Emits a structured log entry on completion (success or failure).
 * Re-throws any error so the caller's error handling is unaffected.
 *
 * @example
 * ```ts
 * const result = await measureStage('llm-call', jobId, repo, () => callLLM(prompt));
 * ```
 */
export async function measureStage<T>(
  stage: string,
  jobId: string,
  repositoryFullName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startNs = process.hrtime.bigint();
  let success = true;
  let errorMessage: string | undefined;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    errorMessage = (error as Error).message ?? String(error);
    throw error;
  } finally {
    const endNs = process.hrtime.bigint();
    const durationMs = Number(endNs - startNs) / 1_000_000;

    const metrics: StageMetrics = {
      stage,
      durationMs: Math.round(durationMs * 100) / 100, // 2 decimal places
      jobId,
      repositoryFullName,
      success,
      ...(errorMessage ? { error: errorMessage } : {}),
    };

    logger.info({ metrics }, `⏱️  Stage [${stage}] completed in ${metrics.durationMs}ms`);
  }
}

// ─── Queue Depth Snapshot ─────────────────────────────────────────────────────

export interface QueueSnapshot {
  queueName: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  isPaused: boolean;
  capturedAt: string; // ISO 8601
}

/**
 * Returns a live snapshot of the review queue's job counts.
 * Safe to call frequently — BullMQ queries Redis with O(1) SMEMBERS.
 *
 * @returns QueueSnapshot with current job distribution
 */
export async function getQueueSnapshot(): Promise<QueueSnapshot> {
  const queue = getReviewQueue();

  const [counts, isPaused] = await Promise.all([
    queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    ),
    queue.isPaused(),
  ]);

  return {
    queueName: queue.name,
    counts: {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
    },
    isPaused,
    capturedAt: new Date().toISOString(),
  };
}
