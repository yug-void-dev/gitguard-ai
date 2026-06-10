/**
 * @file src/services/webhookService.ts
 * @description Core service for processing validated pull request events.
 *
 * Week 2 update: wires the BullMQ review queue and contextBuilder.
 * Pipeline on each received PR event:
 *   1. Skip draft PRs (configurable)
 *   2. Build PRContext (contextBuilder)
 *   3. Enqueue ReviewJobPayload → BullMQ review-pr queue
 *   4. The queue worker handles all AI processing asynchronously
 */

import { logger } from '../lib/logger';
import { PullRequestEvent } from '../types/github';
import { buildPRContext } from '../ai/contextBuilder';
import { enqueueReviewJob } from '../queue/reviewQueue';
import { ReviewJobPayload } from '../types/analysis';
import { Review } from '../models/Review';
import { broadcastReviewEvent } from '../websocket';

/** Result returned to the controller after processing */
export interface WebhookProcessingResult {
  eventId: string;
  action: string;
  repositoryFullName: string;
  pullRequestNumber: number;
  message: string;
}

/**
 * Processes a validated PullRequestEvent.
 *
 * Builds a rich PRContext and enqueues an async AI review job.
 * Returns immediately — analysis happens asynchronously in the Worker.
 *
 * @param event - The clean internal PullRequestEvent from the webhook pipeline
 * @returns Processing result with event metadata and queue confirmation
 */
export async function processWebhookEvent(
  event: PullRequestEvent,
): Promise<WebhookProcessingResult> {
  const reqLogger = logger.child({ eventId: event.eventId });

  reqLogger.info(
    {
      action: event.action,
      repository: event.repository.fullName,
      prNumber: event.pullRequest.number,
      prTitle: event.pullRequest.title,
      sender: event.sender.login,
      isDraft: event.pullRequest.isDraft,
      changedFiles: event.pullRequest.changedFiles,
      additions: event.pullRequest.additions,
      deletions: event.pullRequest.deletions,
    },
    'Processing pull request event',
  );

  // ── Draft PR guard ────────────────────────────────────────────────────
  if (event.pullRequest.isDraft) {
    reqLogger.info(
      { eventId: event.eventId },
      'Pull request is a draft — skipping AI review',
    );

    return {
      eventId: event.eventId,
      action: event.action,
      repositoryFullName: event.repository.fullName,
      pullRequestNumber: event.pullRequest.number,
      message: `Draft PR #${event.pullRequest.number} skipped`,
    };
  }

  // ── Build PRContext ────────────────────────────────────────────────────
  const context = buildPRContext(event);

  reqLogger.info(
    { linkedIssues: context.linkedIssues, language: context.language },
    'PR context assembled',
  );

  // ── Save Pending Review to MongoDB ─────────────────────────────────────
  const [owner, repoName] = event.repository.fullName.split('/');
  const pendingReview = await Review.findOneAndUpdate(
    {
      'repository.fullName': event.repository.fullName,
      prNumber: event.pullRequest.number,
    },
    {
      $set: {
        repository: { owner, name: repoName, fullName: event.repository.fullName },
        prTitle: event.pullRequest.title,
        status: 'pending',
        findings: [],
        summary: 'Pull Request received. Queued for AI analysis...',
        metrics: {
          vulnerabilitiesCount: 0,
          performanceIssuesCount: 0,
          codeQualityScore: 0,
        },
        diffData: '',
      },
    },
    { upsert: true, new: true },
  );

  // ── Broadcast review:queued Event via WebSocket ────────────────────────
  broadcastReviewEvent({
    type: 'review:queued',
    payload: pendingReview.toJSON(),
    timestamp: new Date().toISOString(),
  });

  // ── Enqueue review job ────────────────────────────────────────────────
  const payload: ReviewJobPayload = {
    eventId: event.eventId,
    repositoryFullName: event.repository.fullName,
    ownerLogin: event.repository.ownerLogin,
    repoName: event.repository.name,
    prNumber: event.pullRequest.number,
    headSha: event.pullRequest.headSha,
    diffUrl: event.pullRequest.diffUrl,
    rawDiff: event.rawDiff,
    context,
    enqueuedAt: new Date().toISOString(),
  };

  await enqueueReviewJob(payload, event.eventId);

  reqLogger.info(
    { eventId: event.eventId },
    '✅ Webhook event processed — review job enqueued',
  );

  return {
    eventId: event.eventId,
    action: event.action,
    repositoryFullName: event.repository.fullName,
    pullRequestNumber: event.pullRequest.number,
    message: `Pull request #${event.pullRequest.number} (${event.action}) queued for AI review`,
  };
}
