/**
 * @file src/github/eventParser.ts
 * @description Parses and validates raw GitHub webhook payloads into clean
 * internal PullRequestEvent objects.
 *
 * Uses Zod for runtime validation so we catch unexpected payload shapes
 * early (GitHub occasionally changes their payload format).
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  GitHubWebhookPayload,
  PullRequestEvent,
  PullRequestAction,
} from '../types/github';
import {
  WebhookPayloadError,
} from '../lib/errors';

/** Actions we actively process — all others are acknowledged but ignored */
const SUPPORTED_ACTIONS: ReadonlySet<PullRequestAction> = new Set([
  'opened',
  'synchronize',
  'reopened',
]);

// ─── Zod Validation Schema ────────────────────────────────────────────────────

/** Minimal Zod schema for the fields we actually use */
const githubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string(),
  type: z.string(),
});

const githubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  html_url: z.string(),
  default_branch: z.string(),
  language: z.string().nullable(),
  owner: githubUserSchema,
});

const githubRefSchema = z.object({
  ref: z.string(),
  sha: z.string(),
});

const githubPullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  state: z.enum(['open', 'closed']),
  title: z.string(),
  body: z.string().nullable(),
  html_url: z.string(),
  diff_url: z.string(),
  draft: z.boolean().default(false),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changed_files: z.number().default(0),
  commits: z.number().default(0),
  head: githubRefSchema,
  base: githubRefSchema,
  created_at: z.string(),
  updated_at: z.string(),
  user: githubUserSchema,
});

/**
 * Comprehensive Zod schema validating the entire webhook payload from GitHub.
 * Protects the internal system from malformed, malicious, or unexpectedly altered
 * data structures originating from unverified webhook deliveries.
 */
const webhookPayloadSchema = z.object({
  action: z.string(),
  number: z.number(),
  rawDiff: z.string().optional(),
  pull_request: githubPullRequestSchema,
  repository: githubRepoSchema,
  sender: githubUserSchema,
});

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Validates a raw webhook payload and transforms it into a PullRequestEvent.
 *
 * @param rawPayload - The parsed JSON body from Express
 * @returns A clean, typed PullRequestEvent ready for service processing
 * @throws {WebhookPayloadError} if the payload shape is invalid
 * @throws {WebhookEventNotSupportedError} if the action is not in SUPPORTED_ACTIONS
 */
export function parsePullRequestEvent(
  rawPayload: unknown,
): PullRequestEvent | null {
  // ── Validate payload structure ────────────────────────────────────────
  const parseResult = webhookPayloadSchema.safeParse(rawPayload);

  if (!parseResult.success) {
    const issues = parseResult.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');

    throw new WebhookPayloadError(`Payload validation failed: ${issues}`);
  }

  const payload = parseResult.data as GitHubWebhookPayload;

  // ── Filter unsupported actions ────────────────────────────────────────
  // Return null for unsupported actions (we'll respond 200 OK but do nothing)
  // This is intentional: GitHub shouldn't retry events we don't care about.
  if (!SUPPORTED_ACTIONS.has(payload.action as PullRequestAction)) {
    return null;
  }

  const pr = payload.pull_request;
  const repo = payload.repository;

  // ── Build internal event object ───────────────────────────────────────
  const event: PullRequestEvent = {
    eventId: uuidv4(),
    action: payload.action as PullRequestAction,
    rawDiff: payload.rawDiff,

    pullRequest: {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      htmlUrl: pr.html_url,
      diffUrl: pr.diff_url,
      state: pr.state,
      isDraft: pr.draft,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      commits: pr.commits,
      headRef: pr.head.ref,
      headSha: pr.head.sha,
      baseRef: pr.base.ref,
      baseSha: pr.base.sha,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
    },

    repository: {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch,
      language: repo.language,
      ownerLogin: repo.owner.login,
    },

    sender: {
      login: payload.sender.login,
      id: payload.sender.id,
      avatarUrl: payload.sender.avatar_url,
      type: payload.sender.type,
    },

    receivedAt: new Date(),
  };

  return event;
}
