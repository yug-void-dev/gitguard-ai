/**
 * @file src/github/diffFetcher.ts
 * @description DiffFetcher service — authenticated PR diff retrieval with retry.
 */

import { Octokit } from '@octokit/rest';
import { createOctokitClient, fetchRawDiff, fetchPRFiles, PullRequestFile } from './octokitClient';
import { withRetry } from '../ai/retryStrategy';
import { logger } from '../lib/logger';

export interface FetchedDiff {
  rawDiff: string;
  files: PullRequestFile[];
  owner: string;
  repo: string;
  prNumber: number;
  diffBytes: number;
}

/**
 * Fetches the complete PR diff using an authenticated Octokit client.
 * Retries up to 3 times with exponential back-off on transient errors.
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

  return { rawDiff, files, owner, repo, prNumber, diffBytes: Buffer.byteLength(rawDiff, 'utf8') };
}
