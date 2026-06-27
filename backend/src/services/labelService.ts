/**
 * @file src/services/labelService.ts
 * @description Auto-labels pull requests based on AI review findings.
 *
 * Label strategy:
 * - security-issue    → any security finding (critical or high)
 * - critical-bug      → critical severity finding of type bug
 * - needs-review      → high-severity findings present
 * - performance-issue → any performance finding
 * - ai-reviewed       → always added when GitGuard completes a review
 * - approved-by-ai    → added when no critical/high findings found (clean PR)
 *
 * Labels are created in the repo automatically if they don't exist yet.
 */

import { Octokit } from '@octokit/rest';
import { createOctokitClient } from '../github/octokitClient';
import { IFinding } from '../models/Review';
import { logger } from '../lib/logger';

// ─── Label Definitions ────────────────────────────────────────────────────────

export interface LabelDefinition {
  name: string;
  color: string; // Hex without #
  description: string;
}

/** All labels GitGuard AI may apply, with their colours and descriptions */
export const GITGUARD_LABELS: Record<string, LabelDefinition> = {
  'ai-reviewed': {
    name: 'ai-reviewed',
    color: '0075ca',
    description: 'Reviewed by GitGuard AI',
  },
  'security-issue': {
    name: 'security-issue',
    color: 'd73a4a',
    description: 'Security vulnerability detected by GitGuard AI',
  },
  'critical-bug': {
    name: 'critical-bug',
    color: 'b60205',
    description: 'Critical bug detected by GitGuard AI',
  },
  'needs-review': {
    name: 'needs-review',
    color: 'e4e669',
    description: 'High-severity issues require human review',
  },
  'performance-issue': {
    name: 'performance-issue',
    color: 'f9d0c4',
    description: 'Performance issues detected by GitGuard AI',
  },
  'approved-by-ai': {
    name: 'approved-by-ai',
    color: '0e8a16',
    description: 'No critical/high issues found — approved by GitGuard AI',
  },
};

export interface LabelResult {
  labelsApplied: string[];
  labelsRemoved: string[];
  labelsCreated: string[];
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Applies the appropriate labels to a PR based on its findings.
 *
 * @param token     - GitHub PAT or installation token
 * @param owner     - Repository owner
 * @param repo      - Repository name
 * @param prNumber  - Pull request number
 * @param findings  - All analysis findings for this PR
 * @param eventId   - Correlation ID for logging
 */
export async function applyPRLabels(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  findings: IFinding[],
  eventId: string,
): Promise<LabelResult> {
  const log = logger.child({ module: 'labelService', eventId, owner, repo, prNumber });
  const octokit = createOctokitClient(token);

  log.info({ findingsCount: findings.length }, 'Computing PR labels');

  // ── Determine which labels to apply ──────────────────────────────────
  const labelsToApply = computeLabels(findings);
  const labelsToRemove = computeLabelsToRemove(labelsToApply);

  log.info({ labelsToApply, labelsToRemove }, 'Label decision made');

  // ── Ensure all labels exist in the repo ──────────────────────────────
  const labelsCreated = await ensureLabelsExist(octokit, owner, repo, labelsToApply, log);

  // ── Apply labels to the PR ───────────────────────────────────────────
  if (labelsToApply.length > 0) {
    try {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: labelsToApply,
      });
      log.info({ labelsApplied: labelsToApply }, 'Labels applied to PR');
    } catch (err) {
      log.error({ error: err }, 'Failed to apply labels');
    }
  }

  // ── Remove conflicting labels ─────────────────────────────────────────
  const removedLabels: string[] = [];
  for (const label of labelsToRemove) {
    try {
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: prNumber,
        name: label,
      });
      removedLabels.push(label);
    } catch {
      // Label may not be present — ignore 404
    }
  }

  return {
    labelsApplied: labelsToApply,
    labelsRemoved: removedLabels,
    labelsCreated,
  };
}

// ─── Label Logic ──────────────────────────────────────────────────────────────

/**
 * Determines which GitGuard labels to apply based on findings.
 */
function computeLabels(findings: IFinding[]): string[] {
  const labels: string[] = [];

  // Always mark as AI-reviewed
  labels.push('ai-reviewed');

  const hasCritical = findings.some((f) => f.severity === 'critical');
  const hasHigh = findings.some((f) => f.severity === 'high');
  const hasSecurity = findings.some(
    (f) => f.severity === 'critical' || f.severity === 'high',
  );
  const hasPerf = findings.some(
    (f) =>
      f.message.toLowerCase().includes('performance') ||
      f.message.toLowerCase().includes('n+1') ||
      f.message.toLowerCase().includes('memory'),
  );

  if (hasCritical) labels.push('critical-bug');
  if (hasSecurity) labels.push('security-issue');
  if (hasHigh) labels.push('needs-review');
  if (hasPerf) labels.push('performance-issue');

  // Clean PR — no critical or high issues
  if (!hasCritical && !hasHigh) {
    labels.push('approved-by-ai');
  }

  return [...new Set(labels)]; // Deduplicate
}

/**
 * Returns labels that should be removed to avoid contradictions.
 * e.g. if we apply security-issue, remove approved-by-ai.
 */
function computeLabelsToRemove(labelsToApply: string[]): string[] {
  const toRemove: string[] = [];

  if (
    labelsToApply.includes('security-issue') ||
    labelsToApply.includes('critical-bug')
  ) {
    toRemove.push('approved-by-ai');
  }
  if (labelsToApply.includes('approved-by-ai')) {
    toRemove.push('needs-review', 'security-issue', 'critical-bug');
  }

  return toRemove;
}

/**
 * Ensures all GitGuard labels exist in the repository.
 * Creates them with the correct colour and description if missing.
 * Silently ignores 422 (already exists) responses.
 */
async function ensureLabelsExist(
  octokit: Octokit,
  owner: string,
  repo: string,
  labels: string[],
  log: Pick<ReturnType<typeof logger.child>, 'info' | 'warn' | 'error' | 'debug'>,
): Promise<string[]> {
  const created: string[] = [];

  for (const labelName of labels) {
    const def = GITGUARD_LABELS[labelName];
    if (!def) continue;

    try {
      await octokit.rest.issues.createLabel({
        owner,
        repo,
        name: def.name,
        color: def.color,
        description: def.description,
      });
      created.push(labelName);
      log.debug({ label: labelName }, 'Label created in repo');
    } catch (err: unknown) {
      // 422 = label already exists — expected on subsequent runs
      const status = (err as { status?: number }).status;
      if (status !== 422) {
        log.warn({ label: labelName, error: err }, 'Failed to create label');
      }
    }
  }

  return created;
}
