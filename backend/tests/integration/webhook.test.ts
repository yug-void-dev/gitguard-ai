/**
 * @file tests/integration/webhook.test.ts
 * @description Integration tests for POST /api/webhooks/github endpoint.
 * MongoDB and Arctic (ESM) are mocked — no real DB or OAuth needed.
 */

import '../helpers/setup';

// ── Module mocks (must be before any imports) ──────────────────────────────

jest.mock('../../src/config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/models/AuditLog', () => ({
  AuditLog: { create: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../../src/queue/reviewQueue', () => ({
  enqueueReviewJob: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  getReviewQueue: jest.fn(),
  REVIEW_QUEUE_NAME: 'review-pr',
}));

// Mock arctic (pure ESM — cannot be loaded by ts-jest without full ESM setup)
jest.mock('arctic', () => ({
  GitHub: jest.fn().mockImplementation(() => ({
    createAuthorizationURL: jest.fn(),
    validateAuthorizationCode: jest.fn(),
  })),
  generateState: jest.fn().mockReturnValue('mock-state'),
  generateCodeVerifier: jest.fn().mockReturnValue('mock-verifier'),
}));

// Mock @octokit/rest (pure ESM)
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        listForAuthenticatedUser: jest.fn(),
        get: jest.fn(),
      },
    },
  })),
}));

// Mock Review model — webhookService.ts now persists a pending Review on each PR event.
// Without this mock, findOneAndUpdate would try to connect to a real MongoDB.
jest.mock('../../src/models/Review', () => ({
  Review: {
    findOne: jest.fn().mockResolvedValue(null),
    findOneAndUpdate: jest.fn().mockResolvedValue({
      toJSON: () => ({
        _id: 'mock-review-id',
        status: 'pending',
        prTitle: 'Mock PR',
        repository: { fullName: 'test/repo' },
      }),
    }),
    find: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue([]),
  },
}));

// Mock websocket module — webhookService.ts calls broadcastReviewEvent after queuing.
// In tests there is no WS server, so we just stub it out.
jest.mock('../../src/websocket', () => ({
  initWebSocketServer: jest.fn(),
  broadcastReviewEvent: jest.fn(),
}));

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connection: { ...actual.connection, readyState: 1, on: jest.fn() },
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };
});

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
    GITHUB_CLIENT_ID: 'mock-client-id',
    GITHUB_CLIENT_SECRET: 'mock-client-secret',
    GITHUB_CALLBACK_URL: 'http://localhost:3001/api/auth/github/callback',
    JWT_SECRET: 'mock-jwt-secret-that-is-at-least-32-chars!!',
    JWT_EXPIRES_IN: '7d',
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

// Unique delivery ID per call — prevents replay protection interference
let _deliveryCount = 0;
const uid = (): string => `delivery-${Date.now()}-${++_deliveryCount}`;
const sign = (body: string): string => generateSignature(body, TEST_SECRET);

const sendWebhook = (body: unknown, signature: string, event = 'pull_request') => {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return request(app)
    .post('/api/webhooks/github')
    .set('Content-Type', 'application/json')
    .set('X-Hub-Signature-256', signature)
    .set('X-GitHub-Event', event)
    .set('X-GitHub-Delivery', uid())
    .send(bodyStr);
};

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('POST /api/webhooks/github', () => {
  describe('✅ Successful webhook processing', () => {
    it('should return 200 + eventId for valid "opened" PR', async () => {
      const bodyStr = openedPRPayloadString;
      const res = await sendWebhook(openedPRPayload, sign(bodyStr));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.eventId).toBeDefined();
      expect(typeof res.body.eventId).toBe('string');
    });

    it('should return 200 for valid "synchronize" PR', async () => {
      const bodyStr = JSON.stringify(synchronizePRPayload);
      const res = await sendWebhook(synchronizePRPayload, sign(bodyStr));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 200 for valid "reopened" PR', async () => {
      const bodyStr = JSON.stringify(reopenedPRPayload);
      const res = await sendWebhook(reopenedPRPayload, sign(bodyStr));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should include X-Request-ID in response headers', async () => {
      const res = await sendWebhook(openedPRPayload, sign(openedPRPayloadString));
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('should return 200 for unsupported action "closed" (no retry)', async () => {
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
        .set('X-GitHub-Delivery', uid())
        .send(bodyStr);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('❌ Signature validation failures', () => {
    it('should return 403 when signature header is missing', async () => {
      const res = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'pull_request')
        .set('X-GitHub-Delivery', uid())
        .send(openedPRPayloadString);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    });

    it('should return 403 for incorrect signature', async () => {
      const res = await sendWebhook(openedPRPayload, sign('different-body-entirely'));
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for fake signature', async () => {
      const res = await sendWebhook(openedPRPayload, 'sha256=fakesignature');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for SHA-1 format (legacy) signature', async () => {
      const sha1Sig = `sha1=${crypto.createHmac('sha1', TEST_SECRET).update(openedPRPayloadString).digest('hex')}`;
      const res = await sendWebhook(openedPRPayload, sha1Sig);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should NOT leak the webhook secret in error response', async () => {
      const res = await sendWebhook(openedPRPayload, 'sha256=bad');
      const responseText = JSON.stringify(res.body);
      expect(responseText).not.toContain(TEST_SECRET);
      expect(responseText).not.toContain('HMAC');
    });
  });

  describe('❌ Malformed payload handling', () => {
    it('should return 400 for invalid JSON body', async () => {
      const invalidJson = 'not-valid-json{{{';
      const res = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(invalidJson))
        .set('X-GitHub-Event', 'pull_request')
        .set('X-GitHub-Delivery', uid())
        .send(invalidJson);
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
        .set('X-GitHub-Delivery', uid())
        .send('');
      expect(res.status).toBe(400);
    });

    it('should return 400 for non-JSON content-type', async () => {
      const bodyStr = openedPRPayloadString;
      const res = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'text/plain')
        .set('X-Hub-Signature-256', sign(bodyStr))
        .set('X-GitHub-Event', 'pull_request')
        .set('X-GitHub-Delivery', uid())
        .send(bodyStr);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CONTENT_TYPE');
    });
  });

  describe('🔒 Replay protection', () => {
    it('should silently deduplicate same delivery ID', async () => {
      const bodyStr = openedPRPayloadString;
      const sig = sign(bodyStr);
      const deliveryId = `replay-test-${Date.now()}`;

      const res1 = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sig)
        .set('X-GitHub-Event', 'pull_request')
        .set('X-GitHub-Delivery', deliveryId)
        .send(bodyStr);
      expect(res1.status).toBe(200);
      expect(res1.body.eventId).toBeDefined();

      const res2 = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sig)
        .set('X-GitHub-Event', 'pull_request')
        .set('X-GitHub-Delivery', deliveryId)
        .send(bodyStr);
      expect(res2.status).toBe(200);
      expect(res2.body.message).toContain('Duplicate');
    });
  });

  describe('🏥 Health check', () => {
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
