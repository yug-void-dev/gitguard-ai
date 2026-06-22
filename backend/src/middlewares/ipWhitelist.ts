/**
 * @file src/middlewares/ipWhitelist.ts
 * @description Optional IP whitelisting middleware.        [Teammate B — Security]
 *
 * When IP_WHITELIST is set, only requests from those IPs pass through.
 * GitHub publishes its webhook source IPs at https://api.github.com/meta (hooks[]).
 * Leave IP_WHITELIST unset to allow all IPs (HMAC signature is still the primary guard).
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { HttpStatus } from '../lib/errors';

function buildWhitelist(): Set<string> {
  const raw = process.env['IP_WHITELIST'];
  if (!raw?.trim()) return new Set();
  const ips = raw
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  logger.info({ count: ips.length }, 'IP whitelist loaded');
  return new Set(ips);
}

const WHITELIST = buildWhitelist();

function extractIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return first.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Enforces the IP whitelist when IP_WHITELIST env var is configured.
 * No-op when the whitelist is empty.
 */
export function ipWhitelistMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (WHITELIST.size === 0) {
    next();
    return;
  }

  const clientIp = extractIp(req);
  if (!WHITELIST.has(clientIp)) {
    logger.warn(
      { requestId: req.id, clientIp },
      'Webhook rejected — IP not in whitelist',
    );
    res.status(HttpStatus.FORBIDDEN).json({
      success: false,
      message: 'Forbidden',
      error: { code: 'IP_NOT_ALLOWED' },
    });
    return;
  }
  next();
}
