/**
 * @file src/queue/reviewWorker.ts
 * @description BullMQ Worker — processes AI code review jobs from the review-pr queue.
 *
 * System Design Rationale:
 * ─────────────────────────
 * The Worker is the heart of the analysis pipeline. Each job it processes
 * runs the full Week-2 pipeline in sequence:
 *
 *   1. contextBuilder      — assemble rich PR context
 *   2. promptSanitizer     — strip injection patterns, chunk the diff
 *   3. llmRouter           — send to LLM, get structured findings (Teammate B)
 *   4. suggestionEnricher  — add test skeletons + refactoring hints
 *   5. vulnerabilityScanner — check changed deps against OSS Index
 *   6. Persist to MongoDB  — update Review document with results
 *
 * Each stage is wrapped in measureStage() for latency tracking.
 *
 * Concurrency: set to 2 — processes 2 PRs in parallel.
 * BullMQ handles job locking so no two workers process the same job.
 *
 * Error handling:
 *   BullMQ auto-retries failed jobs (up to 3×, exponential backoff).
 *   Any unhandled error in processJob() marks the job as failed.
 *
 * @module queue/reviewWorker
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis-config';
import { REVIEW_QUEUE_NAME } from './reviewQueue';
import { measureStage } from './queueMetrics';
import { enrichFindings } from '../ai/suggestionEnricher';
import { scanDiffForVulnerabilities } from '../ai/vulnerabilityScanner';
import { Review, IFinding } from '../models/Review';
import { GitHubComment } from '../models/GitHubComment';
import { logger } from '../lib/logger';
import { ReviewJobPayload, AnalysisFinding } from '../types/analysis';
import { processDiff } from '../github/diffProcessor';
import { routeToLLM } from '../llm/llmRouter';
import { broadcastReviewEvent } from '../websocket';
import {
  loadActiveRule,
  filterFindings,
  scanDiffForCustomPatterns,
} from '../services/ruleEngine';
import { computeEnhancedMetrics } from '../services/codeQualityService';
import { postReviewComment } from '../services/commentService';
import { postInlineSuggestions } from '../services/suggestionService';
import { User } from '../models/User';
import { Repository } from '../models/Repository';
import { NotificationSettings } from '../models/NotificationSettings';
import { createOctokitClient, fetchRawDiff } from '../github/octokitClient';
import { dispatchNotifications } from '../services/slackDiscordService';
import axios from 'axios';
import pino from 'pino';
import { applyPRLabels } from '../services/labelService';
import { DIFF_PROCESSING, QUEUE_CONFIG } from '../config/constants';

// ─── Configuration ────────────────────────────────────────────────────────────

/** Number of jobs processed in parallel by this worker */
const WORKER_CONCURRENCY = 2;

// ─── Worker Singleton ─────────────────────────────────────────────────────────

let _worker: Worker<ReviewJobPayload> | null = null;

/**
 * Creates and starts the BullMQ review worker.
 * Safe to call multiple times — returns the existing worker if already started.
 */
export function startWorker(): Worker<ReviewJobPayload> {
  if (_worker) return _worker;

  _worker = new Worker<ReviewJobPayload>(REVIEW_QUEUE_NAME, processJob, {
    connection: getRedisConnection(),
    concurrency: WORKER_CONCURRENCY,
  });

  _worker.on('completed', (job) => {
    logger.info(
      { jobId: job.id, prNumber: job.data.prNumber, repo: job.data.repositoryFullName },
      '✅ Review job completed',
    );
  });

  _worker.on('failed', async (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        prNumber: job?.data.prNumber,
        repo: job?.data.repositoryFullName,
        error: error.message,
        attemptsMade: job?.attemptsMade,
      },
      '❌ Review job failed',
    );

    if (job) {
      const { repositoryFullName, prNumber } = job.data;
      try {
        const failedReview = await Review.findOneAndUpdate(
          {
            'repository.fullName': repositoryFullName,
            prNumber,
          },
          {
            $set: {
              status: 'failed',
              summary: `Analysis failed: ${error.message || 'Unknown queue error'}`,
            },
          },
          { upsert: true, new: true },
        );

        if (failedReview) {
          broadcastReviewEvent({
            type: 'review:failed',
            payload: failedReview.toJSON(),
            timestamp: new Date().toISOString(),
          });

          try {
            const repoDoc = await Repository.findOne({ fullName: repositoryFullName });
            if (repoDoc) {
              const settingsList = await NotificationSettings.find({
                userId: repoDoc.ownerId,
              });
              await dispatchNotifications(settingsList, 'reviewFailed', {
                title: `❌ Review Failed: ${repositoryFullName}#${prNumber}`,
                message: `The GitGuard AI review failed to complete: ${error.message}`,
                color: '#ff0000',
              });
            }
          } catch (notifErr) {
            logger.error({ err: notifErr }, 'Failed to dispatch failure notification');
          }
        }
      } catch (err) {
        logger.error({ err }, 'Failed to save and broadcast review failure event');
      }
    }
  });

  _worker.on('error', (error) => {
    logger.error({ error }, 'BullMQ Worker error');
  });

  logger.info(
    { queue: REVIEW_QUEUE_NAME, concurrency: WORKER_CONCURRENCY },
    '🚀 Review worker started',
  );

  return _worker;
}

