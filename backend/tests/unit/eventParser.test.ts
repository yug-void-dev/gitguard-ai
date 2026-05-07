/**
 * @file tests/unit/eventParser.test.ts
 * @description Unit tests for the GitHub webhook event parser.
 */

import '../helpers/setup';

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

import { parsePullRequestEvent } from '../../src/github/eventParser';
import { WebhookPayloadError } from '../../src/lib/errors';
import {
  openedPRPayload,
  synchronizePRPayload,
  closedPRPayload,
  invalidPayload,
} from '../helpers/mockPayloads';

describe('parsePullRequestEvent', () => {
  describe('✅ Supported actions', () => {
    it('should parse an "opened" PR event', () => {
      const event = parsePullRequestEvent(openedPRPayload);
      expect(event).not.toBeNull();
      expect(event!.action).toBe('opened');
      expect(event!.pullRequest.number).toBe(1347);
      expect(event!.repository.fullName).toBe('octocat/Hello-World');
      expect(event!.sender.login).toBe('octocat');
    });

    it('should parse a "synchronize" PR event', () => {
      const event = parsePullRequestEvent(synchronizePRPayload);
      expect(event).not.toBeNull();
      expect(event!.action).toBe('synchronize');
    });

    it('should generate a unique eventId (UUID v4 format)', () => {
      const event = parsePullRequestEvent(openedPRPayload);
      expect(event!.eventId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should correctly map PR fields to internal format', () => {
      const event = parsePullRequestEvent(openedPRPayload);
      const pr = event!.pullRequest;
      expect(pr.title).toBe('Amazing new feature');
      expect(pr.isDraft).toBe(false);
      expect(pr.additions).toBe(42);
      expect(pr.deletions).toBe(7);
      expect(pr.changedFiles).toBe(5);
      expect(pr.headRef).toBe('new-topic');
      expect(pr.baseRef).toBe('main');
    });

    it('should set receivedAt to a recent Date', () => {
      const before = new Date();
      const event = parsePullRequestEvent(openedPRPayload);
      const after = new Date();
      expect(event!.receivedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event!.receivedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('⚪ Unsupported actions (should return null)', () => {
    it('should return null for "closed" action', () => {
      const event = parsePullRequestEvent(closedPRPayload);
      expect(event).toBeNull();
    });

    it('should return null for "labeled" action', () => {
      const payload = { ...openedPRPayload, action: 'labeled' };
      expect(parsePullRequestEvent(payload)).toBeNull();
    });

    it('should return null for "assigned" action', () => {
      const payload = { ...openedPRPayload, action: 'assigned' };
      expect(parsePullRequestEvent(payload)).toBeNull();
    });
  });

  describe('❌ Invalid payloads', () => {
    it('should throw WebhookPayloadError for missing required fields', () => {
      expect(() => parsePullRequestEvent(invalidPayload)).toThrow(WebhookPayloadError);
    });

    it('should throw for null payload', () => {
      expect(() => parsePullRequestEvent(null)).toThrow(WebhookPayloadError);
    });

    it('should throw for completely empty object', () => {
      expect(() => parsePullRequestEvent({})).toThrow(WebhookPayloadError);
    });

    it('should throw for non-object payload', () => {
      expect(() => parsePullRequestEvent('string-payload')).toThrow(WebhookPayloadError);
    });

    it('should throw when pull_request is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pull_request: _pr, ...nopr } = openedPRPayload;
      expect(() => parsePullRequestEvent(nopr)).toThrow(WebhookPayloadError);
    });
  });
});
