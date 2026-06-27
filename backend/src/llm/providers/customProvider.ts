/**
 * @file src/llm/providers/customProvider.ts
 * @description Integration with self-hosted / custom OpenAI-compatible endpoints (Ollama, vLLM, etc).
 */

import axios from 'axios';
import { logger } from '../../lib/logger';
import { LlmCallOptions } from '../types';

export const callCustom = async (
  systemPrompt: string,
  userPrompt: string,
  options?: LlmCallOptions,
): Promise<{ text: string; promptTokens?: number; completionTokens?: number }> => {
  const endpoint = options?.customEndpoint;
  const modelName = options?.customModel || 'llama3';

  if (!endpoint) {
    throw new Error('Custom LLM endpoint is required for the custom provider.');
  }

  const log = logger.child({ module: 'customProvider', endpoint, model: modelName });
  log.debug('Calling custom LLM endpoint');

  try {
    const payload = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1, // Keep it deterministic for JSON structure
    };

    const response = await axios.post(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000, // Custom models might be slower, allow up to 2 mins
    });

    const responseText = response.data.choices?.[0]?.message?.content || '';
    const usage = response.data.usage || {};

    if (!responseText) {
      throw new Error('Custom LLM returned an empty response.');
    }

    return {
      text: responseText,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
    };
  } catch (error) {
    const err = error as Error;
    log.error({ error: err.message }, 'Custom LLM API request failed');
    throw error;
  }
};
