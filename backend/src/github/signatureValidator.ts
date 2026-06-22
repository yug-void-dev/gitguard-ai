/**
 * @file src/github/signatureValidator.ts
 * @description HMAC-SHA256 webhook signature validation.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SECURITY DESIGN NOTES                                              │
 * │                                                                     │
 * │  GitHub computes:                                                   │
 * │    signature = 'sha256=' + HMAC-SHA256(secret, rawRequestBody)      │
 * │                                                                     │
 * │  and sends it in the x-hub-signature-256 header.                    │
 * │                                                                     │
 * │  We MUST:                                                           │
 * │  1. Hash the raw bytes (before any JSON.parse) — that's why we      │
 * │     capture req.rawBody in the body-parser middleware.              │
 * │  2. Use crypto.timingSafeEqual for the comparison, NOT === or       │
 * │     string equality. Regular string comparison short-circuits on    │
 * │     the first differing character, enabling timing-side-channel     │
 * │     attacks where an attacker can brute-force the secret byte by   │
 * │     byte by measuring response time.                               │
 * │  3. Return identical error responses for missing vs invalid         │
 * │     signatures so we don't leak which check failed.                │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import crypto from 'crypto';
import { env } from '../config/env';
import { WebhookSignatureError } from '../lib/errors';

/** Prefix GitHub prepends to the HMAC digest */
const SIGNATURE_PREFIX = 'sha256=';

/**
 * Validates the x-hub-signature-256 header against the raw request body.
 *
 * @param signature - Value of the x-hub-signature-256 header
 * @param rawBody   - The raw request body Buffer (MUST be unmodified bytes)
 * @throws {WebhookSignatureError} if the signature is missing, malformed, or invalid
 *
 * @example
 * validateWebhookSignature(
 *   req.headers['x-hub-signature-256'] as string,
 *   req.rawBody
 * );
 */
export function validateWebhookSignature(
  signature: string | undefined,
  rawBody: Buffer | undefined,
): void {
  // ── Step 1: Ensure signature header is present ────────────────────────
  if (!signature) {
    // We throw the same error class for both missing and invalid cases
    // to prevent enumeration of which check failed.
    throw new WebhookSignatureError();
  }

  // ── Step 2: Ensure raw body was captured ─────────────────────────────
  if (!rawBody || rawBody.length === 0) {
    throw new WebhookSignatureError();
  }

  // ── Step 3: Validate the prefix format ───────────────────────────────
  // If the header doesn't start with 'sha256=' it's either from a different
  // algorithm (SHA-1 legacy) or completely malformed.
  if (!signature.startsWith(SIGNATURE_PREFIX)) {
    throw new WebhookSignatureError();
  }

  // ── Step 4: Compute the expected HMAC-SHA256 digest ──────────────────
  // We use the webhook secret from env (never user-controlled).
  const expectedDigest = crypto
    .createHmac('sha256', env.GITHUB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedSignature = `${SIGNATURE_PREFIX}${expectedDigest}`;

  // ── Step 5: Timing-safe comparison ───────────────────────────────────
  // Convert both signatures to Buffers of equal length.
  // If lengths differ, timingSafeEqual would throw — so we pad/truncate
  // strategically to still perform a constant-time comparison that returns
  // false when lengths differ, without leaking length information.
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  // Length mismatch — reject, but still do a dummy comparison to avoid
  // timing leaks based on early return.
  if (sigBuffer.length !== expectedBuffer.length) {
    // Perform a dummy comparison to burn the same approximate time
    crypto.timingSafeEqual(Buffer.alloc(expectedBuffer.length), expectedBuffer);
    throw new WebhookSignatureError();
  }

  // Actual constant-time comparison
  const isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);

  if (!isValid) {
    throw new WebhookSignatureError();
  }
}
