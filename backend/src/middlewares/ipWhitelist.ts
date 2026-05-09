/**
 * @file src/middlewares/ipWhitelist.ts
<<<<<<< HEAD
 * @description Middleware to restrict requests to authorized IP ranges.
 */

import { Request, Response, NextFunction } from 'express';
import ipaddr from 'ipaddr.js';
import { env } from '../config/env';
import { GITHUB_HOOKS_CIDRS } from '../config/githubIps';
import { logger } from '../lib/logger';
import { HttpStatus } from '../lib/errors';

/**
 * Validates if an IP address belongs to any of the authorized CIDR ranges.
 */
function isIpAllowed(ip: string, allowedCidrs: string[]): boolean {
  try {
    const addr = ipaddr.parse(ip);
    
    for (const cidr of allowedCidrs) {
      const [range, bits] = cidr.split('/');
      const rangeAddr = ipaddr.parse(range);
      
      // Check if both are same version (IPv4 or IPv6)
      if (addr.kind() === rangeAddr.kind()) {
        if (addr.match(rangeAddr, parseInt(bits, 10))) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    logger.error({ ip, error }, 'Failed to parse IP address for whitelisting');
    return false;
  }
}

/**
 * Middleware that rejects requests from unauthorized IPs.
 * Only active if ENABLE_IP_WHITELIST is true.
 */
export const ipWhitelistMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Skip if disabled (useful for local development/ngrok)
  if (!env.ENABLE_IP_WHITELIST) {
    return next();
  }

  // Extract real client IP (handling proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = Array.isArray(forwarded) 
    ? forwarded[0] 
    : (forwarded?.split(',')[0].trim() || req.socket.remoteAddress || '');

  if (!clientIp) {
    logger.warn('IP Whitelist: Could not determine client IP');
    return res.status(HttpStatus.FORBIDDEN).json({
      success: false,
      message: 'Access denied: Could not determine source IP',
    });
  }

  if (isIpAllowed(clientIp, GITHUB_HOOKS_CIDRS)) {
    return next();
  }

  logger.warn({ clientIp }, 'IP Whitelist: Unauthorized access attempt blocked');
  
  return res.status(HttpStatus.FORBIDDEN).json({
    success: false,
    message: 'Access denied: Unauthorized source IP',
    error: { code: 'IP_NOT_WHITELISTED' },
  });
};
=======
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
  const ips = raw.split(',').map((ip) => ip.trim()).filter(Boolean);
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
export function ipWhitelistMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (WHITELIST.size === 0) { next(); return; }

  const clientIp = extractIp(req);
  if (!WHITELIST.has(clientIp)) {
    logger.warn({ requestId: req.id, clientIp }, 'Webhook rejected — IP not in whitelist');
    res.status(HttpStatus.FORBIDDEN).json({
      success: false,
      message: 'Forbidden',
      error: { code: 'IP_NOT_ALLOWED' },
    });
    return;
  }
  next();
}
>>>>>>> 34c35bf (fix(core): fix jest config and add missing supertest dependency)
