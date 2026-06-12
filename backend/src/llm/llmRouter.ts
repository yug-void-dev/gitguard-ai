/**
 * @file src/llm/llmRouter.ts
 * @description Multi-LLM router with cost/performance routing and fallback.
 *
 * Small diffs (< 50k chars) → Groq (faster, cheaper)
 * Large diffs (≥ 50k chars) → Gemini (1M context window)
 * Any failure → automatic fallback to the other provider
 */

import { env } from '../config/env';
import { logger } from '../lib/logger';
import { withRetry } from '../ai/retryStrategy';
import { callGemini } from './providers/geminiProvider';
import { callGroq } from './providers/groqProvider';
import { buildSystemPrompt, buildUserPrompt, buildRetryPrompt } from './prompts/codeReviewPrompt';
import { parseReviewResponse, mergeChunkFindings, ParsedReview, DiffChunk, ParsedIssue } from './parsers/reviewParser';
import { AnalysisFinding } from '../types/analysis';
import { PRContext } from '../types/analysis';
import { LlmProvider, LlmCallOptions } from './types';
import { LLM_ROUTING } from '../config/constants';

const GROQ_CHAR_THRESHOLD = LLM_ROUTING.GROQ_CHAR_THRESHOLD;

type ProviderFn = (s: string, u: string, o?: LlmCallOptions) => Promise<{ text: string; promptTokens?: number; completionTokens?: number }>;

function getProviders(preferGroq: boolean): Array<{ name: LlmProvider; fn: ProviderFn }> {
  const all = [
    { name: 'groq' as LlmProvider,   fn: callGroq,   available: Boolean(env.GROQ_API_KEY) },
    { name: 'gemini' as LlmProvider, fn: callGemini, available: Boolean(env.GEMINI_API_KEY) },
  ];
  return all
    .sort((a) => (preferGroq ? (a.name === 'groq' ? -1 : 1) : (a.name === 'gemini' ? -1 : 1)))
    .filter((p) => p.available)
    .map((p) => ({ name: p.name, fn: p.fn }));
}

export interface RouterInput {
  chunks: DiffChunk[];
  context: PRContext;
  eventId: string;
}

export interface RouterOutput {
  findings: AnalysisFinding[];
  reviews: ParsedReview[];
  summary: string;
  modelUsed: string;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  latencyMs: number;
}

/**
 * Generates a mock review based on the diff content when LLM providers fail in development.
 */
function generateMockReview(chunk: DiffChunk, _context: PRContext): ParsedReview {
  const issues: ParsedIssue[] = [];
  const lines = chunk.content.split('\n');
  let currentFile = 'unknown_file.js';
  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.+)$/);
      if (match && match[1]) {
        currentFile = match[1].trim();
      }
    } else if (line.startsWith('@@')) {
      const match = line.match(/\+(\d+)/);
      if (match && match[1]) {
        currentLine = parseInt(match[1], 10) - 1;
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      currentLine++;
      const content = line.slice(1).trim();

      // Check for security issues or typical patterns we want to mock
      if (content.includes('User.find') && !content.includes('limit') && !content.includes('try')) {
        issues.push({
          file: currentFile,
          lineStart: currentLine,
          lineEnd: currentLine,
          type: 'performance',
          description: '🐢 PERFORMANCE ISSUE: Unchecked/unlimited MongoDB query. Retrieving all documents without limits can overload the database and exhaust memory.',
          suggestion: 'Implement pagination and/or set query limits using `.limit()` to restrict the volume of returned documents.',
          fixCode: `const allUsers = await User.find({}).skip(skip).limit(limit);`,
        });
      } else if (content.includes('findOne') && (content.includes('req.body') || content.includes('username') || content.includes('email'))) {
        issues.push({
          file: currentFile,
          lineStart: currentLine,
          lineEnd: currentLine,
          type: 'security',
          description: '🚨 SECURITY ISSUE: Potential NoSQL Injection vulnerability. Query object passed directly from request body to Mongoose without validation or explicit casting.',
          suggestion: 'Ensure that the user-supplied values are validated or sanitized (e.g., cast to String) to prevent injection of operators.',
          fixCode: `const user = await User.findOne({ username: String(username) });`,
        });
      } else if (content.includes('error.message') || content.includes('error.stack')) {
        issues.push({
          file: currentFile,
          lineStart: currentLine,
          lineEnd: currentLine,
          type: 'security',
          description: '🚨 SECURITY ISSUE: Sensitive Information Leakage. Exposing raw database error messages or stacks in HTTP response discloses backend system details.',
          suggestion: 'Log the error on the server side and return a clean generic error message to the client.',
          fixCode: `res.status(500).json({ success: false, message: 'Internal server error occurred' });`,
        });
      } else if (content.includes('db.query') && (content.includes('+ id') || content.includes('+ username'))) {
        issues.push({
          file: currentFile,
          lineStart: currentLine,
          lineEnd: currentLine,
          type: 'security',
          description: '🚨 SECURITY ISSUE: SQL Injection vulnerability. Concatenating user-supplied input directly into SQL queries.',
          suggestion: 'Use parameterized queries / prepared statements instead of string concatenation.',
          fixCode: `return db.query('SELECT * FROM users WHERE id = $1', [id]);`,
        });
      }
    } else if (!line.startsWith('-')) {
      currentLine++;
    }
  }

  // Fallback: if we found no specific vulnerability signature in the diff, generate a simple mock bug finding on the first added line
  if (issues.length === 0) {
    let fallbackLine = 1;
    let foundAddedLine = false;
    let fallbackFile = currentFile;

    currentLine = 0;
    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.+)$/);
        if (match && match[1]) fallbackFile = match[1].trim();
      } else if (line.startsWith('@@')) {
        const match = line.match(/\+(\d+)/);
        if (match && match[1]) currentLine = parseInt(match[1], 10) - 1;
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        currentLine++;
        fallbackLine = currentLine;
        foundAddedLine = true;
        break;
      } else if (!line.startsWith('-')) {
        currentLine++;
      }
    }

    if (foundAddedLine) {
      issues.push({
        file: fallbackFile,
        lineStart: fallbackLine,
        lineEnd: fallbackLine,
        type: 'bug',
        description: '🔍 Code Style and Robustness: Potential missing try-catch block or verification of external resources.',
        suggestion: 'Wrap database or external service calls in try-catch statements to prevent unhandled rejections.',
        fixCode: null,
      });
    }
  }

  return {
    reviewId: `mock-${Date.now()}`,
    severity: 'High',
    confidence: 90,
    issues,
    summary: 'GitGuard AI completed a mock review fallback (LLM rate limits reached or mock mode active).',
    suggestedTests: [],
  };
}

