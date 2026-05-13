/**
 * @file src/services/webhookService.ts
 * @description Webhook processing service — enqueues AI review jobs.
 *
 * Week 1: just logged the event.
 * Week 2: builds PRContext and enqueues an async BullMQ review job.
 * Week 3: will post GitHub review comments after job completion.
 */

import { enqueueReviewJob } from '../queue/reviewQueue';
import { logger } from '../lib/logger';
import { PullRequestEvent } from '../types/github';
import { PRContext } from '../types/analysis';

export interface WebhookProcessingResult {
  eventId: string;
  action: string;
  repositoryFullName: string;
  pullRequestNumber: number;
  message: string;
  jobId?: string;
}

/**
 * Extracts linked issue numbers from a PR body.
 * Matches patterns like "Fixes #42", "Closes #100", "Resolves #7"
 */
function extractLinkedIssues(body: string | null): number[] {
  if (!body) return [];
  const matches = body.matchAll(/(?:fixes|closes|resolves)\s+#(\d+)/gi);
  return [...matches].map((m) => parseInt(m[1], 10));
}

/**
 * Processes a validated PullRequestEvent by enqueuing an async review job.
 */
export async function processWebhookEvent(
  event: PullRequestEvent,
): Promise<WebhookProcessingResult> {
  const log = logger.child({ module: 'webhookService', eventId: event.eventId });

  log.info({
    action:       event.action,
    repository:   event.repository.fullName,
    prNumber:     event.pullRequest.number,
    prTitle:      event.pullRequest.title,
    sender:       event.sender.login,
    isDraft:      event.pullRequest.isDraft,
    changedFiles: event.pullRequest.changedFiles,
    additions:    event.pullRequest.additions,
    deletions:    event.pullRequest.deletions,
  }, 'Processing PR webhook — enqueuing review job');

  // Skip draft PRs (configurable per-repo in Week 3)
  if (event.pullRequest.isDraft) {
    log.info({ eventId: event.eventId }, 'Draft PR — skipping review');
    return {
      eventId:              event.eventId,
      action:               event.action,
      repositoryFullName:   event.repository.fullName,
      pullRequestNumber:    event.pullRequest.number,
      message:              `Draft PR #${event.pullRequest.number} skipped`,
    };
  }

  // Build PRContext for LLM prompt enrichment
  const context: PRContext = {
    prNumber:           event.pullRequest.number,
    title:              event.pullRequest.title,
    description:        event.pullRequest.body,
    linkedIssues:       extractLinkedIssues(event.pullRequest.body),
    headBranch:         event.pullRequest.headRef,
    baseBranch:         event.pullRequest.baseRef,
    language:           event.repository.language,
    changedFiles:       event.pullRequest.changedFiles,
    additions:          event.pullRequest.additions,
    deletions:          event.pullRequest.deletions,
    isDraft:            event.pullRequest.isDraft,
    repositoryFullName: event.repository.fullName,
    authorLogin:        event.sender.login,
  };

  const job = await enqueueReviewJob({
    eventId:            event.eventId,
    repositoryFullName: event.repository.fullName,
    ownerLogin:         event.repository.ownerLogin,
    repoName:           event.repository.name,
    prNumber:           event.pullRequest.number,
    headSha:            event.pullRequest.headSha,
    diffUrl:            event.pullRequest.diffUrl,
    context,
    enqueuedAt:         new Date().toISOString(),
  }, event.eventId);

  log.info(
    { jobId: job.id, repository: event.repository.fullName, prNumber: event.pullRequest.number },
    '✅ Review job enqueued',
  );

  return {
    eventId:            event.eventId,
    action:             event.action,
    repositoryFullName: event.repository.fullName,
    pullRequestNumber:  event.pullRequest.number,
    message:            `PR #${event.pullRequest.number} queued for AI review (job: ${job.id ?? 'pending'})`,
    jobId:              job.id ?? undefined,
  };
}
