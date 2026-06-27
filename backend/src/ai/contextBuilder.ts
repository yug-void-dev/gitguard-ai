/**
 * @file src/ai/contextBuilder.ts
 * @description Assembles a rich PRContext object from a PullRequestEvent.
 *
 * System Design Rationale:
 * ─────────────────────────
 * The LLM produces better, more relevant analysis when it understands the
 * *intent* of a PR — not just the raw diff. This module extracts:
 *
 *  • Linked GitHub issues ("Fixes #42", "Closes #7")
 *  • PR description narrative
 *  • Branch context (feature → main? hotfix → release?)
 *  • Repository language & scale (changedFiles, additions, deletions)
 *
 * The assembled PRContext is injected at the top of every LLM prompt and
 * is also stored alongside the job payload in BullMQ for auditability.
 *
 * @module ai/contextBuilder
 */

import { PullRequestEvent } from '../types/github';
import { PRContext } from '../types/analysis';
import { logger } from '../lib/logger';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Regex patterns for extracting GitHub issue references.
 * Matches: "Fixes #42", "Closes #7", "Resolves #100", "Related to #5" etc.
 */
const ISSUE_REF_PATTERNS: RegExp[] = [
  /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|ref(?:erence[sd]?)?|related\s+to)\s+#(\d+)/gi,
  /#(\d+)/g, // fallback: any bare #N reference
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds a PRContext from a validated PullRequestEvent.
 *
 * Pure function — no side-effects, no network calls.
 *
 * @param event - The validated PullRequestEvent from the webhook pipeline
 * @returns A fully-populated PRContext for injection into the LLM prompt
 */
export function buildPRContext(event: PullRequestEvent): PRContext {
  const log = logger.child({
    module: 'contextBuilder',
    eventId: event.eventId,
    prNumber: event.pullRequest.number,
  });

  log.debug('Assembling PR context');

  const linkedIssues = extractLinkedIssues(event.pullRequest.body);

  const context: PRContext = {
    prNumber: event.pullRequest.number,
    title: event.pullRequest.title,
    description: event.pullRequest.body,
    linkedIssues,
    headBranch: event.pullRequest.headRef,
    baseBranch: event.pullRequest.baseRef,
    language: event.repository.language,
    changedFiles: event.pullRequest.changedFiles,
    additions: event.pullRequest.additions,
    deletions: event.pullRequest.deletions,
    isDraft: event.pullRequest.isDraft,
    repositoryFullName: event.repository.fullName,
    authorLogin: event.sender.login,
  };

  log.info(
    {
      linkedIssues: context.linkedIssues,
      changedFiles: context.changedFiles,
      additions: context.additions,
      deletions: context.deletions,
      language: context.language,
    },
    'PR context assembled',
  );

  return context;
}

/**
 * Formats a PRContext into a human-readable Markdown block suitable for
 * insertion at the top of an LLM prompt.
 *
 * @param ctx - The assembled PRContext
 * @returns Markdown-formatted context string
 */
export function formatContextForPrompt(ctx: PRContext): string {
  const lines: string[] = [
    '## Pull Request Context',
    '',
    `**Repository:** \`${ctx.repositoryFullName}\``,
    `**PR #${ctx.prNumber}:** ${ctx.title}`,
    `**Author:** @${ctx.authorLogin}`,
    `**Branch:** \`${ctx.headBranch}\` → \`${ctx.baseBranch}\``,
    `**Language:** ${ctx.language ?? 'Unknown'}`,
    `**Changes:** ${ctx.changedFiles} files, +${ctx.additions} / -${ctx.deletions} lines`,
  ];

  if (ctx.isDraft) {
    lines.push('**Status:** 📝 Draft PR');
  }

  if (ctx.linkedIssues.length > 0) {
    lines.push(`**Linked Issues:** ${ctx.linkedIssues.map((n) => `#${n}`).join(', ')}`);
  }

  if (ctx.description) {
    const truncated =
      ctx.description.length > 500
        ? ctx.description.slice(0, 500) + '…'
        : ctx.description;
    lines.push('', '**Description:**', truncated);
  }

  lines.push('', '---', '');

  return lines.join('\n');
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Extracts linked GitHub issue numbers from a PR body.
 * Returns a de-duplicated, sorted array of issue numbers.
 *
 * @param body - The raw PR description (may be null)
 * @returns Array of issue numbers, e.g. [7, 42, 100]
 */
function extractLinkedIssues(body: string | null): number[] {
  if (!body) return [];

  const found = new Set<number>();

  // Use the more specific patterns first
  for (const pattern of ISSUE_REF_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        found.add(num);
      }
    }

    // Stop after the first pattern finds results (more specific wins)
    if (found.size > 0) break;
  }

  return [...found].sort((a, b) => a - b);
}
