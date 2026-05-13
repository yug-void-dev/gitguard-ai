/**
 * @file tests/unit/llm/llmRouter.test.ts
 * @description Unit tests for multi-LLM router — routing, fallback, merge.
 * All LLM providers and env are mocked.
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
    GITHUB_CLIENT_ID: 'mock', GITHUB_CLIENT_SECRET: 'mock',
    GITHUB_CALLBACK_URL: 'http://localhost/cb',
    MONGODB_URI: 'mongodb://localhost/test',
    JWT_SECRET: 'mock-jwt-secret-that-is-at-least-32-chars!!',
    JWT_EXPIRES_IN: '7d',
    PORT: 3002,
    ALLOWED_ORIGINS: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    WEBHOOK_RATE_LIMIT_MAX: 30,
    WEBHOOK_RATE_LIMIT_WINDOW_MS: 60000,
    REDIS_HOST: 'localhost', REDIS_PORT: 6379, REDIS_PASSWORD: '',
    ANTHROPIC_API_KEY: '',
  },
  isProduction: false, isDevelopment: false, isTest: true,
}));

const mockCallGemini = jest.fn();
const mockCallGroq   = jest.fn();

jest.mock('../../../src/llm/providers/geminiProvider', () => ({ callGemini: mockCallGemini }));
jest.mock('../../../src/llm/providers/groqProvider',   () => ({ callGroq:   mockCallGroq   }));

import { routeToLLM, RouterInput } from '../../../src/llm/llmRouter';
import { PRContext } from '../../../src/types/analysis';
import { DiffChunk } from '../../../src/llm/parsers/reviewParser';

const VALID_LLM_RESPONSE = JSON.stringify({
  reviewId: 'test-chunk-1', severity: 'High', confidence: 80,
  issues: [{
    file: 'src/auth.ts', lineStart: 10, lineEnd: 10, type: 'security',
    description: 'Unvalidated JWT secret', suggestion: 'Validate secret length',
    fixCode: null,
  }],
  summary: 'Auth PR with security concern.',
  suggestedTests: ['test JWT_SECRET validation'],
});

const BASE_CONTEXT: PRContext = {
  prNumber: 1, title: 'test', description: null, linkedIssues: [],
  headBranch: 'feat', baseBranch: 'main', language: 'TypeScript',
  changedFiles: 1, additions: 10, deletions: 0, isDraft: false,
  repositoryFullName: 'owner/repo', authorLogin: 'dev',
};

const SMALL_CHUNK: DiffChunk = {
  chunkIndex: 1, totalChunks: 1,
  content: '+const x = 1;', charCount: 100,
};

const LARGE_CHUNK: DiffChunk = {
  chunkIndex: 1, totalChunks: 1,
  content: '+'.repeat(60_000), charCount: 60_000,
};

beforeEach(() => { mockCallGemini.mockClear(); mockCallGroq.mockClear(); });

describe('routeToLLM', () => {
  describe('✅ Successful routing', () => {
    it('should use Groq for small diffs (< 50k chars)', async () => {
      mockCallGroq.mockResolvedValue({ text: VALID_LLM_RESPONSE, promptTokens: 100, completionTokens: 200 });

      const input: RouterInput = { chunks: [SMALL_CHUNK], context: BASE_CONTEXT, eventId: 'evt-1' };
      const result = await routeToLLM(input);

      expect(mockCallGroq).toHaveBeenCalled();
      expect(mockCallGemini).not.toHaveBeenCalled();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.modelUsed).toBe('groq');
    });

    it('should use Gemini for large diffs (≥ 50k chars)', async () => {
      mockCallGemini.mockResolvedValue({ text: VALID_LLM_RESPONSE, promptTokens: 500, completionTokens: 300 });

      const input: RouterInput = { chunks: [LARGE_CHUNK], context: BASE_CONTEXT, eventId: 'evt-2' };
      const result = await routeToLLM(input);

      expect(mockCallGemini).toHaveBeenCalled();
      expect(result.modelUsed).toBe('gemini');
    });

    it('should accumulate token counts across chunks', async () => {
      mockCallGroq.mockResolvedValue({ text: VALID_LLM_RESPONSE, promptTokens: 100, completionTokens: 50 });

      const chunks: DiffChunk[] = [
        { ...SMALL_CHUNK, chunkIndex: 1, totalChunks: 2 },
        { ...SMALL_CHUNK, chunkIndex: 2, totalChunks: 2 },
      ];
      const result = await routeToLLM({ chunks, context: BASE_CONTEXT, eventId: 'evt-3' });

      expect(result.totalPromptTokens).toBe(200);
      expect(result.totalCompletionTokens).toBe(100);
    });
  });

  describe('🔁 Fallback logic', () => {
    it('should fall back to Gemini when Groq fails', async () => {
      mockCallGroq.mockRejectedValue(new Error('Groq rate limit'));
      mockCallGemini.mockResolvedValue({ text: VALID_LLM_RESPONSE, promptTokens: 200, completionTokens: 100 });

      const result = await routeToLLM({ chunks: [SMALL_CHUNK], context: BASE_CONTEXT, eventId: 'evt-4' });

      expect(mockCallGemini).toHaveBeenCalled();
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('should throw when ALL providers fail', async () => {
      mockCallGroq.mockRejectedValue(new Error('Groq down'));
      mockCallGemini.mockRejectedValue(new Error('Gemini down'));

      await expect(
        routeToLLM({ chunks: [SMALL_CHUNK], context: BASE_CONTEXT, eventId: 'evt-5' }),
      ).rejects.toThrow('All LLM providers failed');
    });
  });

  describe('🔄 Parse retry', () => {
    it('should retry with strict prompt when JSON parse fails first', async () => {
      mockCallGroq
        .mockResolvedValueOnce({ text: 'not valid json at all', promptTokens: 100, completionTokens: 10 })
        .mockResolvedValueOnce({ text: VALID_LLM_RESPONSE, promptTokens: 100, completionTokens: 100 });

      const result = await routeToLLM({ chunks: [SMALL_CHUNK], context: BASE_CONTEXT, eventId: 'evt-6' });
      expect(mockCallGroq).toHaveBeenCalledTimes(2);
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe('📊 Metrics', () => {
    it('should return latencyMs', async () => {
      mockCallGroq.mockResolvedValue({ text: VALID_LLM_RESPONSE, promptTokens: 50, completionTokens: 50 });
      const result = await routeToLLM({ chunks: [SMALL_CHUNK], context: BASE_CONTEXT, eventId: 'evt-7' });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should include a summary', async () => {
      mockCallGroq.mockResolvedValue({ text: VALID_LLM_RESPONSE, promptTokens: 50, completionTokens: 50 });
      const result = await routeToLLM({ chunks: [SMALL_CHUNK], context: BASE_CONTEXT, eventId: 'evt-8' });
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });
});
