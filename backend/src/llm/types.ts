/**
 * @file src/llm/types.ts
 * @description Shared types for the multi-LLM layer.
 */

export type LlmProvider = 'gemini' | 'groq' | 'anthropic' | 'custom';

export interface LlmCallOptions {
  maxTokens?: number;
  temperature?: number;
  user?: string;
  customEndpoint?: string;
  customModel?: string;
}

export interface LlmCallResult {
  text: string;
  provider: LlmProvider;
  promptTokens?: number;
  completionTokens?: number;
}
