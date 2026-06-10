/**
 * @file src/config/constants.ts
 * @description Global application constants to avoid magic numbers.
 */

export const DIFF_PROCESSING = {
  MAX_CHUNK_CHARS: 12_000,
  MAX_STORED_DIFF_CHARS: 50_000,
};

export const LLM_ROUTING = {
  GROQ_CHAR_THRESHOLD: 50_000,
};

export const QUEUE_CONFIG = {
  AXIOS_TIMEOUT_MS: 15_000,
};
