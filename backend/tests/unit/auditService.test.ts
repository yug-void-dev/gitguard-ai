/**
 * @file tests/unit/auditService.test.ts
 * @description Unit tests for the audit logging service.   [Teammate D — Testing]
 */

import '../helpers/setup';

jest.mock('../../src/config/env', () => ({
  env: {
    GITHUB_WEBHOOK_SECRET: 'test-webhook-secret-at-least-16-chars',
    NODE_ENV: 'test', PORT: 3002,
    MONGODB_URI: 'mongodb://localhost:27017/gitguard-test',
    ALLOWED_ORIGINS: 'http://localhost:3000', LOG_LEVEL: 'silent',
    WEBHOOK_RATE_LIMIT_MAX: 30, WEBHOOK_RATE_LIMIT_WINDOW_MS: 60000,
    GITHUB_CLIENT_ID: 'mock-id', GITHUB_CLIENT_SECRET: 'mock-secret',
    GITHUB_CALLBACK_URL: 'http://localhost:3001/api/auth/github/callback',
    JWT_SECRET: 'mock-jwt-secret-that-is-at-least-32-chars!!', JWT_EXPIRES_IN: '7d',
  },
  isProduction: false, isDevelopment: false, isTest: true,
}));

const mockCreate = jest.fn().mockResolvedValue({});
jest.mock('../../src/models/AuditLog', () => ({
  AuditLog: { create: mockCreate },
}));

import { Request } from 'express';
import { writeAuditLog, auditSuccess, auditFailure, auditIgnored } from '../../src/audit/auditService';
import { WebhookSignatureError } from '../../src/lib/errors';

function fakeReq(ip = '127.0.0.1'): Request {
  return {
    id: 'req-123',
    headers: { 'user-agent': 'GitHub-Hookshot/test' },
    socket: { remoteAddress: ip },
  } as unknown as Request;
}

function fakePREvent() {
  return {
    eventId: 'evt-abc',
    action: 'opened' as const,
    pullRequest: { id: 1, number: 42, title: 'Test PR', body: null, htmlUrl: '', diffUrl: '',
      state: 'open' as const, isDraft: false, additions: 0, deletions: 0,
      changedFiles: 0, commits: 1, headRef: 'feat', headSha: 'abc',
      baseRef: 'main', baseSha: 'def', createdAt: '', updatedAt: '' },
    repository: { id: 1, name: 'repo', fullName: 'owner/repo', isPrivate: false,
      htmlUrl: '', defaultBranch: 'main', language: null, ownerLogin: 'owner' },
    sender: { login: 'octocat', id: 1, avatarUrl: '', type: 'User' },
    receivedAt: new Date(),
  };
}

describe('auditService', () => {
  beforeEach(() => { mockCreate.mockClear(); });

  describe('writeAuditLog', () => {
    it('should call AuditLog.create with correct fields', async () => {
      await writeAuditLog({
        requestId: 'req-1', eventType: 'webhook_received',
        outcome: 'success', req: fakeReq(),
      });
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const arg = mockCreate.mock.calls[0][0];
      expect(arg.requestId).toBe('req-1');
      expect(arg.outcome).toBe('success');
      expect(arg.eventType).toBe('webhook_received');
      expect(arg.sourceIp).toBe('127.0.0.1');
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      const req = { ...fakeReq(), headers: { 'x-forwarded-for': '10.0.0.1, 172.16.0.1' } } as unknown as Request;
      await writeAuditLog({ requestId: 'r', eventType: 'webhook_received', outcome: 'success', req });
      expect(mockCreate.mock.calls[0][0].sourceIp).toBe('10.0.0.1');
    });

    it('should include sanitized error code for AppError', async () => {
      const err = new WebhookSignatureError();
      await writeAuditLog({ requestId: 'r', eventType: 'webhook_received', outcome: 'failure', req: fakeReq(), error: err });
      const arg = mockCreate.mock.calls[0][0];
      expect(arg.errorCode).toBe('WEBHOOK_SIGNATURE_INVALID');
      expect(arg.failureReason).toBeDefined();
    });

    it('should NOT throw if AuditLog.create fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB down'));
      await expect(
        writeAuditLog({ requestId: 'r', eventType: 'webhook_received', outcome: 'success', req: fakeReq() })
      ).resolves.not.toThrow();
    });
  });

  describe('auditSuccess', () => {
    it('should write event_processed success log', async () => {
      await auditSuccess(fakeReq(), fakePREvent());
      const arg = mockCreate.mock.calls[0][0];
      expect(arg.eventType).toBe('event_processed');
      expect(arg.outcome).toBe('success');
      expect(arg.pullRequestNumber).toBe(42);
      expect(arg.repositoryFullName).toBe('owner/repo');
      expect(arg.senderLogin).toBe('octocat');
    });
  });

  describe('auditFailure', () => {
    it('should write failure log', async () => {
      await auditFailure(fakeReq(), 'webhook_received', new WebhookSignatureError());
      const arg = mockCreate.mock.calls[0][0];
      expect(arg.outcome).toBe('failure');
      expect(arg.errorCode).toBe('WEBHOOK_SIGNATURE_INVALID');
    });
  });

  describe('auditIgnored', () => {
    it('should write ignored log', async () => {
      await auditIgnored(fakeReq(), 'closed');
      const arg = mockCreate.mock.calls[0][0];
      expect(arg.outcome).toBe('ignored');
      expect(arg.githubAction).toBe('closed');
    });
  });
});
