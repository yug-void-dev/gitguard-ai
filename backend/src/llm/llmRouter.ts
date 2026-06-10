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
import { parseReviewResponse, mergeChunkFindings, ParsedReview, DiffChunk } from './parsers/reviewParser';
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

    if (providers.length === 0) throw new Error('No LLM providers available — set GEMINI_API_KEY or GROQ_API_KEY');

    const userPrompt = buildUserPrompt(chunk, context, `${eventId}-chunk-${chunk.chunkIndex}`);
    const result = await callWithFallback(providers, systemPrompt, userPrompt, eventId, log);

    usedProvider = result.provider;
    totalPromptTokens     += result.promptTokens ?? 0;
    totalCompletionTokens += result.completionTokens ?? 0;

    if (result.review) {
      reviews.push(result.review);
      log.info({ chunk: chunk.chunkIndex, provider: result.provider, issues: result.review.issues.length }, 'Chunk reviewed');
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
