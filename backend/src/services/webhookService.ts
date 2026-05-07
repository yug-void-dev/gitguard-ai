/**
 * @file src/services/webhookService.ts
 * @description Core service for processing validated pull request events.
 *
 * This is the main business logic layer. In Week 2+ this service will:
 * - Fetch the PR diff via Octokit
 * - Queue the review job in BullMQ
 * - Trigger the AI review pipeline
 *
 * For Week 1, it validates and persists the event for audit/history.
 */

import { logger } from '../lib/logger';
import { PullRequestEvent } from '../types/github';

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
 * Currently: logs and returns event metadata.
 * Week 2+: will enqueue AI review job via BullMQ.
 *
 * @param event - The clean internal PullRequestEvent
 * @returns Processing result with event metadata
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

  // ── Draft PR handling ─────────────────────────────────────────────────
  // Optionally skip draft PRs (configurable per repo in Week 2)
  if (event.pullRequest.isDraft) {
    reqLogger.info(
      { eventId: event.eventId },
      'Pull request is a draft — skipping AI review (configurable)',
    );
  }

  // ── Week 2+ TODO: Enqueue review job ─────────────────────────────────
  // await reviewQueue.add('review-pr', {
  //   eventId: event.eventId,
  //   repositoryFullName: event.repository.fullName,
  //   prNumber: event.pullRequest.number,
  //   diffUrl: event.pullRequest.diffUrl,
  //   headSha: event.pullRequest.headSha,
  // });

  reqLogger.info(
    { eventId: event.eventId },
    '✅  Webhook event processed successfully',
  );

  return {
    eventId: event.eventId,
    action: event.action,
    repositoryFullName: event.repository.fullName,
    pullRequestNumber: event.pullRequest.number,
    message: `Pull request #${event.pullRequest.number} (${event.action}) queued for review`,
  };
}
