import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Global Express error handling middleware.
 * Catches unhandled errors and ensures a standardized JSON response is returned.
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error({ 
    err, 
    path: req.path, 
    method: req.method,
    ip: req.ip
  }, 'Unhandled exception caught by global error handler');

  if (res.headersSent) {
    return next(err);
  }

  const status = (err as any).status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected internal error occurred' 
    : err.message;

  res.status(status).json({
    success: false,
    error: message,
    statusCode: status
  });
}
