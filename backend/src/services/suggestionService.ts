/**
 * @file src/services/suggestionService.ts
 * @description One-click suggestion apply support.
 *
 * GitHub supports a special ```suggestion``` code block in PR review comments.
 * When a reviewer writes:
 *
 *   ```suggestion
 *   const fixed = value ?? defaultValue;
 *   ```
 *
 * GitHub renders a "Commit suggestion" button that the PR author can click to
 * apply the fix directly as a commit — no checkout required.
 *
 * This service:
 * 1. Detects whether a finding's suggestion is a code snippet (apply-able)
 * 2. Formats it as a proper GitHub suggestion block
 * 3. Posts it as an inline comment on the correct line
 * 4. Handles multi-line suggestion formatting
 */

import { createOctokitClient } from '../github/octokitClient';
import { IFinding } from '../models/Review';
import { logger } from '../lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuggestionResult {
  suggestionsPosted: number;
  skipped: number;
  commentIds: number[];
}

export interface PostSuggestionsOptions {
  token: string;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  findings: IFinding[];
  eventId: string;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Posts one-click suggestion comments for findings that have code fixes.
 *
 * Only posts suggestions for critical + high severity findings where the
 * suggestion field contains actual code (not just a description).
 */
export async function postSuggestions(
  options: PostSuggestionsOptions,
): Promise<SuggestionResult> {
  const { token, owner, repo, prNumber, headSha, findings, eventId } = options;
  const log = logger.child({ module: 'suggestionService', eventId, owner, repo, prNumber });

  const octokit = createOctokitClient(token);

  // Filter to findings that have apply-able code suggestions
  const actionableFindings = findings.filter(
    (f) =>
      (f.severity === 'critical' || f.severity === 'high') &&
      f.line > 0 &&
      isSuggestionApplicable(f.suggestion),
  );

  log.info(
    { totalFindings: findings.length, actionable: actionableFindings.length },
    'Posting one-click suggestions',
  );

  const commentIds: number[] = [];
  let skipped = 0;

  for (const finding of actionableFindings) {
    try {
      const body = buildSuggestionComment(finding);

      const { data: comment } = await octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        commit_id: headSha,
        path: finding.file,
        line: finding.line,
        side: 'RIGHT',
        body,
      });

      commentIds.push(comment.id);
      log.debug({ file: finding.file, line: finding.line, commentId: comment.id }, 'Suggestion posted');

    } catch (err) {
      log.warn({ file: finding.file, line: finding.line, error: err }, 'Skipped suggestion — line may be outside diff');
      skipped++;
    }
  }

  log.info({ posted: commentIds.length, skipped }, 'Suggestions posting complete');

  return {
    suggestionsPosted: commentIds.length,
    skipped,
    commentIds,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determines whether a suggestion string contains actual code
 * that can be rendered as a GitHub suggestion block.
 *
 * Heuristics:
 * - Contains code-like characters (braces, semicolons, arrows)
 * - Is not just a plain English sentence
 * - Has at least one newline OR is a single-line code expression
 */
function isSuggestionApplicable(suggestion: string): boolean {
  if (!suggestion || suggestion.length < 5) return false;

  // If it already contains a markdown code fence — extract the code
  if (suggestion.includes('```')) return true;

  // Code pattern heuristics
  const codePatterns = [
    /[{};()=>]/, // Brackets, semicolons, arrows
    /const |let |var |return |function |async |await /,
    /\.\w+\(/, // Method calls
    /import |export /,
  ];

  return codePatterns.some((p) => p.test(suggestion));
}

/**
 * Builds the full Markdown comment body for a one-click suggestion.
 *
 * Format:
 *   🟠 HIGH | Confidence: 85%
 *
 *   **Issue:** JWT secret not validated
 *
 *   **Apply this fix with one click:**
 *   ```suggestion
 *   const secret = process.env.JWT_SECRET;
 *   if (!secret || secret.length < 32) throw new Error('...');
 *   ```
 */
function buildSuggestionComment(finding: IFinding): string {
  const severityEmoji: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '⚪', info: '🔵',
  };
  const emoji = severityEmoji[finding.severity] ?? '❓';

  // Extract code from suggestion (strip any existing fences)
  const codeBlock = extractCode(finding.suggestion);

  const lines = [
    `${emoji} **${finding.severity.toUpperCase()}** — Confidence: ${Math.round(finding.confidence * 100)}%`,
    '',
    `**Issue:** ${finding.message}`,
    '',
    '**Apply this fix with one click:**',
    '```suggestion',
    codeBlock,
    '```',
    '',
    '_Powered by [GitGuard AI](https://gitguard.local) 🤖_',
  ];

  return lines.join('\n');
}

/**
 * Extracts the code content from a suggestion string.
 * Strips existing markdown fences if present.
 */
function extractCode(suggestion: string): string {
  // Strip existing code fences
  const fenceMatch = /```(?:\w+)?\n([\s\S]+?)\n```/.exec(suggestion);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  // Strip inline backticks
  const inlineMatch = /`([^`]+)`/.exec(suggestion);
  if (inlineMatch?.[1]) return inlineMatch[1];

  // Return the suggestion as-is (likely already clean code)
  return suggestion.trim();
}