/**
 * Routes chunked pull request diffs to the appropriate LLM provider.
 * 
 * Implements a smart routing strategy based on diff payload size:
 * - Extremely large diffs bypass Groq due to rate limits and context windows.
 * - Standard diffs prefer Groq for speed but fallback to Gemini natively.
 * 
 * @param input - The structured router input containing chunks, PR context, and telemetry ID.
 * @returns A unified summary containing consolidated findings, token metrics, and performance latency.
 * @throws If all available fallback providers fail to process the diff successfully.
 */
export async function routeToLLM(input: RouterInput): Promise<RouterOutput> {
  const { chunks, context, eventId } = input;
  const log = logger.child({ module: 'llmRouter', eventId });
  const startTime = Date.now();
  const systemPrompt = buildSystemPrompt(context.language);
  const reviews: ParsedReview[] = [];
  let usedProvider: LlmProvider = env.LLM_PRIMARY;
  let totalPromptTokens = 0, totalCompletionTokens = 0;

  log.info({ chunkCount: chunks.length }, 'Starting LLM routing');

  for (const chunk of chunks) {
    const preferGroq = chunk.charCount < GROQ_CHAR_THRESHOLD;
    const providers = getProviders(preferGroq);

    const userPrompt = buildUserPrompt(chunk, context, `${eventId}-chunk-${chunk.chunkIndex}`);
    
    try {
      if (providers.length === 0) throw new Error('No LLM providers available — set GEMINI_API_KEY or GROQ_API_KEY');

      const result = await callWithFallback(providers, systemPrompt, userPrompt, eventId, log);

      usedProvider = result.provider;
      totalPromptTokens     += result.promptTokens ?? 0;
      totalCompletionTokens += result.completionTokens ?? 0;

      if (result.review) {
        reviews.push(result.review);
        log.info({ chunk: chunk.chunkIndex, provider: result.provider, issues: result.review.issues.length }, 'Chunk reviewed');
      }
    } catch (err: any) {
      if (env.NODE_ENV !== 'production' || process.env.LLM_MOCK === 'true') {
        log.warn({ error: err.message }, 'LLM Routing failed in development mode. Falling back to Mock Review.');
        const mockReview = generateMockReview(chunk, context);
        reviews.push(mockReview);
        usedProvider = 'mock' as any;
      } else {
        throw err;
      }
    }
  }

  const findings = mergeChunkFindings(reviews);
  const summary = buildSummary(reviews, context);

  log.info({ totalFindings: findings.length, latencyMs: Date.now() - startTime, provider: usedProvider }, 'LLM routing complete');

  return { findings, reviews, summary, modelUsed: usedProvider, totalPromptTokens, totalCompletionTokens, latencyMs: Date.now() - startTime };
}

interface ChunkResult {
  review: ParsedReview | null;
  provider: LlmProvider;
  promptTokens?: number;
  completionTokens?: number;
}

async function callWithFallback(
  providers: Array<{ name: LlmProvider; fn: ProviderFn }>,
  systemPrompt: string,
  userPrompt: string,
  eventId: string,
  log: Pick<ReturnType<typeof logger.child>, 'info'|'warn'|'error'|'debug'>,
): Promise<ChunkResult> {
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const result = await withRetry(
        () => provider.fn(systemPrompt, userPrompt),
        { maxAttempts: 2, baseDelayMs: 500, label: provider.name },
        eventId,
      );

      let parseResult = parseReviewResponse(result.text, eventId);

      if (!parseResult.success) {
        log.warn({ provider: provider.name, error: parseResult.error }, 'Parse failed — retrying');
        const retryResult = await provider.fn(systemPrompt, buildRetryPrompt(userPrompt, parseResult.error ?? 'unknown'));
        parseResult = parseReviewResponse(retryResult.text, eventId);
      }

      return {
        review: parseResult.success ? parseResult.review ?? null : null,
        provider: provider.name,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ provider: provider.name, error: msg }, 'Provider failed — fallback');
      errors.push(`${provider.name}: ${msg}`);
    }
  }

  throw new Error(`All LLM providers failed:\n${errors.join('\n')}`);
}

function buildSummary(reviews: ParsedReview[], context: PRContext): string {
  if (reviews.length === 0) return `GitGuard AI reviewed PR #${context.prNumber} and found no issues.`;
  const order: ParsedReview['severity'][] = ['Critical', 'High', 'Medium', 'Low'];
  const top = [...reviews].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))[0];
  if (reviews.length === 1) return top?.summary ?? '';
  const total = reviews.reduce((s, r) => s + r.issues.length, 0);
  return `${top?.summary ?? ''} (${reviews.length} chunks, ${total} total issues.)`;
}
