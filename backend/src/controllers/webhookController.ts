/**
 * @file src/controllers/webhookController.ts
 * @description Express controller for the GitHub webhook endpoint.
 *
 * Orchestrates the full webhook processing pipeline:
 * 1. Validate HMAC signature
 * 2. Check GitHub event type header
 * 3. Parse + validate payload
 * 4. Process the event (service layer)
 * 5. Write audit log
 * 6. Return structured response
 */

import { Request, Response, NextFunction } from 'express';
import { validateWebhookSignature } from '../github/signatureValidator';
import { parsePullRequestEvent } from '../github/eventParser';
import { processWebhookEvent } from '../services/webhookService';
import { auditSuccess, auditFailure, auditIgnored } from '../audit/auditService';
import { createRequestLogger } from '../lib/logger';
import { ApiResponse } from '../types/github';

/**
 * POST /api/webhooks/github
 *
 * Main GitHub webhook handler.
 * All errors are forwarded to the global error handler via next().
 */
export async function handleGithubWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const reqLogger = createRequestLogger(req.id);

  reqLogger.info('Received GitHub webhook request');

  try {
    // ── Step 1: Validate HMAC-SHA256 signature ────────────────────────
    // This MUST happen before any payload processing.
    // If invalid, we log the failure and reject with 403.
    const signature = req.headers['x-hub-signature-256'] as string | undefined;

    validateWebhookSignature(signature, req.rawBody);

    reqLogger.info('Webhook signature validated');

    // ── Step 2: Check event type ──────────────────────────────────────
    // We only process pull_request events. Other events get a 200 OK
    // so GitHub doesn't retry them, but we don't process them.
    const githubEvent = req.headers['x-github-event'] as string | undefined;

    if (!githubEvent) {
      reqLogger.warn('Missing x-github-event header');
      res.status(200).json({
        success: true,
        message: 'Event received but missing event type header',
      } satisfies ApiResponse);
      return;
    }

    if (githubEvent !== 'pull_request') {
      reqLogger.info({ githubEvent }, 'Non-pull_request event — ignoring');

      await auditIgnored(req, githubEvent);

      res.status(200).json({
        success: true,
        message: `Event type '${githubEvent}' is not supported`,
      } satisfies ApiResponse);
      return;
    }

    // ── Step 3: Parse and validate payload ───────────────────────────
    const event = parsePullRequestEvent(req.body);

    // null = valid payload but unsupported action (e.g. 'closed', 'labeled')
    if (event === null) {
      const action = (req.body as { action?: string })?.action ?? 'unknown';
      reqLogger.info({ action }, 'Unsupported PR action — ignoring');

      await auditIgnored(req, action);

      res.status(200).json({
        success: true,
        message: `Pull request action '${action}' is not processed`,
      } satisfies ApiResponse);
      return;
    }

    reqLogger.info(
      {
        eventId: event.eventId,
        action: event.action,
        repo: event.repository.fullName,
        pr: event.pullRequest.number,
      },
      'Parsed PR event',
    );

    // ── Step 4: Process the event ────────────────────────────────────
    const result = await processWebhookEvent(event);

    // ── Step 5: Write audit log ──────────────────────────────────────
    await auditSuccess(req, event);

    // ── Step 6: Respond ──────────────────────────────────────────────
    const response: ApiResponse = {
      success: true,
      message: result.message,
      eventId: result.eventId,
    };

    res.status(200).json(response);
  } catch (error) {
    // Write failure audit log (fire-and-forget, non-blocking)
    void auditFailure(req, 'webhook_received', error, {
      githubEvent: req.headers['x-github-event'] as string | undefined,
      githubAction: (req.body as { action?: string })?.action,
    });

    // Forward to global error handler
    next(error);
  }
}
