/**
 * @file src/llm/providers/groqProvider.ts
 * @description Groq Llama 3 provider.
 *
 * Groq: 300+ tokens/sec inference, free tier, great for small/medium diffs.
 * Model: llama-3.3-70b-versatile — best Groq model for code review.
 */

import Groq from 'groq-sdk';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { LlmCallOptions } from '../types';

let _client: Groq | null = null;

function getClient(): Groq {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');
  if (!_client) _client = new Groq({ apiKey: env.GROQ_API_KEY });
  return _client;
}

/**
 * Calls Groq Llama 3 70B with system + user prompts.
 */
export async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  options: LlmCallOptions = {},
): Promise<{ text: string; promptTokens?: number; completionTokens?: number }> {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  logger.debug({ model: 'llama-3.3-70b-versatile', promptChars: userPrompt.length }, 'Calling Groq');

  const completion = await getClient().chat.completions.create({
    model:           'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens:      options.maxTokens ?? env.LLM_MAX_TOKENS,
    temperature:     options.temperature ?? 0.1,
    response_format: { type: 'json_object' }, // Groq JSON mode
  });

  const text  = completion.choices[0]?.message?.content ?? '';
  const usage = completion.usage;

  return {
    text,
    promptTokens:     usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
  };
}
