/**
 * @file tests/integration/webhook.test.ts
 * @description Integration tests for the POST /api/webhooks/github endpoint.
 *
 * Uses Supertest to make real HTTP requests against the Express app.
 * MongoDB is mocked via jest.mock to avoid needing a real database.
 */

import '../helpers/setup';

// ── Module mocks (must be before any imports that pull them in) ───────────────

// Mock DB connection so tests don't need a real MongoDB
jest.mock('../../src/config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
}));

// Mock AuditLog model to avoid real DB writes
jest.mock('../../src/models/AuditLog', () => ({
  AuditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
}));

// Mock mongoose connection state (for health checks)
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connection: {
      ...actual.connection,
      readyState: 1,
      on: jest.fn(),
    },
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };
});

// Mock env
jest.mock('../../src/config/env', () => ({
  env: {
    GITHUB_WEBHOOK_SECRET: 'test-webhook-secret-at-least-16-chars',
    NODE_ENV: 'test',
    PORT: 3002,
    MONGODB_URI: 'mongodb://localhost:27017/gitguard-test',
    ALLOWED_ORIGINS: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    WEBHOOK_RATE_LIMIT_MAX: 30,
    WEBHOOK_RATE_LIMIT_WINDOW_MS: 60000,
  },
  isProduction: false,
  isDevelopment: false,
  isTest: true,
}));

import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../../src/app';
import {
  openedPRPayload,
  synchronizePRPayload,
  reopenedPRPayload,
  closedPRPayload,
  invalidPayload,
  openedPRPayloadString,
  generateSignature,
} from '../helpers/mockPayloads';

const TEST_SECRET = 'test-webhook-secret-at-least-16-chars';
const app = createApp();

// Helper: generate valid signature
const sign = (body: string): string => generateSignature(body, TEST_SECRET);

// Helper: send webhook request
const sendWebhook = (
  body: unknown,
  signature: string,
  event = 'pull_request',
) => {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return request(app)
    .post('/api/webhooks/github')
    .set('Content-Type', 'application/json')
    .set('X-Hub-Signature-256', signature)
    .set('X-GitHub-Event', event)
    .set('X-GitHub-Delivery', 'test-delivery-id')
    .send(bodyStr);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/github', () => {

  describe('✅ Successful webhook processing', () => {
    it('should return 200 for a valid "opened" PR event', async () => {
      const bodyStr = openedPRPayloadString;
      const res = await sendWebhook(openedPRPayload, sign(bodyStr));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.eventId).toBeDefined();
      expect(typeof res.body.eventId).toBe('string');
    });

    it('should return 200 for a valid "synchronize" PR event', async () => {
      const bodyStr = JSON.stringify(synchronizePRPayload);
      const res = await sendWebhook(synchronizePRPayload, sign(bodyStr));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 200 for a valid "reopened" PR event', async () => {
      const bodyStr = JSON.stringify(reopenedPRPayload);
      const res = await sendWebhook(reopenedPRPayload, sign(bodyStr));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should include X-Request-ID in the response headers', async () => {
      const bodyStr = openedPRPayloadString;
      const res = await sendWebhook(openedPRPayload, sign(bodyStr));

      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('should return 200 (not 422) for unsupported action like "closed"', async () => {
      const bodyStr = JSON.stringify(closedPRPayload);
      const res = await sendWebhook(closedPRPayload, sign(bodyStr));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('closed');
    });

    it('should return 200 for non-pull_request event (e.g. push)', async () => {
      const bodyStr = '{"ref":"refs/heads/main"}';
      const res = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(bodyStr))
        .set('X-GitHub-Event', 'push')
        .send(bodyStr);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('❌ Signature validation failures', () => {
    it('should return 403 when x-hub-signature-256 header is missing', async () => {
      const res = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'pull_request')
        .send(openedPRPayloadString);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    });

    it('should return 403 for an incorrect signature', async () => {
      const wrongSig = sign('different-body');
      const res = await sendWebhook(openedPRPayload, wrongSig);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for a completely fake signature', async () => {
      const res = await sendWebhook(openedPRPayload, 'sha256=fakesignature');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for SHA-1 format signature (legacy)', async () => {
      const sha1Sig = `sha1=${crypto.createHmac('sha1', TEST_SECRET).update(openedPRPayloadString).digest('hex')}`;
      const res = await sendWebhook(openedPRPayload, sha1Sig);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should NOT leak the secret in the error response', async () => {
      const res = await sendWebhook(openedPRPayload, 'sha256=bad');
      const responseText = JSON.stringify(res.body);

      expect(responseText).not.toContain(TEST_SECRET);
      expect(responseText).not.toContain('HMAC');
    });
  });

  describe('❌ Malformed payload handling', () => {
    it('should return 400 for invalid JSON', async () => {
      const invalidJson = 'not-valid-json{';
      const res = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(invalidJson))
        .set('X-GitHub-Event', 'pull_request')
        .send(invalidJson);

      // Express json parser returns 400 for invalid JSON
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required payload fields', async () => {
      const bodyStr = JSON.stringify(invalidPayload);
      const res = await sendWebhook(invalidPayload, sign(bodyStr));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WEBHOOK_PAYLOAD_INVALID');
    });

    it('should return 400 for empty body', async () => {
      const res = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(''))
        .set('X-GitHub-Event', 'pull_request')
        .send('');

      expect(res.status).toBe(400);
    });
  });

  describe('🏥 Health check endpoint', () => {
    it('should return 200 at /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('🔍 404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
