/**
 * @file src/services/commentService.ts
 * @description Posts rich GitHub review comments and inline suggestions via Octokit.
 *
 * Three comment types:
 * 1. PR-level summary comment  — overall review card posted to the PR conversation
 * 2. Inline review comments    — per-file, per-line findings on the diff
 * 3. Suggestion blocks         — GitHub-native ```suggestion``` blocks for one-click apply
 *
 * Flow:
 *   postReviewComment()
 *     → createOrUpdateSummaryComment()  (PR conversation body)
 *     → submitInlineReview()            (GitHub review with inline comments)
 */

import { Octokit } from '@octokit/rest';
import { createOctokitClient } from '../github/octokitClient';
import { IFinding } from '../models/Review';
import { PRContext } from '../types/analysis';
import {
  formatFindingsAsMarkdown,
  formatInlineComment,
  getInlineFindingsForFile,
} from '../utils/diffFormatter';
import { logger } from '../lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommentPostResult {
  summaryCommentId: number | null;
  inlineCommentsPosted: number;
  reviewId: number | null;
  skipped: boolean;
  reason?: string;
}

export interface PostReviewOptions {
  /** GitHub PAT or installation token */
  token: string;
  /** Repository owner login */
  owner: string;
  /** Repository name */
  repo: string;
  /** PR number */
  prNumber: number;
  /** SHA of the head commit — required for inline review comments */
  headSha: string;
  /** All analysis findings */
  findings: IFinding[];
  /** PR context for Markdown header */
  context: PRContext;
  /** Quality metrics for summary card */
  metrics: {
    codeQualityScore: number;
    vulnerabilitiesCount: number;
    performanceIssuesCount: number;
  };
  /** Correlation ID for logging */
  eventId: string;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Posts the complete review to GitHub:
 * 1. A rich Markdown summary comment on the PR conversation
 * 2. Inline review comments on critical/high findings (via GitHub review API)
 *
 * @returns CommentPostResult with IDs and counts
 */
export async function postReviewComment(
  options: PostReviewOptions,
): Promise<CommentPostResult> {
  const { token, owner, repo, prNumber, headSha, findings, context, metrics, eventId } = options;
  const log = logger.child({ module: 'commentService', eventId, owner, repo, prNumber });

  log.info({ findingsCount: findings.length }, 'Posting review comments to GitHub');

  const octokit = createOctokitClient(token);

  // Step 1 — build rich Markdown
  const markdownComment = formatFindingsAsMarkdown(findings, context, metrics, eventId);

  // Step 2 — post or update summary comment
  const summaryCommentId = await createOrUpdateSummaryComment(
    octokit, owner, repo, prNumber, markdownComment.fullMarkdown, log,
  );

  // Step 3 — post inline review comments for critical + high findings
  const { inlineCount, reviewId } = await submitInlineReview(
    octokit, owner, repo, prNumber, headSha, findings, log,
  );

  log.info({
    summaryCommentId,
    inlineCommentsPosted: inlineCount,
    reviewId,
  }, '✅ Review comments posted to GitHub');

  return {
    summaryCommentId,
    inlineCommentsPosted: inlineCount,
    reviewId,
    skipped: false,
  };
}

// ─── Summary Comment ──────────────────────────────────────────────────────────

const GITGUARD_COMMENT_MARKER = '<!-- gitguard-ai-review -->';

/**
 * Creates a new PR-level comment, or updates the existing GitGuard comment
 * if one was already posted (identified by the hidden marker).
 */
async function createOrUpdateSummaryComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  markdown: string,
  log: Pick<ReturnType<typeof logger.child>, 'info'|'warn'|'error'|'debug'>,
): Promise<number | null> {
  const body = `${GITGUARD_COMMENT_MARKER}\n\n${markdown}`;

  try {
    // Look for an existing GitGuard comment to update
    const { data: comments } = await octokit.rest.issues.listComments({
      owner, repo, issue_number: prNumber, per_page: 100,
    });

    const existing = comments.find(
      (c) => c.body?.includes(GITGUARD_COMMENT_MARKER),
    );

    if (existing) {
      const { data: updated } = await octokit.rest.issues.updateComment({
        owner, repo, comment_id: existing.id, body,
      });
      log.info({ commentId: updated.id }, 'Updated existing GitGuard summary comment');
      return updated.id;
    }

    // No existing comment — create a new one
    const { data: created } = await octokit.rest.issues.createComment({
      owner, repo, issue_number: prNumber, body,
    });
    log.info({ commentId: created.id }, 'Created new GitGuard summary comment');
    return created.id;

  } catch (err) {
    log.error({ error: err }, 'Failed to post summary comment');
    return null;
  }
}

// ─── Inline Review Comments ───────────────────────────────────────────────────

/**
 * Submits a GitHub pull request review with inline comments on critical/high findings.
 *
 * Uses the GitHub Reviews API which allows:
 * - Grouping multiple inline comments into one review event
 * - ```suggestion``` blocks that users can apply with one click
 * - A review-level verdict (COMMENT / REQUEST_CHANGES / APPROVE)
 */
async function submitInlineReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  findings: IFinding[],
  log: Pick<ReturnType<typeof logger.child>, 'info'|'warn'|'error'|'debug'>,
): Promise<{ inlineCount: number; reviewId: number | null }> {

  // Only post inline comments for critical + high — avoids noise
  const inlineFindings = findings.filter(
    (f) => (f.severity === 'critical' || f.severity === 'high') && f.line > 0,
  );

  if (inlineFindings.length === 0) {
    log.debug('No critical/high findings with line numbers — skipping inline review');
    return { inlineCount: 0, reviewId: null };
  }

  // Build GitHub review comment objects
  const comments = inlineFindings.map((finding) => ({
    path: finding.file,
    line: finding.line,
    side: 'RIGHT' as const,    // RIGHT = new version of the file
    body: formatInlineComment(finding),
  }));

  // Determine review verdict
  const hasCritical = inlineFindings.some((f) => f.severity === 'critical');
  const event = hasCritical ? 'REQUEST_CHANGES' : 'COMMENT';

  const reviewBody = hasCritical
    ? '🚨 **GitGuard AI** found critical issues that should be addressed before merging.'
    : '🔍 **GitGuard AI** found high-severity issues. Please review the inline comments.';

  try {
    const { data: review } = await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: headSha,
      event,
      body: reviewBody,
      comments,
    });

    log.info({ reviewId: review.id, inlineCount: comments.length, event }, 'Inline review submitted');
    return { inlineCount: comments.length, reviewId: review.id };

  } catch (err) {
    // Inline reviews can fail if lines are outside the diff — degrade gracefully
    log.warn({ error: err }, 'Inline review submission failed — posting inline comments individually');

    let posted = 0;
    for (const finding of inlineFindings) {
      try {
        await octokit.rest.pulls.createReviewComment({
          owner, repo, pull_number: prNumber,
          commit_id: headSha,
          path: finding.file,
          line: finding.line,
          side: 'RIGHT',
          body: formatInlineComment(finding),
        });
        posted++;
      } catch (innerErr) {
        log.warn({ file: finding.file, line: finding.line, error: innerErr }, 'Skipped individual inline comment');
      }
    }

    return { inlineCount: posted, reviewId: null };
  }
}

// ─── Exported Helper ──────────────────────────────────────────────────────────

/**
 * Returns all inline-eligible findings for a specific file.
 * Re-exported for use by the comment routes controller.
 */
export { getInlineFindingsForFile };
