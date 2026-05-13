/**
 * @file src/llm/providers/geminiProvider.ts
 * @description Google Gemini 1.5 Flash provider.
 *
 * Gemini 1.5 Flash: 1M token context, fast, cost-efficient.
 * Best for large diffs and complex analysis.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { LlmCallOptions } from '../types';

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  if (!_client) _client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return _client;
}

/**
 * Calls Gemini 1.5 Flash with system + user prompts.
 * Returns raw text + token counts for cost tracking.
 */
export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options: LlmCallOptions = {},
): Promise<{ text: string; promptTokens?: number; completionTokens?: number }> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const model = getClient().getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? env.LLM_MAX_TOKENS,
      temperature:     options.temperature ?? 0.1,   // Low = deterministic JSON
      responseMimeType: 'application/json',           // Ask Gemini for JSON directly
    },
  });

  logger.debug({ model: 'gemini-1.5-flash', promptChars: userPrompt.length }, 'Calling Gemini');

  const result   = await model.generateContent(userPrompt);
  const response = result.response;
  const usage    = response.usageMetadata;

  return {
    text:             response.text(),
    promptTokens:     usage?.promptTokenCount,
    completionTokens: usage?.candidatesTokenCount,
  };
}
