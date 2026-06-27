/**
 * @file src/models/AuditLog.ts
 * @description Mongoose model for recording every webhook event (success or failure).
 *
 * Audit logs are append-only; they are never updated or deleted.
 * They provide a complete history for debugging, compliance, and analytics.
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/** Possible outcomes for an audited action */
export type AuditOutcome = 'success' | 'failure' | 'ignored';

/** Possible event types we audit */
export type AuditEventType =
  | 'webhook_received'
  | 'signature_validated'
  | 'event_processed'
  | 'event_ignored';

/** Shape of an AuditLog document */
export interface IAuditLog extends Document {
  /** Correlation ID linking all logs from the same request */
  requestId: string;

  /** Internal event ID (only present on successfully parsed events) */
  eventId?: string;

  /** Type of audited event */
  eventType: AuditEventType;

  /** Final outcome */
  outcome: AuditOutcome;

  /** GitHub webhook event (e.g. "pull_request") */
  githubEvent?: string;

  /** GitHub action within the event (e.g. "opened") */
  githubAction?: string;

  /** Repository full name (e.g. "owner/repo") */
  repositoryFullName?: string;

  /** Pull request number */
  pullRequestNumber?: number;

  /** GitHub sender login */
  senderLogin?: string;

  /** Source IP address of the webhook request */
  sourceIp: string;

  /** HTTP User-Agent header */
  userAgent?: string;

  /** Failure reason (only on outcome=failure) — never includes secret values */
  failureReason?: string;

  /** Error code from our error hierarchy */
  errorCode?: string;

  /** When this audit record was created */
  createdAt: Date;

  /** Auto-set by Mongoose timestamps */
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    requestId: {
      type: String,
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'webhook_received',
        'signature_validated',
        'event_processed',
        'event_ignored',
      ],
    },
    outcome: {
      type: String,
      required: true,
      enum: ['success', 'failure', 'ignored'],
    },
    githubEvent: String,
    githubAction: String,
    repositoryFullName: {
      type: String,
      index: true,
    },
    pullRequestNumber: Number,
    senderLogin: String,
    sourceIp: {
      type: String,
      required: true,
    },
    userAgent: String,
    failureReason: String,
    errorCode: String,
  },
  {
    timestamps: true, // Adds createdAt + updatedAt automatically
    collection: 'audit_logs',

    // Disable _id auto-indexing (we have our own indexes)
    // Actually keep _id — it's useful for pagination
  },
);

// Compound index for common query patterns
auditLogSchema.index({ repositoryFullName: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

/** AuditLog Mongoose model */
export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>(
  'AuditLog',
  auditLogSchema,
);
