/**
 * @file src/github/octokitClient.ts
 * @description Authenticated Octokit REST client factory + diff/file fetchers.
 */

import { Octokit } from '@octokit/rest';
import { logger } from '../lib/logger';

export interface PullRequestFile {
  filename: string;
  status:
    | 'added'
    | 'removed'
    | 'modified'
    | 'renamed'
    | 'copied'
    | 'changed'
    | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

/** Creates an authenticated Octokit client. Week 3+: swap for GitHub App token. */
export function createOctokitClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: 'GitGuard-AI/2.0.0',
    log: {
      debug: (msg: string) => logger.debug(msg),
      info: (msg: string) => logger.info(msg),
      warn: (msg: string) => logger.warn(msg),
      error: (msg: string) => logger.error(msg),
    },
  });
}

/**
 * Fetches the raw unified diff for a pull request.
 * Uses mediaType: { format: 'diff' } to receive raw patch bytes directly.
 */
export async function fetchRawDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  logger.info({ owner, repo, prNumber }, 'Fetching PR diff via Octokit');

  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: 'diff' },
  });

  const rawDiff = response.data as unknown as string;

  if (!rawDiff || typeof rawDiff !== 'string') {
    throw new Error(`No diff returned for PR #${prNumber} — repo may be empty`);
  }

  logger.info({ owner, repo, prNumber, diffBytes: rawDiff.length }, 'PR diff fetched');
  return rawDiff;
}

/**
 * Fetches per-file metadata for a PR (up to 100 files).
 * Used to enrich diff chunks with status/additions/deletions.
 */
export async function fetchPRFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PullRequestFile[]> {
  const response = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  return response.data.map((f) => ({
    filename: f.filename,
    status: f.status as PullRequestFile['status'],
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    patch: f.patch,
  }));
}
