/**
 * @file src/middlewares/requestId.ts
 * @description Assigns a unique UUID v4 to every incoming request.
 *
 * The ID is:
 * - Stored on req.id for use by other middlewares and controllers
 * - Added to the response as X-Request-ID for client-side correlation
 * - Included in every log line via child logger
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Express middleware that generates a unique request ID.
 * Honours an existing X-Request-ID header (e.g. from a load balancer).
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Honour upstream request ID if present, otherwise generate a new one
  const existingId = req.headers['x-request-id'];
  const requestId =
    typeof existingId === 'string' && existingId.trim() ? existingId.trim() : uuidv4();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
