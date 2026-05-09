/**
 * @file src/routes/webhooks.ts
 * @description GitHub webhook route with full security middleware chain.
 *
 * Middleware order (matters):
 *   ipWhitelist → sanitizeHeaders → requireJsonContentType
 *   → rawBodyJsonParser → requireBody → replayProtection
 *   → webhookRateLimiter → handleGithubWebhook
 */

import { Router } from 'express';
import { rawBodyJsonParser, requireBody } from '../middlewares/rawBody';
import { webhookRateLimiter } from '../middlewares/rateLimiter';
import { ipWhitelistMiddleware } from '../middlewares/ipWhitelist';
<<<<<<< HEAD
=======
import { sanitizeHeaders, requireJsonContentType } from '../middlewares/sanitize';
import { replayProtectionMiddleware } from '../middlewares/replayProtection';
>>>>>>> 34c35bf (fix(core): fix jest config and add missing supertest dependency)
import { handleGithubWebhook } from '../controllers/webhookController';

const router = Router();

router.post(
  '/github',
<<<<<<< HEAD
  rawBodyJsonParser(),
  requireBody,
  ipWhitelistMiddleware,
  webhookRateLimiter,
  handleGithubWebhook,
=======
  ipWhitelistMiddleware,          // 1. IP whitelist (if configured)
  sanitizeHeaders,                // 2. Header size/null-byte check
  requireJsonContentType,         // 3. Enforce application/json
  rawBodyJsonParser(),            // 4. Capture raw bytes + parse JSON
  requireBody,                    // 5. Reject empty body
  replayProtectionMiddleware,     // 6. Deduplicate delivery IDs
  webhookRateLimiter,             // 7. Rate limit per IP
  handleGithubWebhook,            // 8. Business logic
>>>>>>> 34c35bf (fix(core): fix jest config and add missing supertest dependency)
);

export default router;
