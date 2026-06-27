/**
 * @file src/ai/retryStrategy.ts
 * @description Generic exponential back-off with jitter for LLM API calls.
 *
 * System Design Rationale:
 * ─────────────────────────
 * LLM APIs (Gemini, Groq, OpenAI) are rate-limited and occasionally return
 * transient errors (429 Too Many Requests, 503 Service Unavailable, ECONNRESET).
 * Retrying unconditionally wastes quota. This module:
 *
 *  • Only retries on TRANSIENT errors (network issues, 429, 503, 502)
 *  • Uses exponential back-off with ±25% random jitter to prevent thundering-herd
 *  • Caps delay at maxDelayMs to avoid waiting forever
 *  • Provides a clean `withRetry<T>()` generic so any async call can be wrapped
 *
 * Design inspired by the AWS "Exponential Backoff and Jitter" blog post (2015).
 *
 * @module ai/retryStrategy
 */

import { logger } from '../lib/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of attempts (including the first one). Default: 3 */
  maxAttempts?: number;

  /** Base delay in milliseconds. Default: 500 */
  baseDelayMs?: number;

  /** Maximum delay cap in milliseconds. Default: 8000 */
  maxDelayMs?: number;

  /** Label for log messages (e.g. "gemini-flash", "groq-llama3") */
  label?: string;

  /** Custom predicate — return true to retry on this error. Defaults to isTransient() */
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  label: 'llm-call',
} as const;

// ─── HTTP / network error detection ──────────────────────────────────────────

/** HTTP status codes that are safe to retry */
const RETRYABLE_HTTP_CODES = new Set([429, 500, 502, 503, 504]);

/** Node.js network error codes that are safe to retry */
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EPIPE',
]);

/**
 * Returns true if this error is transient and safe to retry.
 * Handles Axios errors, fetch errors, and plain Error objects.
 */
function isTransient(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as Record<string, unknown>;

  // Axios error shape: err.response.status
  const status = (err['response'] as Record<string, unknown> | undefined)?.['status'] as
    | number
    | undefined;
  if (status !== undefined && RETRYABLE_HTTP_CODES.has(status)) return true;

  // Network error codes
  if (typeof err['code'] === 'string' && RETRYABLE_NETWORK_CODES.has(err['code'])) {
    return true;
  }

  // Timeout indicators in the message
  const message = (err['message'] as string | undefined) ?? '';
  if (/timeout|timed?\s*out/i.test(message)) return true;

  return false;
}

// ─── Core Retry Logic ────────────────────────────────────────────────────────

/**
 * Wraps an async function with exponential back-off retry logic.
 *
 * @template T - Return type of the wrapped function
 * @param fn - The async operation to retry
 * @param options - RetryOptions (all optional, sensible defaults provided)
 * @param eventId - Correlation ID for structured logging
 * @returns The result of `fn` on the first successful attempt
 * @throws The last error if all attempts are exhausted
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => callGeminiAPI(prompt),
 *   { maxAttempts: 3, label: 'gemini-flash' },
 *   eventId
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  eventId = 'unknown',
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, label, shouldRetry } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const retryPredicate = shouldRetry ?? isTransient;
  const log = logger.child({ module: 'retryStrategy', eventId, label });

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      if (attempt > 1) {
        log.info({ attempt }, '✅ Retry succeeded');
      }

      return result;
    } catch (error) {
      lastError = error;

      const retriable = retryPredicate(error);
      const isLastAttempt = attempt >= maxAttempts;

      if (!retriable || isLastAttempt) {
        log.error(
          { attempt, maxAttempts, retriable, error },
          `❌ ${label} failed — ${isLastAttempt ? 'max attempts reached' : 'non-retriable error'}`,
        );
        throw error;
      }

      // Calculate exponential back-off with ±25% jitter
      const exponential = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = exponential * 0.25 * (Math.random() * 2 - 1); // ±25%
      const delayMs = Math.max(0, Math.round(exponential + jitter));

      log.warn(
        { attempt, maxAttempts, delayMs, error: (error as Error).message ?? error },
        `⚠️  Transient error on attempt ${attempt}/${maxAttempts} — retrying in ${delayMs}ms`,
      );

      await sleep(delayMs);
    }
  }

  // Should never reach here, but satisfies TypeScript
  throw lastError;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Promise-based sleep */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Computes the delay for attempt N without randomisation.
 * Exported for use in tests.
 */
export function computeDelay(
  attempt: number,
  baseDelayMs = DEFAULT_OPTIONS.baseDelayMs,
  maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
): number {
  return Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
}
