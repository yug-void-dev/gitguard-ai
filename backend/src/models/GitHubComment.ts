/**
 * @file src/models/GitHubComment.ts
 * @description Mongoose model for tracking AI-generated GitHub PR comments.
 *
 * This model stores:
 *   - Posted comment metadata (GitHub comment ID, PR, repo)
 *   - Which findings were included in the comment
 *   - Inline comments on specific lines
 *   - Applied suggestions (one-click applies)
 *   - Comment lifecycle (created, updated, deleted)
 *   - Audit trail for compliance & debugging
 *
 * Used by:
 *   - commentService.ts → create records after posting
 *   - suggestionService.ts → track suggestion applies
 *   - commentController.ts → API endpoints for comment management
 *   - auditService.ts → compliance logging
 *
 * @module models/GitHubComment
 */

import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Inline comment on a specific line (for PR review comments) */
export interface IInlineComment {
  commitSha: string; // Commit hash where comment was posted
  filename: string; // File being commented on
  line: number; // Line number (new file)
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string; // Issue description
  suggestion: string; // Suggested fix
  githubCommentId?: number; // GitHub comment ID if posted
  postedAt?: Date; // When posted to GitHub
  status: 'pending' | 'posted' | 'updated' | 'deleted'; // Lifecycle status
}

/** Applied suggestion (one-click apply) */
export interface IAppliedSuggestion {
  findingId: string; // Reference to finding
  filename: string;
  line: number;
  originalSuggestion: string;
  appliedCode?: string; // Actual code that was applied
  appliedAt: Date;
  appliedBy: Types.ObjectId; // User who applied (if manual)
  autoApplied: boolean; // True if auto-applied by bot
  commitHash?: string; // Commit where suggestion was applied
  status: 'pending' | 'applied' | 'reverted' | 'conflicted';
}

/** Comment lifecycle event for audit trail */
export interface ICommentEvent {
  type:
    | 'created'
    | 'posted'
    | 'updated'
    | 'deleted'
    | 'apply-requested'
    | 'apply-completed';
  timestamp: Date;
  details?: Record<string, unknown>; // Additional metadata
  error?: string; // Error message if failed
}

/** Main GitHub Comment document */
export interface IGitHubComment extends Document {
  // GitHub identifiers
  githubCommentId?: number; // GitHub API comment ID (null until posted)
  githubReviewId?: number; // GitHub API review ID (for review comments)

  // Repository reference
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };

  // PR reference
  prNumber: number;
  prTitle: string;

  // Review reference
  reviewId: Types.ObjectId; // Reference to Review document
  findingsIncluded: string[]; // Finding IDs/descriptions included in comment

  // Comment type
  type: 'review' | 'inline' | 'issue-comment';
  // - 'review': General PR review comment (can have multiple findings)
  // - 'inline': Comment on specific line (single finding)
  // - 'issue-comment': Comment on issue (future: Week 4+)

  // Content
  bodyMarkdown: string; // Full Markdown content posted to GitHub
  summary: {
    findingsCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };

  // Inline comments (for PR review type)
  inlineComments?: IInlineComment[];

  // Applied suggestions tracking
  appliedSuggestions?: IAppliedSuggestion[];

  // Comment lifecycle
  postedAt?: Date; // When successfully posted to GitHub
  updatedAt?: Date; // Last update time
  deletedAt?: Date; // Soft delete timestamp

  // Audit trail
  auditEvents: ICommentEvent[];

  // Error tracking
  lastError?: {
    code: string;
    message: string;
    timestamp: Date;
    retryCount: number;
  };

  // Status tracking
  status: 'draft' | 'pending' | 'posted' | 'failed' | 'archived';
  // - 'draft': Created but not yet posted
  // - 'pending': Queued for posting
  // - 'posted': Successfully posted to GitHub
  // - 'failed': Failed to post (see lastError)
  // - 'archived': Soft deleted

  // Metadata
  metadata?: {
    llmProvider?: string; // Which LLM generated the review
    latencyMs?: number; // Time to generate comment
    confidence?: number; // Overall confidence score
    tags?: string[]; // Custom tags (security, performance, etc.)
  };

  // Timestamps
  createdAt: Date;

  // Methods
  addAuditEvent(
    type: ICommentEvent['type'],
    details?: Record<string, unknown>,
    error?: string,
  ): void;
  markAsPosted(githubCommentId: number): void;
  markAsFailed(code: string, message: string): void;
  applySuggestion(suggestion: IAppliedSuggestion): void;
  getAppliedCount(): number;
  softDelete(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const inlineCommentSchema = new Schema<IInlineComment>(
  {
    commitSha: { type: String, required: true },
    filename: { type: String, required: true },
    line: { type: Number, required: true },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      required: true,
    },
    message: { type: String, required: true },
    suggestion: { type: String, required: true },
    githubCommentId: { type: Number },
    postedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'posted', 'updated', 'deleted'],
      default: 'pending',
    },
  },
  { _id: true },
);

