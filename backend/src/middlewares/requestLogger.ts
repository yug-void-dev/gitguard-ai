/**
 * @file src/middlewares/requestLogger.ts
 * @description HTTP request/response logging middleware.
 *
 * Logs:
 * - Incoming request: method, URL, IP, user-agent
 * - Outgoing response: status code, duration
 *
 * Excludes health check endpoint from logs to reduce noise.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/** Paths to exclude from request logging */
const SILENT_PATHS = new Set(['/health', '/favicon.ico']);

/**
 * Middleware that logs HTTP requests and responses with timing.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip noisy health-check endpoints
  if (SILENT_PATHS.has(req.path)) {
    next();
    return;
  }

  const startTime = Date.now();
  const reqLogger = logger.child({ requestId: req.id });

  reqLogger.info(
    {
      method: req.method,
      url: req.url,
      ip:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
    },
    '→ Incoming request',
  );

  // Hook into response finish event to log the outcome
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logFn =
      res.statusCode >= 500
        ? reqLogger.error.bind(reqLogger)
        : res.statusCode >= 400
          ? reqLogger.warn.bind(reqLogger)
          : reqLogger.info.bind(reqLogger);

    logFn(
      {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs,
      },
      '← Outgoing response',
    );
  });

  next();
}
