/**
 * @file tests/unit/llm/codeReviewPrompt.test.ts
 * @description Unit tests for prompt engineering module.
 */

import { buildSystemPrompt, buildUserPrompt, buildRetryPrompt } from '../../../src/llm/prompts/codeReviewPrompt';
import { PRContext } from '../../../src/types/analysis';
import { DiffChunk } from '../../../src/llm/parsers/reviewParser';

const BASE_CONTEXT: PRContext = {
  prNumber: 42, title: 'feat: add JWT auth',
  description: 'Adds JWT-based authentication',
  linkedIssues: [], headBranch: 'feat/auth', baseBranch: 'main',
  language: 'TypeScript', changedFiles: 3, additions: 80, deletions: 10,
  isDraft: false, repositoryFullName: 'owner/repo', authorLogin: 'octocat',
};

const BASE_CHUNK: DiffChunk = {
  chunkIndex: 1, totalChunks: 1,
  content: '### File: src/auth.ts\n```diff\n+const token = jwt.sign({}, secret);\n```',
  charCount: 60,
};

describe('buildSystemPrompt', () => {
  it('should mention the language when provided', () => {
    const prompt = buildSystemPrompt('TypeScript');
    expect(prompt).toContain('TypeScript');
  });

  it('should handle null language gracefully', () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain('multiple languages');
  });

  it('should include key review categories', () => {
    const prompt = buildSystemPrompt('Python');
    expect(prompt).toContain('Bugs');
    expect(prompt).toContain('Security');
    expect(prompt).toContain('Performance');
  });

  it('should instruct to return JSON only', () => {
    const prompt = buildSystemPrompt('Go');
    expect(prompt).toContain('JSON');
  });
});

describe('buildUserPrompt', () => {
  it('should include PR number and title', () => {
    const prompt = buildUserPrompt(BASE_CHUNK, BASE_CONTEXT, 'evt-001');
    expect(prompt).toContain('#42');
    expect(prompt).toContain('feat: add JWT auth');
  });

  it('should include repository name', () => {
    const prompt = buildUserPrompt(BASE_CHUNK, BASE_CONTEXT, 'evt-001');
    expect(prompt).toContain('owner/repo');
  });

  it('should include OWASP section', () => {
    const prompt = buildUserPrompt(BASE_CHUNK, BASE_CONTEXT, 'evt-001');
    expect(prompt).toContain('OWASP');
    expect(prompt).toContain('A03');
  });

  it('should include the diff content', () => {
    const prompt = buildUserPrompt(BASE_CHUNK, BASE_CONTEXT, 'evt-001');
    expect(prompt).toContain('jwt.sign');
  });

  it('should include JSON schema', () => {
    const prompt = buildUserPrompt(BASE_CHUNK, BASE_CONTEXT, 'evt-001');
    expect(prompt).toContain('reviewId');
    expect(prompt).toContain('severity');
    expect(prompt).toContain('confidence');
    expect(prompt).toContain('issues');
  });

  it('should add chunk note when totalChunks > 1', () => {
    const multiChunk: DiffChunk = { ...BASE_CHUNK, chunkIndex: 2, totalChunks: 3 };
    const prompt = buildUserPrompt(multiChunk, BASE_CONTEXT, 'evt-001');
    expect(prompt).toContain('chunk 2/3');
  });

  it('should not add chunk note for single chunk', () => {
    const prompt = buildUserPrompt(BASE_CHUNK, BASE_CONTEXT, 'evt-001');
    expect(prompt).not.toContain('chunk 1/1');
  });

  it('should handle null PR description', () => {
    const ctx = { ...BASE_CONTEXT, description: null };
    expect(() => buildUserPrompt(BASE_CHUNK, ctx, 'evt-001')).not.toThrow();
  });
});

describe('buildRetryPrompt', () => {
  it('should include the original prompt', () => {
    const original = 'original user prompt content';
    const retry = buildRetryPrompt(original, 'JSON parse error');
    expect(retry).toContain(original);
  });

  it('should include the parse error message', () => {
    const retry = buildRetryPrompt('prompt', 'Unexpected token at position 42');
    expect(retry).toContain('Unexpected token at position 42');
  });

  it('should add instruction to start with {', () => {
    const retry = buildRetryPrompt('prompt', 'err');
    expect(retry).toContain('{');
  });
});
