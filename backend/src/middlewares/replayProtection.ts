/**
 * @file src/middlewares/replayProtection.ts
 * @description Webhook replay attack protection.           [Teammate B — Security]
 *
 * Deduplicates X-GitHub-Delivery UUIDs within a 10-minute TTL window.
 * GitHub retries failed webhooks — we deduplicate, not block them entirely.
 *
 * Week 5+: Replace with Redis SET+TTL for multi-instance deployments.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

const TTL_MS = 10 * 60 * 1000; // 10 minutes — matches GitHub's retry window
const MAX_CACHE_SIZE = 10_000;

interface CacheEntry {
  seenAt: number;
}

class DeliveryCache {
  private readonly cache = new Map<string, CacheEntry>();

  hasSeen(deliveryId: string): boolean {
    this.evictExpired();
    const entry = this.cache.get(deliveryId);
    if (!entry) return false;
    if (Date.now() - entry.seenAt > TTL_MS) {
      this.cache.delete(deliveryId);
      return false;
    }
    return true;
  }

  markSeen(deliveryId: string): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(deliveryId, { seenAt: Date.now() });
  }

  private evictExpired(): void {
    if (this.cache.size < 100) return;
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.seenAt > TTL_MS) this.cache.delete(key);
    }
  }

  get size(): number {
    return this.cache.size;
  }
}

export const deliveryCache = new DeliveryCache();

/**
 * Rejects duplicate webhook deliveries within the TTL window.
 * Returns 200 (not 4xx) so GitHub does not keep retrying.
 */
export function replayProtectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const deliveryId = req.headers['x-github-delivery'] as string | undefined;
  if (!deliveryId) {
    next();
    return;
  } // No ID = manual test, allow through

  if (deliveryCache.hasSeen(deliveryId)) {
    logger.warn(
      { requestId: req.id, deliveryId },
      'Duplicate delivery — possible replay attack',
    );
    res.status(200).json({ success: true, message: 'Duplicate delivery ignored' });
    return;
  }

  deliveryCache.markSeen(deliveryId);
  next();
}
