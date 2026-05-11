/**
 * @file src/ai/index.ts
 * @description Barrel export for the AI module.
 *
 * Consumers import from '@/ai' instead of individual files,
 * keeping the module boundary clean and refactor-friendly.
 */

export { buildPRContext, formatContextForPrompt } from './contextBuilder';
export { sanitiseDiff, splitAndSanitiseDiff, MAX_CHUNK_CHARS } from './promptSanitizer';
export type { SanitisationResult } from './promptSanitizer';
export { withRetry, computeDelay } from './retryStrategy';
export type { RetryOptions } from './retryStrategy';
export { scanDiffForVulnerabilities } from './vulnerabilityScanner';
export { enrichFindings } from './suggestionEnricher';
