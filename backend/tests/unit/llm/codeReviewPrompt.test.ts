/**
 * @file tests/unit/llm/codeReviewPrompt.test.ts
 * @description Unit tests for prompt engineering module.
 */

import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRetryPrompt,
} from '../../../src/llm/prompts/codeReviewPrompt';
import { PRContext } from '../../../src/types/analysis';
import { DiffChunk } from '../../../src/llm/parsers/reviewParser';

const CTX: PRContext = {
  prNumber: 42,
  title: 'feat: add JWT auth',
  description: 'Adds auth',
  linkedIssues: [],
  headBranch: 'feat/auth',
  baseBranch: 'main',
  language: 'TypeScript',
  changedFiles: 3,
  additions: 80,
  deletions: 10,
  isDraft: false,
  repositoryFullName: 'owner/repo',
  authorLogin: 'octocat',
};

const CHUNK: DiffChunk = {
  chunkIndex: 1,
  totalChunks: 1,
  content: '### File: src/auth.ts\n```diff\n+const token = jwt.sign({}, secret);\n```',
  charCount: 60,
};

describe('buildSystemPrompt', () => {
  it('should include language hint', () => {
    expect(buildSystemPrompt('TypeScript')).toContain('TypeScript');
  });
  it('should handle null language', () => {
    expect(buildSystemPrompt(null)).toContain('multiple languages');
  });
  it('should include review categories', () => {
    const p = buildSystemPrompt('Go');
    expect(p).toContain('Bugs');
    expect(p).toContain('Security');
    expect(p).toContain('Performance');
  });
  it('should instruct JSON only output', () => {
    expect(buildSystemPrompt('Go')).toContain('JSON');
  });
});

describe('buildUserPrompt', () => {
  it('should include PR number and title', () => {
    const p = buildUserPrompt(CHUNK, CTX, 'evt-001');
    expect(p).toContain('#42');
    expect(p).toContain('feat: add JWT auth');
  });
  it('should include repo name', () => {
    expect(buildUserPrompt(CHUNK, CTX, 'evt-001')).toContain('owner/repo');
  });
  it('should include OWASP section', () => {
    const p = buildUserPrompt(CHUNK, CTX, 'evt-001');
    expect(p).toContain('OWASP');
    expect(p).toContain('A03');
  });
  it('should include diff content', () => {
    expect(buildUserPrompt(CHUNK, CTX, 'evt-001')).toContain('jwt.sign');
  });
  it('should include JSON schema fields', () => {
    const p = buildUserPrompt(CHUNK, CTX, 'evt-001');
    expect(p).toContain('reviewId');
    expect(p).toContain('severity');
    expect(p).toContain('confidence');
  });
  it('should add chunk note when totalChunks > 1', () => {
    const p = buildUserPrompt(
      { ...CHUNK, chunkIndex: 2, totalChunks: 3 },
      CTX,
      'evt-001',
    );
    expect(p).toContain('chunk 2/3');
  });
  it('should not add chunk note for single chunk', () => {
    expect(buildUserPrompt(CHUNK, CTX, 'evt-001')).not.toContain('chunk 1/1');
  });
  it('should handle null description', () => {
    expect(() =>
      buildUserPrompt(CHUNK, { ...CTX, description: null }, 'evt-001'),
    ).not.toThrow();
  });
});

describe('buildRetryPrompt', () => {
  it('should include original prompt', () => {
    expect(buildRetryPrompt('original', 'err')).toContain('original');
  });
  it('should include parse error', () => {
    expect(buildRetryPrompt('p', 'Unexpected token')).toContain('Unexpected token');
  });
  it('should mention { character', () => {
    expect(buildRetryPrompt('p', 'e')).toContain('{');
  });
});
