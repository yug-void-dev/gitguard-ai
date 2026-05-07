/**
 * @file src/routes/webhooks.ts
 * @description Express router for GitHub webhook endpoints.
 *
 * Applies webhook-specific middleware chain:
 *   rawBodyJsonParser → requireBody → webhookRateLimiter → controller
 */

import { Router } from 'express';
import { rawBodyJsonParser, requireBody } from '../middlewares/rawBody';
import { webhookRateLimiter } from '../middlewares/rateLimiter';
import { handleGithubWebhook } from '../controllers/webhookController';

const router = Router();

/**
 * POST /api/webhooks/github
 *
 * Middleware chain (order matters):
 * 1. rawBodyJsonParser — capture raw bytes for HMAC; parse JSON for req.body
 * 2. requireBody       — reject empty body early
 * 3. webhookRateLimiter— IP-based rate limiting
 * 4. handleGithubWebhook — main business logic
 */
router.post(
  '/github',
  rawBodyJsonParser(),
  requireBody,
  webhookRateLimiter,
  handleGithubWebhook,
);

export default router;
