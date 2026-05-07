/**
 * @file src/lib/logger.ts
 * @description Structured logger using Pino.
 *
 * Features:
 * - JSON output in production (machine-parseable, no colour codes)
 * - Pretty-printed output in development/test
 * - Automatic requestId correlation when available
 * - Sensitive field redaction (secrets, tokens, passwords)
 */

import pino from 'pino';
import { env, isProduction } from '../config/env';

/** Fields that should NEVER appear in log output */
const REDACTED_FIELDS = [
  'password',
  'secret',
  'token',
  'authorization',
  'x-hub-signature',
  'x-hub-signature-256',
  'apiKey',
  'api_key',
  'webhookSecret',
];

export const logger = pino({
  level: env.LOG_LEVEL,

  // Redact sensitive fields from all log objects
  redact: {
    paths: REDACTED_FIELDS,
    censor: '[REDACTED]',
  },

  // ISO timestamp (easier to read/parse than epoch ms)
  timestamp: pino.stdTimeFunctions.isoTime,

  // In development/test use pretty printing; in production use JSON
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
});

/**
 * Creates a child logger bound to a specific request ID.
 * Use this inside request handlers to correlate all log lines
 * from the same request.
 *
 * @example
 * const reqLogger = createRequestLogger(req.id);
 * reqLogger.info('Processing webhook event');
 */
export function createRequestLogger(requestId: string): pino.Logger {
  return logger.child({ requestId });
}
