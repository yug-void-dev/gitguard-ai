/**
 * @file src/lib/errors.ts
 * @description Centralized application error hierarchy.
 *
 * All custom errors extend AppError so the global error handler
 * can distinguish operational errors (expected, safe to report)
 * from programmer errors (unexpected, should alert).
 */

/** HTTP status codes used by this application */
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

/**
 * Base class for all operational application errors.
 * Operational = predictable, safe to surface to the client.
 */
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

    // Restore prototype chain (required when extending built-in classes in TS)
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace, excluding the constructor itself
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Webhook Errors ──────────────────────────────────────────────────────────

/**
 * Thrown when the x-hub-signature-256 header is missing or invalid.
 *
 * Security note: We return 403 (not 401) and a generic message
 * to avoid leaking information about signature format/algorithm.
 */
export class WebhookSignatureError extends AppError {
  constructor(message = 'Invalid or missing webhook signature') {
    super(message, HttpStatus.FORBIDDEN, 'WEBHOOK_SIGNATURE_INVALID');
  }
}

/**
 * Thrown when the webhook payload cannot be parsed or is structurally invalid.
 */
export class WebhookPayloadError extends AppError {
  constructor(message = 'Invalid webhook payload') {
    super(message, HttpStatus.BAD_REQUEST, 'WEBHOOK_PAYLOAD_INVALID');
  }
}

/**
 * Thrown for unsupported GitHub event types or actions.
 */
export class WebhookEventNotSupportedError extends AppError {
  constructor(eventType: string, action?: string) {
    const detail = action ? `${eventType}:${action}` : eventType;
    super(
      `Unsupported webhook event: ${detail}`,
      HttpStatus.OK, // Return 200 so GitHub doesn't retry unsupported events
      'WEBHOOK_EVENT_NOT_SUPPORTED',
    );
  }
}

// ─── Validation Errors ───────────────────────────────────────────────────────

/**
 * Thrown when request data fails Zod validation.
 */
export class ValidationError extends AppError {
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR');
    this.details = details;
  }
}

// ─── Authentication Errors ───────────────────────────────────────────────────

/**
 * Thrown when authentication fails (e.g. invalid JWT, failed OAuth).
 */
export class AuthError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, HttpStatus.UNAUTHORIZED, 'AUTH_ERROR');
  }
}

// ─── Database Errors ─────────────────────────────────────────────────────────

/**
 * Thrown when a database operation fails.
 * The original error is NOT forwarded to the client.
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
  }
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

/** Narrows an unknown value to AppError */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Narrows an unknown value to a standard Error */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
