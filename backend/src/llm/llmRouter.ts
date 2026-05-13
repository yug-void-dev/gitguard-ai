/**
 * @file src/llm/llmRouter.ts
 * @description Multi-LLM router with cost/performance routing and fallback.
 *
 * Routing strategy:
 *   Small/medium diffs (< 50k chars) → Groq (faster, cheaper)
 *   Large/complex diffs (≥ 50k chars) → Gemini (1M context window)
 *   Any failure → fallback to the other provider
 *
 * Full pipeline per chunk:
 *   1. Route to optimal provider based on diff size
 *   2. Build system + user prompts
 *   3. Call provider with withRetry() wrapper
 *   4. Parse and validate JSON response
 *   5. If parse fails → retry with strict reminder prompt
 *   6. Merge all chunk results
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

// ─── Routing Constants ────────────────────────────────────────────────────────

/** Diffs smaller than this go to Groq (faster); larger go to Gemini (bigger context) */
const GROQ_CHAR_THRESHOLD = 50_000;

// ─── Provider Registry ────────────────────────────────────────────────────────

type ProviderFn = (
  system: string,
  user: string,
  opts?: LlmCallOptions,
) => Promise<{ text: string; promptTokens?: number; completionTokens?: number }>;

function getAvailableProviders(preferGroq: boolean): Array<{ name: LlmProvider; fn: ProviderFn }> {
  const all: Array<{ name: LlmProvider; fn: ProviderFn; available: boolean }> = [
    { name: 'groq',    fn: callGroq,    available: Boolean(env.GROQ_API_KEY) },
    { name: 'gemini',  fn: callGemini,  available: Boolean(env.GEMINI_API_KEY) },
  ];

  // Sort: prefer the routed provider first, then fallback
  const sorted = preferGroq
    ? all.sort((a) => (a.name === 'groq' ? -1 : 1))
    : all.sort((a) => (a.name === 'gemini' ? -1 : 1));

  return sorted
    .filter((p) => p.available)
    .map((p) => ({ name: p.name, fn: p.fn }));
}

// ─── Main Router ──────────────────────────────────────────────────────────────

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
 * Routes diff chunks through the optimal LLM provider and returns findings.
 *
 * This is the integration point replacing the STUB in reviewWorker.ts.
 * Call: `const output = await routeToLLM({ chunks, context, eventId });`
 */
export async function routeToLLM(input: RouterInput): Promise<RouterOutput> {
  const { chunks, context, eventId } = input;
  const log = logger.child({ module: 'llmRouter', eventId });
  const startTime = Date.now();

  const systemPrompt = buildSystemPrompt(context.language);
  const reviews: ParsedReview[] = [];
  let usedProvider = env.LLM_PRIMARY;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  log.info({ chunkCount: chunks.length, language: context.language }, 'Starting LLM routing');

  for (const chunk of chunks) {
    const preferGroq = chunk.charCount < GROQ_CHAR_THRESHOLD;
    const providers  = getAvailableProviders(preferGroq);

    if (providers.length === 0) {
      throw new Error('No LLM providers available — set GEMINI_API_KEY or GROQ_API_KEY');
    }

    log.info({
      chunk: chunk.chunkIndex,
      charCount: chunk.charCount,
      preferredProvider: providers[0]?.name,
    }, 'Routing chunk');

    
    const userPrompt = buildUserPrompt(chunk, context, eventId);

    const result = await callWithFallback(
      providers,
      systemPrompt,
      userPrompt,
      eventId,
      log,
    );

    usedProvider = result.provider;
    totalPromptTokens     += result.promptTokens ?? 0;
    totalCompletionTokens += result.completionTokens ?? 0;

    if (result.review) {
      reviews.push(result.review);
      log.info({
        chunk: chunk.chunkIndex,
        provider: result.provider,
        issues: result.review.issues.length,
        severity: result.review.severity,
      }, 'Chunk review complete');
    }
  }

  const findings = mergeChunkFindings(reviews);
  const summary  = buildMergedSummary(reviews, context);
  const latencyMs = Date.now() - startTime;

  log.info({
    totalFindings: findings.length,
    latencyMs,
    provider: usedProvider,
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
  }, 'LLM routing complete');

  return {
    findings,
    reviews,
    summary,
    modelUsed: usedProvider,
    totalPromptTokens,
    totalCompletionTokens,
    latencyMs,
  };
}

// ─── Fallback Logic ───────────────────────────────────────────────────────────

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
  log: Pick<ReturnType<typeof logger.child>, "info"|"warn"|"error"|"debug">,
): Promise<ChunkResult> {
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const result = await withRetry(
        () => provider.fn(systemPrompt, userPrompt),
        { maxAttempts: 2, baseDelayMs: 500, label: provider.name },
        eventId,
      );

      // First parse attempt
      let parseResult = parseReviewResponse(result.text, eventId);

      // Retry parse with strict prompt on failure
      if (!parseResult.success) {
        log.warn({ provider: provider.name, error: parseResult.error }, 'Parse failed — retrying with strict reminder');
        const retryPrompt = buildRetryPrompt(userPrompt, parseResult.error ?? 'unknown error');
        const retryResult = await provider.fn(systemPrompt, retryPrompt);
        parseResult = parseReviewResponse(retryResult.text, eventId);
      }

      return {
        review:           parseResult.success ? parseResult.review ?? null : null,
        provider:         provider.name,
        promptTokens:     result.promptTokens,
        completionTokens: result.completionTokens,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ provider: provider.name, error: msg }, 'Provider failed — trying fallback');
      errors.push(`${provider.name}: ${msg}`);
    }
  }

  throw new Error(`All LLM providers failed:\n${errors.join('\n')}`);
}

// ─── Summary Builder ──────────────────────────────────────────────────────────

function buildMergedSummary(reviews: ParsedReview[], context: PRContext): string {
  if (reviews.length === 0) {
    return `GitGuard AI reviewed PR #${context.prNumber} "${context.title}" and found no issues.`;
  }

  // Use the summary from the highest-severity chunk
  const severityOrder: ParsedReview['severity'][] = ['Critical', 'High', 'Medium', 'Low'];
  const sorted = [...reviews].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  const topReview = sorted[0];
  const totalIssues = reviews.reduce((s, r) => s + r.issues.length, 0);

  if (reviews.length === 1) return topReview?.summary ?? '';

  return [
    topReview?.summary ?? '',
    `(Review covered ${reviews.length} diff chunks with ${totalIssues} total issues found.)`,
  ].join(' ');
}
