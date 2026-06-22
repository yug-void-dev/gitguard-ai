/**
 * @file src/middlewares/rawBody.ts
 * @description Captures the raw request body as a Buffer for HMAC validation.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  WHY RAW BODY?                                                      │
 * │                                                                     │
 * │  HMAC-SHA256 signatures are computed over the exact bytes of the   │
 * │  request body as sent by GitHub. If we parse the JSON first and    │
 * │  re-serialize it, even minor differences (key order, whitespace,   │
 * │  unicode normalization) will produce a different hash.              │
 * │                                                                     │
 * │  Solution: use the `verify` callback in express.json() to capture  │
 * │  the raw Buffer before Express consumes it, then attach it to req. │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { Request, Response, NextFunction } from 'express';
import express from 'express';

/**
 * Returns a configured express.json() middleware that:
 * 1. Parses JSON body into req.body
 * 2. Stores the raw Buffer in req.rawBody
 *
 * Apply this ONLY to the webhook route — other routes can use
 * plain express.json() without the rawBody overhead.
 */
export function rawBodyJsonParser(): express.RequestHandler {
  return express.json({
    limit: '5mb', // Prevent payload-size DoS
    verify: (req: Request, _res: Response, buf: Buffer) => {
      // Attach raw body before Express parses it
      req.rawBody = buf;
    },
  });
}

/**
 * Standalone middleware that rejects requests with no body.
 * Placed after rawBodyJsonParser to ensure body has been read.
 */
export function requireBody(req: Request, res: Response, next: NextFunction): void {
  if (!req.rawBody || req.rawBody.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Request body is required',
    });
    return;
  }
  next();
}
