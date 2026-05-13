/**
 * @file src/github/octokitClient.ts
 * @description Authenticated Octokit REST client factory.
 *
 * Creates authenticated Octokit instances for fetching PR diffs and file
 * metadata directly from the GitHub API. In Week 3, this will be replaced
 * with GitHub App installation tokens per-repository.
 */

import { Octokit } from '@octokit/rest';
import { logger } from '../lib/logger';

export interface PullRequestFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

/**
 * Creates an authenticated Octokit client.
 * @param token - GitHub PAT or installation token (Week 3+)
 */
export function createOctokitClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: 'GitGuard-AI/2.0.0',
    log: {
      debug: (msg: string) => logger.debug(msg),
      info:  (msg: string) => logger.info(msg),
      warn:  (msg: string) => logger.warn(msg),
      error: (msg: string) => logger.error(msg),
    },
  });
}

/**
 * Fetches the raw unified diff for a pull request via GitHub API.
 *
 * Uses `mediaType: { format: 'diff' }` which returns the raw patch bytes
 * directly — this is the format HMAC-signed by GitHub, so it's the
 * canonical representation of the diff.
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

  // With mediaType.format='diff', response.data is the raw diff string
  const rawDiff = response.data as unknown as string;

  if (!rawDiff || typeof rawDiff !== 'string') {
    throw new Error(`No diff returned for PR #${prNumber} — repo may be empty or PR has no changes`);
  }

  logger.info({ owner, repo, prNumber, diffBytes: rawDiff.length }, 'PR diff fetched successfully');
  return rawDiff;
}

/**
 * Fetches file-level metadata for a pull request (up to 100 files).
 * Used to enrich diff chunks with status/additions/deletions per file.
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
    filename:  f.filename,
    status:    f.status as PullRequestFile['status'],
    additions: f.additions,
    deletions: f.deletions,
    changes:   f.changes,
    patch:     f.patch,
  }));
}
