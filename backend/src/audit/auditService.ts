/**
 * @file src/audit/auditService.ts
 * @description Service for persisting audit log entries to MongoDB.
 *
 * Audit logs record every significant security and processing event
 * without ever storing secret values.
 */

import { Request } from 'express';
import { AuditLog, AuditEventType, AuditOutcome } from '../models/AuditLog';
import { logger } from '../lib/logger';
import { PullRequestEvent } from '../types/github';
import { isAppError } from '../lib/errors';

/** Parameters for creating an audit log entry */
interface AuditParams {
  requestId: string;
  eventType: AuditEventType;
  outcome: AuditOutcome;
  req: Request;
  eventId?: string;
  githubEvent?: string;
  githubAction?: string;
  repositoryFullName?: string;
  pullRequestNumber?: number;
  senderLogin?: string;
  error?: unknown;
}

/**
 * Persists an audit log entry to MongoDB.
 * Errors are caught and logged but never thrown — audit failures
 * must not break the main request flow.
 */
export async function writeAuditLog(params: AuditParams): Promise<void> {
  const {
    requestId,
    eventType,
    outcome,
    req,
    eventId,
    githubEvent,
    githubAction,
    repositoryFullName,
    pullRequestNumber,
    senderLogin,
    error,
  } = params;

  // Build failure metadata without including secret values
  let failureReason: string | undefined;
  let errorCode: string | undefined;

  if (error) {
    if (isAppError(error)) {
      failureReason = error.message;
      errorCode = error.code;
    } else if (error instanceof Error) {
      // For non-operational errors, use a generic message in production
      failureReason = 'Internal processing error';
      errorCode = 'INTERNAL_ERROR';
    }
  }

  try {
    await AuditLog.create({
      requestId,
      eventId,
      eventType,
      outcome,
      githubEvent,
      githubAction,
      repositoryFullName,
      pullRequestNumber,
      senderLogin,
      sourceIp: getClientIp(req),
      userAgent: req.headers['user-agent'],
      failureReason,
      errorCode,
    });
  } catch (dbError) {
    // Log but never throw — audit failure is non-fatal
    logger.error(
      { error: dbError, requestId },
      'Failed to write audit log entry',
    );
  }
}

/**
 * Convenience: write a success audit entry for a processed PR event.
 */
export async function auditSuccess(
  req: Request,
  event: PullRequestEvent,
): Promise<void> {
  return writeAuditLog({
    requestId: req.id,
    eventId: event.eventId,
    eventType: 'event_processed',
    outcome: 'success',
    req,
    githubEvent: 'pull_request',
    githubAction: event.action,
    repositoryFullName: event.repository.fullName,
    pullRequestNumber: event.pullRequest.number,
    senderLogin: event.sender.login,
  });
}

/**
 * Convenience: write a failure audit entry.
 */
export async function auditFailure(
  req: Request,
  eventType: AuditEventType,
  error: unknown,
  extra?: Partial<{
    githubEvent: string;
    githubAction: string;
    repositoryFullName: string;
    pullRequestNumber: number;
    senderLogin: string;
  }>,
): Promise<void> {
  return writeAuditLog({
    requestId: req.id,
    eventType,
    outcome: 'failure',
    req,
    error,
    ...extra,
  });
}

/**
 * Convenience: write an ignored event audit entry.
 */
export async function auditIgnored(
  req: Request,
  githubAction: string,
): Promise<void> {
  return writeAuditLog({
    requestId: req.id,
    eventType: 'event_ignored',
    outcome: 'ignored',
    req,
    githubEvent: 'pull_request',
    githubAction,
  });
}

/**
 * Extracts the real client IP, accounting for proxies.
 * In production behind a load balancer, use X-Forwarded-For.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}
