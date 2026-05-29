/**
 * @file src/services/commentService.ts
 * @description Service for managing and posting GitHub pull request review comments.
 */

import { Octokit } from '@octokit/rest';
import { IReview } from '../models/Review';
import { GitHubComment, IGitHubComment } from '../models/GitHubComment';
import { PRContext } from '../types/analysis';
import { formatFindingsAsMarkdown } from '../utils/diffFormatter';
import { logger } from '../lib/logger';

/**
 * Delete previous bot comments and reviews on the same PR to avoid clutter.
 */
export async function deleteExistingBotComments(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
}): Promise<void> {
  const { octokit, owner, repo, prNumber } = params;
  const fullName = `${owner}/${repo}`;
  const log = logger.child({ module: 'commentService.deleteExistingBotComments', fullName, prNumber });

  try {
    log.info('Deleting previous GitGuard AI comments/reviews');

    // 1. Fetch issue comments (general PR comments)
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });

    for (const comment of comments) {
      const isBot = comment.body?.includes('GitGuard AI Code Review') || comment.body?.includes('✨ About GitGuard AI');
      if (isBot) {
        try {
          await octokit.rest.issues.deleteComment({
            owner,
            repo,
            comment_id: comment.id,
          });
          log.debug({ commentId: comment.id }, 'Deleted previous bot issue comment');
        } catch (err) {
          log.warn({ err, commentId: comment.id }, 'Failed to delete previous issue comment');
        }
      }
    }

    // 2. Fetch and delete inline review comments
    const { data: reviewComments } = await octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    for (const comment of reviewComments) {
      const isBot = comment.body?.includes('GitGuard AI') || comment.body?.includes('Confidence:');
      if (isBot) {
        try {
          await octokit.rest.pulls.deleteReviewComment({
            owner,
            repo,
            comment_id: comment.id,
          });
          log.debug({ commentId: comment.id }, 'Deleted previous bot inline review comment');
        } catch (err) {
          log.warn({ err, commentId: comment.id }, 'Failed to delete previous inline review comment');
        }
      }
    }

    // 3. Mark corresponding comments in DB as archived
    await GitHubComment.updateMany(
      { 'repository.fullName': fullName, prNumber, status: 'posted' },
      { $set: { status: 'archived', deletedAt: new Date() } },
    );

    log.info('Finished deleting previous GitGuard AI comments');
  } catch (error) {
    log.error({ error }, 'Error while deleting existing bot comments');
  }
}

/**
 * Creates and posts a comprehensive pull request review comment on GitHub.
 * Saves the record in GitHubComment collection.
 */
export async function postReviewComment(params: {
  octokit: Octokit;
  reviewDoc: IReview;
  context: PRContext;
  eventTraceId: string;
}): Promise<IGitHubComment | null> {
  const { octokit, reviewDoc, context, eventTraceId } = params;
  const owner = reviewDoc.repository.owner;
  const repo = reviewDoc.repository.name;
  const prNumber = reviewDoc.prNumber;

  const log = logger.child({
    module: 'commentService.postReviewComment',
    fullName: reviewDoc.repository.fullName,
    prNumber,
    eventId: eventTraceId,
  });

  log.info('Preparing comprehensive pull request review');

  // Compute metrics for markdown formatting
  const metrics = {
    codeQualityScore: reviewDoc.metrics?.codeQualityScore ?? 0,
    vulnerabilitiesCount: reviewDoc.metrics?.vulnerabilitiesCount ?? 0,
    performanceIssuesCount: reviewDoc.metrics?.performanceIssuesCount ?? 0,
  };

  // Format the rich markdown comment
  const markdownComment = formatFindingsAsMarkdown(reviewDoc.findings, context, metrics, eventTraceId);
  const fullMarkdown = markdownComment.fullMarkdown;

  // Create local GitHubComment document
  const gitHubComment = new GitHubComment({
    reviewId: reviewDoc._id,
    repository: {
      owner,
      name: repo,
      fullName: reviewDoc.repository.fullName,
    },
    prNumber,
    prTitle: context.title,
    type: 'review',
    bodyMarkdown: fullMarkdown,
    summary: {
      findingsCount: reviewDoc.findings.length,
      criticalCount: reviewDoc.findings.filter((f) => f.severity === 'critical').length,
      highCount: reviewDoc.findings.filter((f) => f.severity === 'high').length,
      mediumCount: reviewDoc.findings.filter((f) => f.severity === 'medium').length,
      lowCount: reviewDoc.findings.filter((f) => f.severity === 'low').length,
    },
    status: 'pending',
  });

  gitHubComment.addAuditEvent('created', { reviewId: reviewDoc._id });
  await gitHubComment.save();

  try {
    log.info('Posting review to GitHub');

    // Delete any existing bot comments before posting new ones
    await deleteExistingBotComments({ octokit, owner, repo, prNumber });

    // Post to GitHub as a PR Review
    const response = await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body: fullMarkdown,
      event: 'COMMENT',
    });

    // Store review ID and mark as posted
    gitHubComment.githubReviewId = response.data.id;
    gitHubComment.markAsPosted(response.data.id);
    await gitHubComment.save();

    log.info({ githubReviewId: response.data.id }, 'PR review successfully posted to GitHub');
    return gitHubComment;
  } catch (error: any) {
    log.error({ error }, 'Failed to post PR review to GitHub');

    gitHubComment.markAsFailed(error.status?.toString() || 'GITHUB_ERROR', error.message || 'Unknown GitHub Error');
    await gitHubComment.save();

    throw error;
  }
}
