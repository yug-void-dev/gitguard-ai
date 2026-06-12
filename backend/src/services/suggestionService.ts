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
 * Extracts clean code from a markdown suggestion.
 * If the suggestion contains a code block, returns the contents of the block.
 * Otherwise, returns the original suggestion.
 */
function extractCleanCode(suggestion: string): string {
  const codeBlockRegex = /```(?:suggestion|javascript|typescript|js|ts)?\r?\n([\s\S]*?)\r?\n```/i;
  const match = suggestion.match(codeBlockRegex);
  if (match && match[1]) {
    // Remove leading/trailing newlines but keep indentation
    return match[1].replace(/^[\r\n]+|[\r\n]+$/g, '');
  }
  return suggestion;
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

    // 2. Filter critical and high findings that have a suggestion, line, and file
    const targetFindings = findings.filter(
      (f) => (f.severity === 'critical' || f.severity === 'high') && f.suggestion && f.file && f.line,
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

  // Find the matching finding in the review - first try exact _id match, then file+line
  let targetFinding = review.findings.find(
    (f: IFinding) => f._id?.toString() === findingId || f.id === findingId,
  );

  // Fallback: if exact ID match fails (e.g. review was re-analyzed with new _ids),
  // try to find by file+line from the inlineComments on the comment document
  if (!targetFinding && comment.inlineComments && comment.inlineComments.length > 0) {
    const inlineComment = comment.inlineComments.find(
      (ic) => ic.githubCommentId?.toString() === findingId ||
              comment.appliedSuggestions?.some(s => s.findingId === findingId && ic.filename === s.filename)
    );
    if (inlineComment) {
      targetFinding = review.findings.find(
        (f: IFinding) => f.file === inlineComment.filename && f.line === inlineComment.line
      );
    }
  }

  if (!targetFinding) {
    // Last resort: parse findingId as an index into the review findings array
    const idx = parseInt(findingId, 10);
    if (!isNaN(idx) && idx >= 0 && idx < review.findings.length) {
      targetFinding = review.findings[idx];
      log.info({ idx, findingId }, 'Using index-based fallback to match finding');
    }
  }

  if (!targetFinding) {
    throw new Error(`Finding not found in review data (findingId: ${findingId}). The review may have been re-analyzed.`);
  }

  const path = targetFinding.file;
  const line = targetFinding.line;
  const suggestionCode = targetFinding.suggestion;
  const owner = comment.repository.owner;
  const repo = comment.repository.name;

  // 3. Fetch PR head branch — if PR doesn't exist (e.g. test script review),
  //    search all repo branches to find one that contains the target file
  let branch: string;
  let fileResponse: Awaited<ReturnType<typeof octokit.rest.repos.getContent>>;

  try {
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: comment.prNumber,
    });
    branch = pr.head.ref;
    log.info({ branch, prNumber: comment.prNumber }, 'Using PR head branch for apply fix');

    // 4a. Fetch file from the real PR branch
    fileResponse = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
  } catch (ghError: any) {
    const status = ghError?.status ?? ghError?.response?.status;

    if (status !== 404) {
      throw ghError; // re-throw non-404 errors immediately
    }

    // PR not found (or file not found on PR branch) — search all branches for the file
    log.warn({ prNumber: comment.prNumber, path }, 'PR not found on GitHub — scanning branches for file');

    let foundBranch: string | null = null;
    let foundFileResponse: Awaited<ReturnType<typeof octokit.rest.repos.getContent>> | null = null;

    try {
      const { data: branches } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });

      // Sort: try non-main branches first (more likely to have the feature file), then main/master
      const sorted = [
        ...branches.filter(b => b.name !== 'main' && b.name !== 'master'),
        ...branches.filter(b => b.name === 'main' || b.name === 'master'),
      ];

      for (const b of sorted) {
        try {
          const resp = await octokit.rest.repos.getContent({ owner, repo, path, ref: b.name });
          if (!Array.isArray(resp.data) && 'content' in resp.data) {
            foundBranch = b.name;
            foundFileResponse = resp;
            log.info({ branch: b.name, path }, 'Found target file on branch');
            break;
          }
        } catch {
          // file not on this branch, keep searching
        }
      }
    } catch (listError: any) {
      log.warn({ listError }, 'Could not list branches');
    }

    if (!foundBranch || !foundFileResponse) {
      throw new Error(
        `Could not find "${path}" on any branch of ${owner}/${repo}. ` +
        `Make sure the file is pushed to GitHub before applying the fix.`,
      );
    }

    branch = foundBranch;
    fileResponse = foundFileResponse;

    log.info({ path, line, branch }, 'Applying fix on branch');

    if (Array.isArray(fileResponse.data) || !('content' in fileResponse.data)) {
      throw new Error('Target path is a directory or has invalid content structure');
    }

    const originalContent = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');
    const cleanCode = extractCleanCode(suggestionCode);
    const updatedContent = replaceLine(originalContent, line, cleanCode);

    log.info({ path, line, branch }, 'Committing suggestion to GitHub');

    const commitResponse = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `gitguard-ai: apply fix for finding at line ${line} in ${path}`,
      content: Buffer.from(updatedContent).toString('base64'),
      sha: fileResponse.data.sha,
      branch,
    });

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

    log.info({ commitSha: commitResponse.data.commit.sha, branch }, 'Suggestion applied via branch fallback');

    return {
      success: true,
      commitSha: commitResponse.data.commit.sha as string,
    };
  }

  // 4b. Normal path (real PR exists) — file was already fetched above
  log.info({ path, line, branch }, 'Fetching file content from GitHub to apply suggestion');




  if (Array.isArray(fileResponse.data) || !('content' in fileResponse.data)) {
    throw new Error('Target path is a directory or has invalid content structure');
  }

  const originalContent = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');

  const cleanCode = extractCleanCode(suggestionCode);

  // 5. Apply the replacement
  const updatedContent = replaceLine(originalContent, line, cleanCode);

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
