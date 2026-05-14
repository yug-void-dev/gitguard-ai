/**
 * @file tests/unit/github/octokitClient.test.ts
 * @description Unit tests for Octokit client factory and diff fetcher.
 * All Octokit API calls are mocked — no real GitHub calls made.
 */

const mockGetPulls = jest.fn();
const mockListFiles = jest.fn();

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      pulls: {
        get:       mockGetPulls,
        listFiles: mockListFiles,
      },
    },
  })),
}));

import { createOctokitClient, fetchRawDiff, fetchPRFiles } from '../../../src/github/octokitClient';

const SAMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
index abc..def 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,5 @@
 import express from 'express';
+import helmet from 'helmet';
+app.use(helmet());
 export default app;`;

describe('createOctokitClient', () => {
  it('should return an Octokit instance with rest.pulls', () => {
    const client = createOctokitClient('ghp_test_token');
    expect(client).toBeDefined();
    expect(client.rest.pulls).toBeDefined();
  });
});

describe('fetchRawDiff', () => {
  beforeEach(() => { mockGetPulls.mockClear(); });

  it('should return the raw diff string', async () => {
    mockGetPulls.mockResolvedValue({ data: SAMPLE_DIFF });
    const client = createOctokitClient('token');
    const diff = await fetchRawDiff(client, 'owner', 'repo', 42);
    expect(diff).toBe(SAMPLE_DIFF);
  });

  it('should call pulls.get with diff mediaType', async () => {
    mockGetPulls.mockResolvedValue({ data: SAMPLE_DIFF });
    const client = createOctokitClient('token');
    await fetchRawDiff(client, 'owner', 'repo', 42);
    expect(mockGetPulls).toHaveBeenCalledWith({
      owner: 'owner', repo: 'repo', pull_number: 42,
      mediaType: { format: 'diff' },
    });
  });

  it('should throw when response data is null', async () => {
    mockGetPulls.mockResolvedValue({ data: null });
    const client = createOctokitClient('token');
    await expect(fetchRawDiff(client, 'owner', 'repo', 1)).rejects.toThrow('No diff returned');
  });

  it('should throw when response data is an object (wrong media type)', async () => {
    mockGetPulls.mockResolvedValue({ data: { id: 1, number: 1 } });
    const client = createOctokitClient('token');
    await expect(fetchRawDiff(client, 'owner', 'repo', 1)).rejects.toThrow('No diff returned');
  });
});

describe('fetchPRFiles', () => {
  beforeEach(() => { mockListFiles.mockClear(); });

  it('should return mapped file list', async () => {
    mockListFiles.mockResolvedValue({
      data: [
        { filename: 'src/auth.ts', status: 'modified', additions: 20, deletions: 5, changes: 25, patch: '+jwt.sign()' },
        { filename: 'src/user.ts', status: 'added',    additions: 50, deletions: 0, changes: 50 },
      ],
    });
    const client = createOctokitClient('token');
    const files = await fetchPRFiles(client, 'owner', 'repo', 42);

    expect(files).toHaveLength(2);
    expect(files[0]?.filename).toBe('src/auth.ts');
    expect(files[0]?.status).toBe('modified');
    expect(files[0]?.additions).toBe(20);
    expect(files[0]?.patch).toBe('+jwt.sign()');
    expect(files[1]?.patch).toBeUndefined();
  });

  it('should call listFiles with correct params', async () => {
    mockListFiles.mockResolvedValue({ data: [] });
    const client = createOctokitClient('token');
    await fetchPRFiles(client, 'owner', 'repo', 7);
    expect(mockListFiles).toHaveBeenCalledWith({ owner: 'owner', repo: 'repo', pull_number: 7, per_page: 100 });
  });
});
