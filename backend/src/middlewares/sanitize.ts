/**
 * @file src/middlewares/sanitize.ts
 * @description Input sanitization middleware.              [Teammate B — Security]
 *
 * Defends against:
 * - Oversized headers (header injection / DoS)
 * - Null bytes in headers (bypass attempts)
 * - Unexpected Content-Type on the webhook endpoint
 * - Prompt injection via PR title/body (Week 2 LLM pipeline)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { HttpStatus } from '../lib/errors';

const MAX_HEADER_LENGTH = 8192;

const INSPECTED_HEADERS = [
  'x-github-event',
  'x-github-delivery',
  'x-hub-signature-256',
  'user-agent',
  'content-type',
];

function containsNullByte(value: string): boolean {
  // Use unicode escape \u0000 instead of literal \x00 (no-control-regex safe)
  return /\u0000/.test(value);
}

/**
 * Validates webhook headers for sanity.
 * Rejects oversized or null-byte-containing header values.
 */
export function sanitizeHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  for (const header of INSPECTED_HEADERS) {
    const value = req.headers[header];
    if (!value) continue;
    const str = Array.isArray(value) ? value.join(',') : value;

    if (str.length > MAX_HEADER_LENGTH) {
      logger.warn({ requestId: req.id, header, length: str.length }, 'Oversized header rejected');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Request headers are malformed',
        error: { code: 'MALFORMED_HEADERS' },
      });
      return;
    }

    if (containsNullByte(str)) {
      logger.warn({ requestId: req.id, header }, 'Null byte in header — possible injection attempt');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Request headers are malformed',
        error: { code: 'MALFORMED_HEADERS' },
      });
      return;
    }
  }
  next();
}

/**
 * Enforces application/json Content-Type on the webhook endpoint.
 * GitHub always sends this — anything else is suspicious.
 */
export function requireJsonContentType(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    logger.warn({ requestId: req.id, contentType }, 'Non-JSON content-type on webhook endpoint');
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Content-Type must be application/json',
      error: { code: 'INVALID_CONTENT_TYPE' },
    });
    return;
  }
  next();
}

/**
 * Sanitizes a string for safe use in LLM prompts (Week 2+).
 * Strips control characters and common prompt-injection patterns.
 *
 * Uses unicode escapes instead of literal control chars to satisfy no-control-regex.
 */
export function sanitizeForLlm(input: string | null | undefined): string {
  if (!input) return '';
  return input
    // Strip ASCII control characters (using unicode escapes — no-control-regex safe)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Filter prompt injection patterns
    .replace(/ignore previous instructions?/gi, '[FILTERED]')
    .replace(/system prompt/gi, '[FILTERED]')
    .replace(/you are now/gi, '[FILTERED]')
    .trim()
    .slice(0, 65536);
}