const appliedSuggestionSchema = new Schema<IAppliedSuggestion>(
  {
    findingId: { type: String, required: true },
    filename: { type: String, required: true },
    line: { type: Number, required: true },
    originalSuggestion: { type: String, required: true },
    appliedCode: { type: String },
    appliedAt: { type: Date, required: true },
    appliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    autoApplied: { type: Boolean, default: false },
    commitHash: { type: String },
    status: {
      type: String,
      enum: ['pending', 'applied', 'reverted', 'conflicted'],
      default: 'pending',
    },
  },
  { _id: true },
);

const commentEventSchema = new Schema<ICommentEvent>(
  {
    type: {
      type: String,
      enum: [
        'created',
        'posted',
        'updated',
        'deleted',
        'apply-requested',
        'apply-completed',
      ],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    details: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { _id: true },
);

const githubCommentSchema = new Schema<IGitHubComment>(
  {
    // GitHub identifiers
    githubCommentId: { type: Number, unique: true, sparse: true },
    githubReviewId: { type: Number, index: true },

    // Repository reference
    repository: {
      owner: { type: String, required: true },
      name: { type: String, required: true },
      fullName: { type: String, required: true, index: true },
    },

    // PR reference
    prNumber: { type: Number, required: true, index: true },
    prTitle: { type: String, required: true },

    // Review reference
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
      index: true,
    },
    findingsIncluded: [{ type: String }],

    // Comment type
    type: {
      type: String,
      enum: ['review', 'inline', 'issue-comment'],
      default: 'review',
    },

    // Content
    bodyMarkdown: { type: String, required: true },
    summary: {
      findingsCount: { type: Number, default: 0 },
      criticalCount: { type: Number, default: 0 },
      highCount: { type: Number, default: 0 },
      mediumCount: { type: Number, default: 0 },
      lowCount: { type: Number, default: 0 },
    },

    // Inline comments
    inlineComments: [inlineCommentSchema],

    // Applied suggestions
    appliedSuggestions: [appliedSuggestionSchema],

    // Timestamps
    postedAt: { type: Date },
    updatedAt: { type: Date },
    deletedAt: { type: Date },

    // Audit trail
    auditEvents: {
      type: [commentEventSchema],
      default: [],
    },

    // Error tracking
    lastError: {
      code: { type: String },
      message: { type: String },
      timestamp: { type: Date },
      retryCount: { type: Number, default: 0 },
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending', 'posted', 'failed', 'archived'],
      default: 'draft',
      index: true,
    },

    // Metadata
    metadata: {
      llmProvider: { type: String },
      latencyMs: { type: Number },
      confidence: { type: Number, min: 0, max: 1 },
      tags: [{ type: String }],
    },
  },
  {
    timestamps: true,
    collection: 'github_comments',
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────

// Composite index for quick lookup by PR
githubCommentSchema.index({ 'repository.fullName': 1, prNumber: 1, createdAt: -1 });

// Index for finding comments by review
githubCommentSchema.index({ reviewId: 1, status: 1 });

// Index for finding pending posts
githubCommentSchema.index({ status: 1, createdAt: -1 });

// Index for audit queries
githubCommentSchema.index({ 'auditEvents.type': 1, 'auditEvents.timestamp': -1 });

// ─────────────────────────────────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add an event to the audit trail.
 */
githubCommentSchema.methods.addAuditEvent = function (
  this: IGitHubComment,
  type: ICommentEvent['type'],
  details?: Record<string, unknown>,
  error?: string,
): void {
  this.auditEvents.push({
    type,
    timestamp: new Date(),
    details,
    error,
  });
};

/**
 * Mark comment as successfully posted.
 */
githubCommentSchema.methods.markAsPosted = function (
  this: IGitHubComment,
  githubCommentId: number,
): void {
  this.githubCommentId = githubCommentId;
  this.postedAt = new Date();
  this.status = 'posted';
  this.lastError = undefined;
  this.addAuditEvent('posted', { githubCommentId });
};

/**
 * Mark comment as failed to post.
 */
githubCommentSchema.methods.markAsFailed = function (
  this: IGitHubComment,
  code: string,
  message: string,
): void {
  this.status = 'failed';
  this.lastError = {
    code,
    message,
    timestamp: new Date(),
    retryCount: (this.lastError?.retryCount ?? 0) + 1,
  };
  this.addAuditEvent('posted', undefined, message);
};

/**
 * Apply a suggestion and track it.
 */
githubCommentSchema.methods.applySuggestion = function (
  this: IGitHubComment,
  suggestion: IAppliedSuggestion,
): void {
  if (!this.appliedSuggestions) this.appliedSuggestions = [];
  this.appliedSuggestions.push(suggestion);
  this.addAuditEvent('apply-completed', {
    findingId: suggestion.findingId,
    filename: suggestion.filename,
  });
};

/**
 * Get summary of applied suggestions.
 */
githubCommentSchema.methods.getAppliedCount = function (this: IGitHubComment): number {
  return (this.appliedSuggestions ?? []).filter((s) => s.status === 'applied').length;
};

/**
 * Soft delete the comment.
 */
githubCommentSchema.methods.softDelete = function (this: IGitHubComment): void {
  this.deletedAt = new Date();
  this.status = 'archived';
  this.addAuditEvent('deleted');
};

// ─────────────────────────────────────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find comments by PR (excluding archived).
 */
githubCommentSchema.statics.findByPR = async function (
  fullName: string,
  prNumber: number,
): Promise<IGitHubComment[]> {
  return this.find({
    'repository.fullName': fullName,
    prNumber,
    status: { $ne: 'archived' },
  })
    .sort({ createdAt: -1 })
    .exec();
};

/**
 * Find pending comments (ready to post).
 */
githubCommentSchema.statics.findPending = async function (): Promise<IGitHubComment[]> {
  return this.find({ status: 'pending' }).sort({ createdAt: 1 }).exec();
};

/**
 * Find failed comments for retry.
 */
githubCommentSchema.statics.findFailed = async function (
  maxRetries?: number,
): Promise<IGitHubComment[]> {
  const query: Record<string, unknown> = { status: 'failed' };
  if (maxRetries !== undefined) {
    query['lastError.retryCount'] = { $lt: maxRetries };
  }
  return this.find(query).sort({ 'lastError.timestamp': 1 }).exec();
};

/**
 * Find comments by review.
 */
githubCommentSchema.statics.findByReview = async function (
  reviewId: Types.ObjectId,
): Promise<IGitHubComment[]> {
  return this.find({ reviewId, status: { $ne: 'archived' } })
    .sort({ createdAt: -1 })
    .exec();
};

// ─────────────────────────────────────────────────────────────────────────────
// MODEL
// ─────────────────────────────────────────────────────────────────────────────

export const GitHubComment: Model<IGitHubComment> = mongoose.model<IGitHubComment>(
  'GitHubComment',
  githubCommentSchema,
);
