/**
 * @file src/queue/index.ts
 * @description Barrel export for the queue module.
 */

export { getReviewQueue, enqueueReviewJob, closeReviewQueue, REVIEW_QUEUE_NAME } from './reviewQueue';
export { startWorker, stopWorker } from './reviewWorker';
export { measureStage, getQueueSnapshot } from './queueMetrics';
export type { QueueSnapshot, StageMetrics } from './queueMetrics';
