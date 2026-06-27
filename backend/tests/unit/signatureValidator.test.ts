/**
 * @file tests/unit/signatureValidator.test.ts
 * @description Unit tests for HMAC-SHA256 webhook signature validation.
 */

import '../helpers/setup'; // Must be first

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

import crypto from 'crypto';
import { validateWebhookSignature } from '../../src/github/signatureValidator';
import { WebhookSignatureError } from '../../src/lib/errors';

const TEST_SECRET = 'test-webhook-secret-at-least-16-chars';

function createValidSignature(body: string): string {
  return `sha256=${crypto.createHmac('sha256', TEST_SECRET).update(body).digest('hex')}`;
}

describe('validateWebhookSignature', () => {
  const validBody = '{"action":"opened"}';
  const validBodyBuffer = Buffer.from(validBody);
  const validSignature = createValidSignature(validBody);

  describe('✅ Valid signatures', () => {
    it('should not throw for a correct HMAC-SHA256 signature', () => {
      expect(() =>
        validateWebhookSignature(validSignature, validBodyBuffer),
      ).not.toThrow();
    });

    it('should handle different valid bodies', () => {
      const body = '{"action":"synchronize","number":42}';
      const sig = createValidSignature(body);
      expect(() => validateWebhookSignature(sig, Buffer.from(body))).not.toThrow();
    });
  });

  describe('❌ Missing signature', () => {
    it('should throw WebhookSignatureError when signature is undefined', () => {
      expect(() => validateWebhookSignature(undefined, validBodyBuffer)).toThrow(
        WebhookSignatureError,
      );
    });

    it('should throw WebhookSignatureError when signature is empty string', () => {
      expect(() => validateWebhookSignature('', validBodyBuffer)).toThrow(
        WebhookSignatureError,
      );
    });
  });

  describe('❌ Invalid signatures', () => {
    it('should throw for wrong secret', () => {
      const wrongSecretSig = `sha256=${crypto.createHmac('sha256', 'wrong-secret').update(validBody).digest('hex')}`;
      expect(() => validateWebhookSignature(wrongSecretSig, validBodyBuffer)).toThrow(
        WebhookSignatureError,
      );
    });

    it('should throw for tampered body', () => {
      const tamperedBuffer = Buffer.from('{"action":"closed"}');
      expect(() => validateWebhookSignature(validSignature, tamperedBuffer)).toThrow(
        WebhookSignatureError,
      );
    });

    it('should throw for missing sha256= prefix (SHA-1 format)', () => {
      const sha1Sig = `sha1=${crypto.createHmac('sha1', TEST_SECRET).update(validBody).digest('hex')}`;
      expect(() => validateWebhookSignature(sha1Sig, validBodyBuffer)).toThrow(
        WebhookSignatureError,
      );
    });

    it('should throw for completely invalid signature string', () => {
      expect(() => validateWebhookSignature('not-a-signature', validBodyBuffer)).toThrow(
        WebhookSignatureError,
      );
    });

    it('should throw for different-length signature (padding attack)', () => {
      const shortSig = 'sha256=abc';
      expect(() => validateWebhookSignature(shortSig, validBodyBuffer)).toThrow(
        WebhookSignatureError,
      );
    });
  });

  describe('❌ Missing body', () => {
    it('should throw when rawBody is undefined', () => {
      expect(() => validateWebhookSignature(validSignature, undefined)).toThrow(
        WebhookSignatureError,
      );
    });

    it('should throw when rawBody is empty buffer', () => {
      expect(() => validateWebhookSignature(validSignature, Buffer.alloc(0))).toThrow(
        WebhookSignatureError,
      );
    });
  });

  describe('🔒 Security properties', () => {
    it('should return the same error type for missing vs invalid signature (no enumeration)', () => {
      let missingErr: unknown;
      let invalidErr: unknown;

      try {
        validateWebhookSignature(undefined, validBodyBuffer);
      } catch (e) {
        missingErr = e;
      }
      try {
        validateWebhookSignature('sha256=badvalue', validBodyBuffer);
      } catch (e) {
        invalidErr = e;
      }

      expect(missingErr).toBeInstanceOf(WebhookSignatureError);
      expect(invalidErr).toBeInstanceOf(WebhookSignatureError);
      expect((missingErr as WebhookSignatureError).statusCode).toBe(
        (invalidErr as WebhookSignatureError).statusCode,
      );
    });
  });
});
