/**
 * @file src/github/diffFetcher.ts
 * @description DiffFetcher service — orchestrates diff retrieval.
 *
 * Wraps the Octokit client with retry logic, token management, and
 * structured logging. This is the entry point for the diff pipeline.
 *
 * Used by the BullMQ worker (reviewWorker.ts) to replace the bare
 * axios.get() call with an authenticated, retried Octokit fetch.
 */

import { Octokit } from '@octokit/rest';
import { createOctokitClient, fetchRawDiff, fetchPRFiles, PullRequestFile } from './octokitClient';
import { withRetry } from '../ai/retryStrategy';
import { logger } from '../lib/logger';

export interface FetchedDiff {
  /** Raw unified diff string */
  rawDiff: string;
  /** Per-file metadata */
  files: PullRequestFile[];
  /** Owner login */
  owner: string;
  /** Repo name */
  repo: string;
  /** PR number */
  prNumber: number;
  /** Diff size in bytes */
  diffBytes: number;
}

/**
 * Fetches the complete PR diff using an authenticated Octokit client.
 *
 * Includes retry logic (3 attempts, exponential back-off) for transient errors.
 *
 * @param token     - GitHub PAT or installation token
 * @param owner     - Repository owner
 * @param repo      - Repository name
 * @param prNumber  - Pull request number
 * @param eventId   - Correlation ID for logging
 */
export async function fetchDiff(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  eventId: string,
): Promise<FetchedDiff> {
  const log = logger.child({ module: 'diffFetcher', eventId, owner, repo, prNumber });
  const octokit: Octokit = createOctokitClient(token);

  log.info('Starting PR diff fetch');

  const [rawDiff, files] = await withRetry(
    async () => Promise.all([
      fetchRawDiff(octokit, owner, repo, prNumber),
      fetchPRFiles(octokit, owner, repo, prNumber),
    ]),
    { maxAttempts: 3, baseDelayMs: 500, label: 'octokit-diff-fetch' },
    eventId,
  );

  log.info({ diffBytes: rawDiff.length, fileCount: files.length }, 'Diff fetch complete');

  return {
    rawDiff,
    files,
    owner,
    repo,
    prNumber,
    diffBytes: Buffer.byteLength(rawDiff, 'utf8'),
  };
}
