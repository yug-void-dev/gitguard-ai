/**
 * @file src/ai/promptSanitizer.ts
 * @description Sanitises raw diff text before embedding in LLM prompts.
 *
 * System Design Rationale:
 * ─────────────────────────
 * Prompt injection is a real attack vector — a malicious developer could
 * embed instructions inside their diff comments or docstrings attempting
 * to hijack the AI reviewer's output. This module acts as the last line
 * of defence before any text reaches the LLM API.
 *
 * Pipeline:
 *   raw diff  →  strip injection patterns  →  chunk truncation  →  sanitised chunks
 *
 * The module is stateless and side-effect free (pure functions only).
 *
 * @module ai/promptSanitizer
 */

import { logger } from '../lib/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Maximum character count for a single diff chunk sent to the LLM.
 * Prevents token-limit overflows and excessively long prompts.
 * ~12 000 chars ≈ ~3 000 tokens (rule of thumb: 1 token ≈ 4 chars).
 */
export const MAX_CHUNK_CHARS = 12_000;

/**
 * Known prompt injection pattern strings.
 * These are regex-matched case-insensitively against the diff content.
 *
 * Pattern rationale: covers the most common jailbreak approaches seen in
 * LLM red-team research (2023–2025).
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|above|prior|earlier)\s+instructions?/gi,
  /forget\s+(everything|all|your\s+instructions?)/gi,
  /you\s+are\s+now\s+(a|an)\s+\w+/gi, // "you are now a hacker"
  /act\s+as\s+(if\s+you\s+are\s+)?(a|an)\s+\w+/gi, // "act as a..."
  /\bDAN\b.*?(mode|version|persona)/gi, // "DAN mode"
  /system\s*:\s*you\s+are/gi, // fake system prompts
  /\[INST\]|\[\/INST\]/gi, // Llama instruction tokens
  /<\|system\|>|<\|user\|>|<\|assistant\|>/gi, // ChatML tokens
  /###\s*(instruction|system|human|assistant)s?:/gi, // Alpaca/Vicuna tokens
];

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SanitisationResult {
  /** The sanitised text, safe to embed in an LLM prompt */
  sanitised: string;

  /** Whether any injection patterns were detected and removed */
  injectionDetected: boolean;

  /** Number of injection patterns removed */
  patternsRemoved: number;

  /** Whether the input was truncated due to length */
  wasTruncated: boolean;

  /** Final character count */
  finalLength: number;
}

/**
 * Sanitises a raw diff string for safe LLM embedding.
 *
 * 1. Scans for prompt injection patterns → replaces with [REMOVED]
 * 2. Truncates to MAX_CHUNK_CHARS if needed
 * 3. Logs a warning if injection was detected
 *
 * @param rawDiff  - The raw diff text from the diff preprocessor
 * @param eventId  - Used for correlation in log messages
 * @param maxChars - Override MAX_CHUNK_CHARS (useful in tests)
 * @returns SanitisationResult with the clean text and metadata
 */
export function sanitiseDiff(
  rawDiff: string,
  eventId: string,
  maxChars = MAX_CHUNK_CHARS,
): SanitisationResult {
  const log = logger.child({ module: 'promptSanitizer', eventId });

  let text = rawDiff;
  let patternsRemoved = 0;

  // ── Step 1: Strip injection patterns ─────────────────────────────────
  for (const pattern of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    const before = text;
    text = text.replace(pattern, '[REMOVED]');
    if (text !== before) {
      patternsRemoved++;
    }
  }

  const injectionDetected = patternsRemoved > 0;

  if (injectionDetected) {
    log.warn(
      { patternsRemoved },
      '⚠️  Prompt injection pattern(s) detected and removed from diff',
    );
  }

  // ── Step 2: Chunk truncation ──────────────────────────────────────────
  const wasTruncated = text.length > maxChars;

  if (wasTruncated) {
    log.info(
      { originalLength: text.length, maxChars },
      'Diff truncated to fit LLM context window',
    );
    // Truncate at a newline boundary if possible
    const boundary = text.lastIndexOf('\n', maxChars);
    text = text.slice(0, boundary > 0 ? boundary : maxChars);
    text += '\n\n[... diff truncated for context window ...]';
  }

  log.debug(
    { injectionDetected, patternsRemoved, wasTruncated, finalLength: text.length },
    'Diff sanitisation complete',
  );

  return {
    sanitised: text,
    injectionDetected,
    patternsRemoved,
    wasTruncated,
    finalLength: text.length,
  };
}

/**
 * Splits a large diff into multiple sanitised chunks, each within maxChars.
 * Used when a PR is too large for a single LLM call.
 *
 * @param rawDiff  - Full raw diff string
 * @param eventId  - Correlation ID
 * @param maxChars - Max chars per chunk
 * @returns Array of sanitised chunk strings
 */
export function splitAndSanitiseDiff(
  rawDiff: string,
  eventId: string,
  maxChars = MAX_CHUNK_CHARS,
): string[] {
  const log = logger.child({ module: 'promptSanitizer', eventId });

  // Split on file boundaries ("diff --git ...")
  const fileBoundary = /(?=diff --git )/;
  const fileDiffs = rawDiff.split(fileBoundary).filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const fileDiff of fileDiffs) {
    // If adding this file diff would exceed the limit, flush current chunk
    if (current.length + fileDiff.length > maxChars && current.length > 0) {
      const { sanitised } = sanitiseDiff(current, eventId, maxChars);
      chunks.push(sanitised);
      current = '';
    }
    current += fileDiff;
  }

  // Flush the last chunk
  if (current.trim().length > 0) {
    const { sanitised } = sanitiseDiff(current, eventId, maxChars);
    chunks.push(sanitised);
  }

  log.info({ chunkCount: chunks.length }, 'Diff split into chunks');
  return chunks;
}
