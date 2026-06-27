/**
 * @file src/middlewares/rateLimiter.ts
 * @description Rate limiting for the webhook endpoint.
 *
 * Protects against:
 * - Webhook replay attacks flooding the endpoint
 * - Accidental misconfiguration sending thousands of events
 * - Malicious actors probing the endpoint
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { HttpStatus } from '../lib/errors';

/**
 * Rate limiter for the GitHub webhook endpoint.
 *
 * Default: 30 requests per minute per IP.
 * Configurable via WEBHOOK_RATE_LIMIT_MAX and WEBHOOK_RATE_LIMIT_WINDOW_MS env vars.
 */
export const webhookRateLimiter = rateLimit({
  windowMs: env.WEBHOOK_RATE_LIMIT_WINDOW_MS,
  max: env.WEBHOOK_RATE_LIMIT_MAX,
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers (deprecated)

  // Custom key generator — use IP + User-Agent to be slightly smarter
  keyGenerator: (req: Request): string => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown';
    return ip;
  },

  // Custom response when rate limit is exceeded
  handler: (_req: Request, res: Response): void => {
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many webhook requests. Please slow down.',
      error: { code: 'RATE_LIMIT_EXCEEDED' },
    });
  },

  // Skip rate limiting for test environment
  skip: (): boolean => env.NODE_ENV === 'test',
});
