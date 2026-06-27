/**
 * @file src/llm/providers/geminiProvider.ts
 * @description Google Gemini 1.5 Flash provider.
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

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options: LlmCallOptions = {},
): Promise<{ text: string; promptTokens?: number; completionTokens?: number }> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const model = getClient().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? env.LLM_MAX_TOKENS,
      temperature: options.temperature ?? 0.1,
      responseMimeType: 'application/json',
    },
  });

  logger.debug(
    { model: 'gemini-2.5-flash', promptChars: userPrompt.length },
    'Calling Gemini',
  );
  const result = await model.generateContent(userPrompt);
  const response = result.response;
  const usage = response.usageMetadata;

  return {
    text: response.text(),
    promptTokens: usage?.promptTokenCount,
    completionTokens: usage?.candidatesTokenCount,
  };
}
