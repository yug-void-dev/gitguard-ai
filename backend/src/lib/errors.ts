/**
 * @file src/lib/errors.ts
 * @description Centralized application error hierarchy.
 */

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

/** Base class for all operational application errors. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Webhook Errors ───────────────────────────────────────────────────────────

/**
 * Thrown when x-hub-signature-256 is missing or invalid.
 * Returns 403 with a generic message — never leaks which check failed.
 */
export class WebhookSignatureError extends AppError {
  constructor(message = 'Invalid or missing webhook signature') {
    super(message, HttpStatus.FORBIDDEN, 'WEBHOOK_SIGNATURE_INVALID');
  }
}

/** Thrown when the webhook payload fails Zod validation. */
export class WebhookPayloadError extends AppError {
  constructor(message = 'Invalid webhook payload') {
    super(message, HttpStatus.BAD_REQUEST, 'WEBHOOK_PAYLOAD_INVALID');
  }
}

/**
 * Thrown for unsupported GitHub event types or actions.
 * Returns 200 so GitHub does NOT retry the event.
 */
export class WebhookEventNotSupportedError extends AppError {
  constructor(eventType: string, action?: string) {
    const detail = action ? `${eventType}:${action}` : eventType;
    super(`Unsupported webhook event: ${detail}`, HttpStatus.OK, 'WEBHOOK_EVENT_NOT_SUPPORTED');
  }
}

// ─── Validation Errors ────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  public readonly details: unknown;
  constructor(message: string, details?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR');
    this.details = details;
  }
}

// ─── Auth Errors ──────────────────────────────────────────────────────────────

/** Thrown when authentication fails (invalid token, missing session, OAuth error). */
export class AuthError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, HttpStatus.UNAUTHORIZED, 'AUTH_ERROR');
  }
}

// ─── Database Errors ──────────────────────────────────────────────────────────

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
  }
}

// ─── Queue Errors ───────────────────────────────────────────────────

/** Thrown when a BullMQ queue operation fails (enqueue, connection, etc.) */
export class QueueError extends AppError {
  constructor(message = 'Queue operation failed') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'QUEUE_ERROR');
  }
}

// ─── AI / LLM Errors ─────────────────────────────────────────────────

/**
 * Thrown when an LLM API call fails after all retries are exhausted.
 * Wraps the underlying network/HTTP error.
 */
export class LLMError extends AppError {
  public readonly provider: string;
  constructor(provider: string, message?: string) {
    super(
      message ?? `LLM API call to ${provider} failed after retries`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'LLM_ERROR',
    );
    this.provider = provider;
  }
}

/** Thrown when prompt injection is detected in a diff */
export class PromptInjectionError extends AppError {
  constructor(patternsRemoved: number) {
    super(
      `Prompt injection detected: ${patternsRemoved} pattern(s) removed`,
      HttpStatus.BAD_REQUEST,
      'PROMPT_INJECTION_DETECTED',
    );
  }
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