/**
 * Gracefully stops the worker.
 * Waits for in-flight jobs to complete before closing.
 */
export async function stopWorker(): Promise<void> {
  if (_worker) {
    logger.info('Draining review worker — waiting for in-flight jobs…');
    await _worker.close();
    _worker = null;
    logger.info('Review worker stopped');
  }
}

// ─── Job Processor ────────────────────────────────────────────────────────────

/**
 * Core job processing function. Called by BullMQ for each dequeued job.
 *
 * @param job - The BullMQ Job containing a ReviewJobPayload
 */
async function processJob(job: Job<ReviewJobPayload>): Promise<void> {
  const { eventId, repositoryFullName, prNumber, diffUrl, context } = job.data;
  const jobId = job.id ?? eventId;

  const log = logger.child({ jobId, eventId, repository: repositoryFullName, prNumber });

  log.info('📥 Processing review job');

  // Try to retrieve repository user access token for authenticated requests (handles private repos)
  const [owner, repoName] = repositoryFullName.split('/');
  let accessToken: string | null = null;
  try {
    const repoDoc = await Repository.findOne({ fullName: repositoryFullName });
    if (repoDoc) {
      const user = await User.findById(repoDoc.ownerId).select('+accessToken');
      if (user?.accessToken) {
        accessToken = user.accessToken;
      }
    }
  } catch (dbErr) {
    log.error({ err: dbErr }, 'Failed to query database for repository/user token');
  }

  // ── Stage 1: Fetch or Use raw diff ──────────────────────────────────
  const rawDiff = await measureStage(
    'fetch-diff',
    jobId,
    repositoryFullName,
    async () => {
      if (job.data.rawDiff) {
        log.info('Using rawDiff provided in job payload');
        return job.data.rawDiff;
      }
      if (accessToken) {
        log.info('Fetching authenticated PR diff via Octokit');
        const octokit = createOctokitClient(accessToken);
        return fetchRawDiff(octokit, owner, repoName, prNumber);
      }
      log.info('Fetching unauthenticated PR diff via axios');
      return fetchDiff(diffUrl, log);
    },
  );

  // ── Stage 2: Process and chunk the diff ─────────────────────────────
  const processedDiff = await measureStage(
    'process-diff',
    jobId,
    repositoryFullName,
    async () => processDiff(rawDiff, context, eventId),
  );

  log.info(
    {
      fileCount: processedDiff.allFiles.length,
      chunkCount: processedDiff.chunks.length,
    },
    'Diff processed and chunked',
  );

  // Load active rule spec early so we can pass AI provider preferences
  const activeRuleSpec = await loadActiveRule(repositoryFullName);

  // ── Stage 3: LLM Analysis ───────────────────────────────────────────
  const llmResult = await measureStage(
    'llm-analysis',
    jobId,
    repositoryFullName,
    async () =>
      routeToLLM({
        chunks: processedDiff.chunks,
        context,
        eventId,
        ruleSpec: activeRuleSpec,
      }),
  );

  const rawFindings = llmResult.findings;
  log.info(
    {
      findingsCount: rawFindings.length,
      model: llmResult.modelUsed,
      latency: llmResult.latencyMs,
    },
    'LLM analysis complete',
  );

  // ── Stage 4: Enrich findings with test + refactoring suggestions ──────
  const enrichedFindings = await measureStage(
    'enrich-findings',
    jobId,
    repositoryFullName,
    async () => enrichFindings(rawFindings, eventId),
  );

  // ── Stage 5: Vulnerability scan ───────────────────────────────────────
  const vulnerabilities = await measureStage(
    'vulnerability-scan',
    jobId,
    repositoryFullName,
    () => scanDiffForVulnerabilities(rawDiff, eventId),
  );

  log.info(
    { vulnerabilitiesFound: vulnerabilities.length },
    'Vulnerability scan complete',
  );

  // ── Stage 6: Apply repository rule engine filtering (Teammate B) ───────
  const filterResult = await measureStage(
    'rule-filter',
    jobId,
    repositoryFullName,
    async () => {
      const result = filterFindings(enrichedFindings, activeRuleSpec);
      const customFindings = scanDiffForCustomPatterns(rawDiff, activeRuleSpec);
      result.filteredFindings = [...result.filteredFindings, ...customFindings];
      return result;
    },
  );

  const filteredFindings = filterResult.filteredFindings;
  log.info(
    {
      originalCount: enrichedFindings.length,
      filteredCount: filteredFindings.length,
      suppressedCount: filterResult.suppressedCount,
      reasons: filterResult.suppressedReasons,
    },
    'Rule engine filtering complete',
  );

  // ── Stage 7: Enhanced metrics (Teammate C) ─────────────────────────────
  const enhancedMetrics = await measureStage(
    'enhanced-metrics',
    jobId,
    repositoryFullName,
    async () => computeEnhancedMetrics(filteredFindings, vulnerabilities.length, rawDiff),
  );

  // ── Stage 8: Persist results to MongoDB ────────────────────────────────
  const updatedReview = await measureStage(
    'persist-result',
    jobId,
    repositoryFullName,
    async () => {
      const [owner, repoName] = repositoryFullName.split('/');

      const reviewDoc = await Review.findOneAndUpdate(
        {
          'repository.fullName': repositoryFullName,
          prNumber,
        },
        {
          $set: {
            repository: { owner, name: repoName, fullName: repositoryFullName },
            prTitle: context.title,
            status: 'completed',
            findings: filteredFindings.map((f) => ({
              file: f.file,
              line: f.line,
              severity: f.severity,
              message: f.message,
              suggestion: f.suggestion,
              confidence: f.confidence,
              category: f.category,
            })),
            summary: buildSummary(
              filteredFindings,
              vulnerabilities.length,
              context.title,
            ),
            metrics: {
              vulnerabilitiesCount: vulnerabilities.length,
              performanceIssuesCount: filteredFindings.filter(
                (f) => f.category === 'performance',
              ).length,
              codeQualityScore: enhancedMetrics.codeQualityScore,
            },
            tokenUsage: {
              promptTokens: llmResult.totalPromptTokens,
              completionTokens: llmResult.totalCompletionTokens,
              totalTokens: llmResult.totalPromptTokens + llmResult.totalCompletionTokens,
            },
            diffData: rawDiff.slice(0, DIFF_PROCESSING.MAX_STORED_DIFF_CHARS), // cap stored diff size
          },
        },
        { upsert: true, new: true },
      );

      if (reviewDoc) {
        broadcastReviewEvent({
          type: 'review:completed',
          payload: reviewDoc.toJSON(),
          timestamp: new Date().toISOString(),
        });

        // ── Ensure a GitHubComment record always exists for this review ──
        // This allows the Apply Fix feature to work even when Stage 9
        // (GitHub posting) is skipped (e.g. test script reviews without a token).
        try {
          const existingComment = await GitHubComment.findOne({
            reviewId: reviewDoc._id,
            status: { $ne: 'archived' },
          });

          if (!existingComment) {
            const summaryBody = buildSummary(
              filteredFindings,
              vulnerabilities.length,
              context.title,
            );
            const localComment = new GitHubComment({
              reviewId: reviewDoc._id,
              repository: { owner, name: repoName, fullName: repositoryFullName },
              prNumber,
              prTitle: context.title,
              type: 'review',
              bodyMarkdown: summaryBody,
              summary: {
                findingsCount: filteredFindings.length,
                criticalCount: filteredFindings.filter((f) => f.severity === 'critical')
                  .length,
                highCount: filteredFindings.filter((f) => f.severity === 'high').length,
                mediumCount: filteredFindings.filter((f) => f.severity === 'medium')
                  .length,
                lowCount: filteredFindings.filter((f) => f.severity === 'low').length,
              },
              // Mark as 'posted' so it is returned by the getCommentByReview endpoint
              status: 'posted',
              postedAt: new Date(),
            });
            localComment.addAuditEvent('created', {
              source: 'local-persist',
              reviewId: reviewDoc._id,
            });
            localComment.addAuditEvent('posted', {
              source: 'local-persist',
              note: 'auto-created for apply-fix support',
            });
            await localComment.save();
            log.info(
              { commentId: localComment._id, reviewId: reviewDoc._id },
              'Auto-created local GitHubComment for apply-fix support',
            );
          }
        } catch (commentCreateErr) {
          log.warn(
            { err: commentCreateErr },
            'Failed to auto-create local GitHubComment (non-blocking)',
          );
        }
      }

      return reviewDoc;
    },
  );

  // ── Stage 9: Post comment and suggestions back to GitHub PR (Teammate C) ────────────────
  if (updatedReview) {
    try {
      let token = job.data.githubToken;

      if (!token) {
        const repoDoc = await Repository.findOne({ fullName: repositoryFullName });
        if (repoDoc) {
          const user = await User.findById(repoDoc.ownerId).select('+accessToken');
          if (user?.accessToken) {
            token = user.accessToken;
          }
        }
      }

      if (token) {
        const octokit = createOctokitClient(token);

        await measureStage('post-github-comment', jobId, repositoryFullName, async () => {
          // 1. Post primary bot review comment
          const commentDoc = await postReviewComment({
            octokit,
            reviewDoc: updatedReview,
            context,
            eventTraceId: eventId,
          });

          // 2. Post inline suggestion blocks for critical/high issues
          if (commentDoc) {
            await postInlineSuggestions({
              octokit,
              commentDoc,
              findings: filteredFindings,
              prNumber,
            });
          }

          // 3. Apply PR labels based on findings
          try {
            const [owner, repoName] = repositoryFullName.split('/');
            await applyPRLabels(
              token!,
              owner,
              repoName,
              prNumber,
              filteredFindings,
              eventId,
            );
          } catch (labelErr) {
            log.warn({ err: labelErr }, 'Failed to apply PR labels (non-blocking)');
          }
        });
      } else {
        log.warn(
          'Skipping Stage 9: No access token stored for repository owner or passed in payload.',
        );
      }
    } catch (commentError) {
      log.error({ err: commentError }, 'Failed to post GitHub comments/suggestions');
    }
  }

  log.info(
    {
      findings: filteredFindings.length,
      vulnerabilities: vulnerabilities.length,
      score: enhancedMetrics.codeQualityScore,
    },
    '🎉 Review pipeline complete',
  );

  // ── Stage 10: Dispatch Webhook Notifications ─────────────────────────────────
  try {
    const repoDoc = await Repository.findOne({ fullName: repositoryFullName });
    if (repoDoc) {
      const settingsList = await NotificationSettings.find({ userId: repoDoc.ownerId });
      if (settingsList.length > 0) {
        const payloadTitle = `✅ Review Completed: ${repositoryFullName}#${prNumber}`;
        const payloadMessage = buildSummary(
          filteredFindings,
          vulnerabilities.length,
          context.title,
        );
        const color =
          filteredFindings.some((f) => f.severity === 'critical') ||
          vulnerabilities.length > 0
            ? '#ff0000'
            : filteredFindings.some((f) => f.severity === 'high')
              ? '#ff9900'
              : '#36a64f';

        await dispatchNotifications(settingsList, 'reviewCompleted', {
          title: payloadTitle,
          message: payloadMessage,
          url: `https://github.com/${repositoryFullName}/pull/${prNumber}`,
          color,
        });
      }
    }
  } catch (notifErr) {
    log.error({ err: notifErr }, 'Failed to dispatch completion notifications');
  }
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/** Fetches the raw diff text from GitHub's diff URL */
async function fetchDiff(diffUrl: string, log: pino.Logger): Promise<string> {
  log.debug({ diffUrl }, 'Fetching PR diff');

  const response = await axios.get<string>(diffUrl, {
    timeout: QUEUE_CONFIG.AXIOS_TIMEOUT_MS,
    headers: { Accept: 'application/vnd.github.v3.diff, text/plain, */*' },
  });

  if (typeof response.data !== 'string') {
    throw new Error('Unexpected diff response type');
  }

  log.debug({ bytes: response.data.length }, 'Diff fetched');
  return response.data;
}

/** Builds a one-paragraph summary of the analysis */
function buildSummary(
  findings: (IFinding | AnalysisFinding)[],
  vulnCount: number,
  prTitle: string,
): string {
  if (findings.length === 0 && vulnCount === 0) {
    return `✅ GitGuard AI reviewed "${prTitle}" and found no issues. The code looks good!`;
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;

  const parts: string[] = [
    `GitGuard AI reviewed "${prTitle}" and found ${findings.length} issue(s).`,
  ];

  if (criticalCount > 0)
    parts.push(`🚨 ${criticalCount} critical issue(s) require immediate attention.`);
  if (highCount > 0) parts.push(`⚠️ ${highCount} high-severity issue(s) found.`);
  if (vulnCount > 0)
    parts.push(`🔒 ${vulnCount} dependency vulnerability/vulnerabilities detected.`);

  return parts.join(' ');
}
