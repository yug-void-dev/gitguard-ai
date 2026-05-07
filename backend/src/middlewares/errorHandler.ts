/**
 * @file src/middlewares/errorHandler.ts
 * @description Centralized Express error handling middleware.
 *
 * Catches all errors thrown in route handlers and:
 * 1. Logs the full error (with stack trace for non-operational errors)
 * 2. Returns a safe, structured JSON response to the client
 * 3. Ensures secrets/internals never leak in responses
 *
 * Must be registered AFTER all routes as Express detects it by its
 * 4-parameter signature.
 */

import { Request, Response, NextFunction } from 'express';
import { isAppError, isError, HttpStatus } from '../lib/errors';
import { logger } from '../lib/logger';
import { isProduction } from '../config/env';

/**
 * Global Express error handler.
 * The `_next` parameter is required by Express even if unused.
 */
export function globalErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const reqLogger = logger.child({ requestId: req.id });

  // ── SyntaxError from express.json() — malformed JSON body ────────────
  // Express throws a SyntaxError with status 400 when JSON parsing fails.
  // We detect it here and return a proper 400 response.
  if (
    isError(error) &&
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: number }).status === 400
  ) {
    reqLogger.warn({ message: error.message }, 'Malformed JSON body');
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: { code: 'INVALID_JSON' },
    });
    return;
  }

  // ── Operational errors (AppError subclasses) ──────────────────────────
  if (isAppError(error)) {
    reqLogger.warn(
      { code: error.code, statusCode: error.statusCode },
      error.message,
    );

    res.status(error.statusCode).json({
      success: false,
      message:
        isProduction && error.statusCode >= 500
          ? 'An internal error occurred'
          : error.message,
      error: { code: error.code },
    });
    return;
  }

  // ── Unexpected errors (programmer errors) ─────────────────────────────
  if (isError(error)) {
    reqLogger.error(
      { error: { message: error.message, stack: error.stack } },
      'Unhandled application error',
    );
  } else {
    reqLogger.error({ error }, 'Unknown error thrown');
  }

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: isProduction
      ? 'An internal error occurred'
      : isError(error)
        ? error.message
        : 'Unknown error',
    error: { code: 'INTERNAL_SERVER_ERROR' },
  });
}

/**
 * 404 handler — must be placed after all valid routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    error: { code: 'NOT_FOUND' },
  });
}
