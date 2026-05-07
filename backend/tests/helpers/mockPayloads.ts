/**
 * @file tests/helpers/mockPayloads.ts
 * @description Real-world GitHub webhook payload fixtures for testing.
 */

import crypto from 'crypto';

/** Generate a valid HMAC-SHA256 signature for a given body + secret */
export function generateSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}

/** GitHub user fixture */
const mockUser = {
  login: 'octocat',
  id: 1,
  avatar_url: 'https://github.com/images/error/octocat_happy.gif',
  html_url: 'https://github.com/octocat',
  type: 'User',
};

/** GitHub repository fixture */
const mockRepository = {
  id: 1296269,
  name: 'Hello-World',
  full_name: 'octocat/Hello-World',
  private: false,
  html_url: 'https://github.com/octocat/Hello-World',
  description: 'This your first repo!',
  owner: mockUser,
  default_branch: 'main',
  language: 'TypeScript',
  clone_url: 'https://github.com/octocat/Hello-World.git',
};

/** GitHub PR ref fixture */
const mockRef = (ref: string, sha: string) => ({
  label: `octocat:${ref}`,
  ref,
  sha,
  user: mockUser,
  repo: mockRepository,
});

/** Base PR fixture */
const mockPullRequest = {
  url: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347',
  id: 1,
  number: 1347,
  state: 'open',
  locked: false,
  title: 'Amazing new feature',
  body: 'Please pull these awesome changes in!',
  html_url: 'https://github.com/octocat/Hello-World/pull/1347',
  diff_url: 'https://github.com/octocat/Hello-World/pull/1347.diff',
  patch_url: 'https://github.com/octocat/Hello-World/pull/1347.patch',
  created_at: '2011-01-26T19:01:12Z',
  updated_at: '2011-01-26T19:01:12Z',
  closed_at: null,
  merged_at: null,
  draft: false,
  user: mockUser,
  head: mockRef('new-topic', 'abc123'),
  base: mockRef('main', 'def456'),
  additions: 42,
  deletions: 7,
  changed_files: 5,
  commits: 3,
};

/** Full webhook payload for 'opened' action */
export const openedPRPayload = {
  action: 'opened',
  number: 1347,
  pull_request: mockPullRequest,
  repository: mockRepository,
  sender: mockUser,
};

/** Full webhook payload for 'synchronize' action */
export const synchronizePRPayload = {
  ...openedPRPayload,
  action: 'synchronize',
};

/** Full webhook payload for 'reopened' action */
export const reopenedPRPayload = {
  ...openedPRPayload,
  action: 'reopened',
};

/** Full webhook payload for 'closed' action (not supported) */
export const closedPRPayload = {
  ...openedPRPayload,
  action: 'closed',
};

/** Minimal invalid payload (missing required fields) */
export const invalidPayload = {
  action: 'opened',
  // Missing pull_request, repository, sender
};

/** Serialized version of the opened PR payload */
export const openedPRPayloadString = JSON.stringify(openedPRPayload);
