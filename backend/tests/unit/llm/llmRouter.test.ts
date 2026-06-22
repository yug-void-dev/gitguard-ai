/**
 * @file tests/unit/llm/llmRouter.test.ts
 * @description Unit tests for multi-LLM router — routing, fallback, retry.
 */

jest.mock('../../../src/config/env', () => ({
  env: {
    GEMINI_API_KEY: 'mock-gemini-key',
    GROQ_API_KEY: 'mock-groq-key',
    LLM_PRIMARY: 'gemini',
    LLM_MAX_TOKENS: 8192,
    DIFF_MAX_CHUNK_BYTES: 102400,
    NODE_ENV: 'test',
    GITHUB_WEBHOOK_SECRET: 'test-webhook-secret-at-least-16-chars',
    GITHUB_CLIENT_ID: 'mock',
    GITHUB_CLIENT_SECRET: 'mock',
    GITHUB_CALLBACK_URL: 'http://localhost/cb',
    MONGODB_URI: 'mongodb://localhost/test',
    JWT_SECRET: 'mock-jwt-secret-that-is-at-least-32-chars!!',
    JWT_EXPIRES_IN: '7d',
    PORT: 3002,
    ALLOWED_ORIGINS: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    WEBHOOK_RATE_LIMIT_MAX: 30,
    WEBHOOK_RATE_LIMIT_WINDOW_MS: 60000,
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: '',
    ANTHROPIC_API_KEY: '',
  },
  isProduction: false,
  isDevelopment: false,
  isTest: true,
}));

const mockCallGemini = jest.fn();
const mockCallGroq = jest.fn();
jest.mock('../../../src/llm/providers/geminiProvider', () => ({
  callGemini: mockCallGemini,
}));
jest.mock('../../../src/llm/providers/groqProvider', () => ({ callGroq: mockCallGroq }));

import { routeToLLM, RouterInput } from '../../../src/llm/llmRouter';
import { PRContext } from '../../../src/types/analysis';
import { DiffChunk } from '../../../src/llm/parsers/reviewParser';

const VALID_LLM = JSON.stringify({
  reviewId: 'test-1',
  severity: 'High',
  confidence: 80,
  issues: [
    {
      file: 'src/auth.ts',
      lineStart: 10,
      lineEnd: 10,
      type: 'security',
      description: 'Unvalidated secret',
      suggestion: 'Validate length',
      fixCode: null,
    },
  ],
  summary: 'Security concern in auth.',
  suggestedTests: ['test JWT validation'],
});

const CTX: PRContext = {
  prNumber: 1,
  title: 'test',
  description: null,
  linkedIssues: [],
  headBranch: 'feat',
  baseBranch: 'main',
  language: 'TypeScript',
  changedFiles: 1,
  additions: 10,
  deletions: 0,
  isDraft: false,
  repositoryFullName: 'owner/repo',
  authorLogin: 'dev',
};

const SMALL: DiffChunk = {
  chunkIndex: 1,
  totalChunks: 1,
  content: '+const x = 1;',
  charCount: 100,
};
const LARGE: DiffChunk = {
  chunkIndex: 1,
  totalChunks: 1,
  content: '+'.repeat(60_000),
  charCount: 60_000,
};

beforeEach(() => {
  mockCallGemini.mockClear();
  mockCallGroq.mockClear();
});

describe('routeToLLM', () => {
  it('should prefer Groq for small diffs', async () => {
    mockCallGroq.mockResolvedValue({
      text: VALID_LLM,
      promptTokens: 100,
      completionTokens: 50,
    });
    const r = await routeToLLM({
      chunks: [SMALL],
      context: CTX,
      eventId: 'e1',
    } as RouterInput);
    expect(mockCallGroq).toHaveBeenCalled();
    expect(mockCallGemini).not.toHaveBeenCalled();
    expect(r.findings.length).toBeGreaterThan(0);
    expect(r.modelUsed).toBe('groq');
  });

  it('should prefer Gemini for large diffs', async () => {
    mockCallGemini.mockResolvedValue({
      text: VALID_LLM,
      promptTokens: 500,
      completionTokens: 200,
    });
    const r = await routeToLLM({
      chunks: [LARGE],
      context: CTX,
      eventId: 'e2',
    } as RouterInput);
    expect(mockCallGemini).toHaveBeenCalled();
    expect(r.modelUsed).toBe('gemini');
  });

  it('should accumulate tokens across chunks', async () => {
    mockCallGroq.mockResolvedValue({
      text: VALID_LLM,
      promptTokens: 100,
      completionTokens: 50,
    });
    const chunks = [
      { ...SMALL, chunkIndex: 1, totalChunks: 2 },
      { ...SMALL, chunkIndex: 2, totalChunks: 2 },
    ];
    const r = await routeToLLM({ chunks, context: CTX, eventId: 'e3' } as RouterInput);
    expect(r.totalPromptTokens).toBe(200);
  });

  it('should fallback to Gemini when Groq fails', async () => {
    mockCallGroq.mockRejectedValue(new Error('Groq rate limit'));
    mockCallGemini.mockResolvedValue({
      text: VALID_LLM,
      promptTokens: 200,
      completionTokens: 100,
    });
    const r = await routeToLLM({
      chunks: [SMALL],
      context: CTX,
      eventId: 'e4',
    } as RouterInput);
    expect(mockCallGemini).toHaveBeenCalled();
    expect(r.findings.length).toBeGreaterThan(0);
  });

  it('should throw when all providers fail', async () => {
    mockCallGroq.mockRejectedValue(new Error('Groq down'));
    mockCallGemini.mockRejectedValue(new Error('Gemini down'));
    await expect(
      routeToLLM({ chunks: [SMALL], context: CTX, eventId: 'e5' } as RouterInput),
    ).rejects.toThrow('All LLM providers failed');
  });

  it('should retry with strict prompt on parse failure', async () => {
    mockCallGroq
      .mockResolvedValueOnce({
        text: 'not valid json',
        promptTokens: 100,
        completionTokens: 10,
      })
      .mockResolvedValueOnce({
        text: VALID_LLM,
        promptTokens: 100,
        completionTokens: 100,
      });
    const r = await routeToLLM({
      chunks: [SMALL],
      context: CTX,
      eventId: 'e6',
    } as RouterInput);
    expect(mockCallGroq).toHaveBeenCalledTimes(2);
    expect(r.findings.length).toBeGreaterThan(0);
  });

  it('should return latencyMs and summary', async () => {
    mockCallGroq.mockResolvedValue({
      text: VALID_LLM,
      promptTokens: 50,
      completionTokens: 50,
    });
    const r = await routeToLLM({
      chunks: [SMALL],
      context: CTX,
      eventId: 'e7',
    } as RouterInput);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof r.summary).toBe('string');
    expect(r.summary.length).toBeGreaterThan(0);
  });
});
