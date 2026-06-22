/**
 * @file tests/unit/errors.test.ts
 * @description Unit tests for centralized error hierarchy.  [Teammate D — Testing]
 */

import '../helpers/setup';

import {
  AppError,
  WebhookSignatureError,
  WebhookPayloadError,
  WebhookEventNotSupportedError,
  ValidationError,
  DatabaseError,
  AuthError,
  HttpStatus,
  isAppError,
  isError,
} from '../../src/lib/errors';

describe('Error hierarchy', () => {
  describe('AppError (base)', () => {
    it('should set statusCode, code, isOperational', () => {
      const err = new AppError('test', 400, 'TEST_CODE');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('TEST_CODE');
      expect(err.isOperational).toBe(true);
      expect(err.message).toBe('test');
    });

    it('should have a stack trace', () => {
      const err = new AppError('test', 500, 'X');
      expect(err.stack).toBeDefined();
    });
  });

  describe('WebhookSignatureError', () => {
    it('should default to 403 FORBIDDEN', () => {
      const err = new WebhookSignatureError();
      expect(err.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(err.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    });
  });

  describe('WebhookPayloadError', () => {
    it('should default to 400 BAD_REQUEST', () => {
      const err = new WebhookPayloadError();
      expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(err.code).toBe('WEBHOOK_PAYLOAD_INVALID');
    });
  });

  describe('WebhookEventNotSupportedError', () => {
    it('should return 200 (prevent GitHub retry)', () => {
      const err = new WebhookEventNotSupportedError('push');
      expect(err.statusCode).toBe(HttpStatus.OK);
    });

    it('should include action in message when provided', () => {
      const err = new WebhookEventNotSupportedError('pull_request', 'labeled');
      expect(err.message).toContain('pull_request:labeled');
    });
  });

  describe('ValidationError', () => {
    it('should store details', () => {
      const err = new ValidationError('bad input', { field: 'email' });
      expect(err.details).toEqual({ field: 'email' });
      expect(err.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DatabaseError', () => {
    it('should return 500', () => {
      const err = new DatabaseError();
      expect(err.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('AuthError', () => {
    it('should return 401 UNAUTHORIZED', () => {
      const err = new AuthError();
      expect(err.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(err.code).toBe('AUTH_ERROR');
    });

    it('should use custom message', () => {
      const err = new AuthError('Token expired');
      expect(err.message).toBe('Token expired');
    });
  });

  describe('Type guards', () => {
    it('isAppError should return true for AppError subclasses', () => {
      expect(isAppError(new WebhookSignatureError())).toBe(true);
      expect(isAppError(new AuthError())).toBe(true);
      expect(isAppError(new Error('regular'))).toBe(false);
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
    });

    it('isError should return true for any Error', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new WebhookSignatureError())).toBe(true);
      expect(isError('not-an-error')).toBe(false);
      expect(isError(null)).toBe(false);
    });
  });
});
