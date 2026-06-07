/**
 * @file src/services/suggestionService.ts
 * @description Service for posting inline GitHub suggestion comments and executing one-click applies.
 */

import { Octokit } from '@octokit/rest';
import mongoose from 'mongoose';
import { GitHubComment, IGitHubComment, IInlineComment } from '../models/GitHubComment';
import { Review, IFinding } from '../models/Review';
import { formatInlineComment } from '../utils/diffFormatter';
import { logger } from '../lib/logger';

/**
 * Replaces a specific line in a file with the given suggestion code.
 * Supports multiline suggestions.
 */
function replaceLine(originalContent: string, lineNumber: number, suggestion: string): string {
  const lines = originalContent.split(/\r?\n/);
  if (lineNumber < 1 || lineNumber > lines.length) {
    throw new Error(`Line number ${lineNumber} is out of bounds for file (total lines: ${lines.length})`);
  }
  lines[lineNumber - 1] = suggestion;
  return lines.join('\n');
}

/**
 * For each critical and high severity finding that contains a suggestion,
 * posts an inline review comment containing a GitHub suggestion block.
 */
export async function postInlineSuggestions(params: {
  octokit: Octokit;
  commentDoc: IGitHubComment; // Mongoose IGitHubComment document
  findings: IFinding[];
  prNumber: number;
}): Promise<void> {
  const { octokit, commentDoc, findings, prNumber } = params;
  const owner = commentDoc.repository.owner;
  const repo = commentDoc.repository.name;

  const log = logger.child({ module: 'suggestionService.postInlineSuggestions', owner, repo, prNumber });

  try {
    // 1. Get head commit SHA of the pull request
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    const commitSha = pr.head.sha;

    // 2. Filter critical and high findings that have a suggestion
    const targetFindings = findings.filter(
      (f) => (f.severity === 'critical' || f.severity === 'high') && f.suggestion,
    );

    log.info({ count: targetFindings.length }, 'Posting inline suggestions to GitHub');

    const inlineComments: IInlineComment[] = [];

    for (const finding of targetFindings) {
      try {
        const body = formatInlineComment(finding);

        // Post comment to GitHub
        const response = await octokit.rest.pulls.createReviewComment({
          owner,
          repo,
          pull_number: prNumber,
          body,
          commit_id: commitSha,
          path: finding.file,
          line: finding.line,
          side: 'RIGHT',
        });

        inlineComments.push({
          commitSha,
          filename: finding.file,
          line: finding.line,
          severity: finding.severity,
          message: finding.message,
          suggestion: finding.suggestion,
          githubCommentId: response.data.id,
          postedAt: new Date(),
          status: 'posted',
        });

        log.debug({ file: finding.file, line: finding.line, id: response.data.id }, 'Inline suggestion posted');
      } catch (err: unknown) {
        // Log warning and proceed with next comments
        log.warn({ err, file: finding.file, line: finding.line }, 'Failed to post individual inline suggestion');
      }
    }

    if (inlineComments.length > 0) {
      commentDoc.inlineComments = inlineComments;
      await commentDoc.save();
    }
  } catch (error) {
    log.error({ error }, 'Failed to post inline suggestions');
  }
}

/**
 * Applies a specific suggestion by committing the changes back to GitHub.
 * Records the status as applied on the GitHubComment document.
 */
export async function applySuggestion(params: {
  octokit: Octokit;
  commentId: string;
  findingId: string;
  userId: string;
}): Promise<{ success: boolean; commitSha: string }> {
  const { octokit, commentId, findingId, userId } = params;
  const log = logger.child({ module: 'suggestionService.applySuggestion', commentId, findingId });

  // 1. Find the GitHubComment document
  const comment = await GitHubComment.findById(commentId);
  if (!comment) {
    throw new Error('GitHub comment record not found');
  }

  // 2. Find the review document to get the list of findings
  const review = await Review.findById(comment.reviewId);
  if (!review) {
    throw new Error('Review record not found');
  }

  // Find the matching finding in the review
  const targetFinding = review.findings.find(
    (f: IFinding) => f._id?.toString() === findingId || f.id === findingId,
  );

  if (!targetFinding) {
    throw new Error('Finding not found in review data');
  }

  const path = targetFinding.file;
  const line = targetFinding.line;
  const suggestionCode = targetFinding.suggestion;
  const owner = comment.repository.owner;
  const repo = comment.repository.name;

  // 3. Fetch PR to get the head branch — validate it actually exists on GitHub
  let pr: Awaited<ReturnType<typeof octokit.rest.pulls.get>>['data'];
  try {
    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: comment.prNumber,
    });
    pr = data;
  } catch (ghError: any) {
    const status = ghError?.status ?? ghError?.response?.status;
    if (status === 404) {
      throw Object.assign(
        new Error(
          `Pull Request #${comment.prNumber} was not found on GitHub (${owner}/${repo}). ` +
          'This PR was likely created by a manual test script. Apply Fix only works on real, open GitHub pull requests.'
        ),
        { status: 404 }
      );
    }
    throw ghError; // re-throw any other GitHub error
  }

  const branch = pr.head.ref;

  log.info({ path, line, branch }, 'Fetching file content from GitHub to apply suggestion');

  // 4. Fetch current file content from GitHub
  const fileResponse = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ref: branch,
  });

  if (Array.isArray(fileResponse.data) || !('content' in fileResponse.data)) {
    throw new Error('Target path is a directory or has invalid content structure');
  }

  const originalContent = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');

  // 5. Apply the replacement
  const updatedContent = replaceLine(originalContent, line, suggestionCode);

  log.info({ path, line, branch }, 'Committing suggestion to GitHub');

  // 6. Commit the updated content back to GitHub on the PR branch
  const commitResponse = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `gitguard-ai: apply fix for finding at line ${line} in ${path}`,
    content: Buffer.from(updatedContent).toString('base64'),
    sha: fileResponse.data.sha,
    branch,
  });

  // 7. Record in DB using the instance method
  const appliedData = {
    findingId: targetFinding._id?.toString() || targetFinding.id || findingId,
    filename: path,
    line,
    originalSuggestion: suggestionCode,
    appliedCode: suggestionCode,
    appliedAt: new Date(),
    appliedBy: new mongoose.Types.ObjectId(userId),
    autoApplied: false,
    commitHash: commitResponse.data.commit.sha as string,
    status: 'applied' as const,
  };

  comment.applySuggestion(appliedData);
  await comment.save();

  log.info({ commitSha: commitResponse.data.commit.sha }, 'Suggestion applied successfully');

  return {
    success: true,
    commitSha: commitResponse.data.commit.sha as string,
  };
}
