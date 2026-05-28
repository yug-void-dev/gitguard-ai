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
import { Review } from '../models/Review';
import { logger } from '../lib/logger';
import { ReviewJobPayload, AnalysisResult, AnalysisFinding } from '../types/analysis';
import { processDiff } from '../github/diffProcessor';
import { routeToLLM } from '../llm/llmRouter';
import { broadcastReviewEvent } from '../websocket';
import axios from 'axios';
import pino from 'pino';
import { postReviewComment } from '../services/commentService';
import { applyPRLabels } from '../services/labelService';
import { postSuggestions } from '../services/suggestionService';

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

  _worker = new Worker<ReviewJobPayload>(
    REVIEW_QUEUE_NAME,
    processJob,
    {
      connection: getRedisConnection(),
      concurrency: WORKER_CONCURRENCY,
    },
  );

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

  // ── Stage 3: LLM Analysis ───────────────────────────────────────────
  const llmResult = await measureStage(
    'llm-analysis',
    jobId,
    repositoryFullName,
    async () => routeToLLM({
      chunks: processedDiff.chunks,
      context,
      eventId,
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

  // ── Stage 6: Compute metrics ──────────────────────────────────────────
  const metrics = computeMetrics(enrichedFindings, vulnerabilities.length);

  // ── Stage 7: Persist to MongoDB ───────────────────────────────────────
  await measureStage(
    'persist-result',
    jobId,
    repositoryFullName,
    async () => {
      const [owner, repoName] = repositoryFullName.split('/');

      const updatedReview = await Review.findOneAndUpdate(
        {
          'repository.fullName': repositoryFullName,
          prNumber,
        },
        {
          $set: {
            repository: { owner, name: repoName, fullName: repositoryFullName },
            prTitle: context.title,
            status: 'completed',
            findings: enrichedFindings.map((f) => ({
              file: f.file,
              line: f.line,
              severity: f.severity,
              message: f.message,
              suggestion: f.suggestion,
              confidence: f.confidence,
            })),
            summary: buildSummary(enrichedFindings, vulnerabilities.length, context.title),
            metrics: {
              vulnerabilitiesCount: vulnerabilities.length,
              performanceIssuesCount: enrichedFindings.filter(
                (f) => f.category === 'performance',
              ).length,
              codeQualityScore: metrics.codeQualityScore,
            },
            diffData: rawDiff.slice(0, 50_000), // cap stored diff size
          },
        },
        { upsert: true, new: true },
      );

      if (updatedReview) {
        broadcastReviewEvent({
          type: 'review:completed',
          payload: updatedReview.toJSON(),
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // ── Stage 8: Post GitHub comments + auto-labels ────────────────────
  // Only post if we have a GitHub token in the job payload
  if (job.data.githubToken) {
    const [owner, repoName] = repositoryFullName.split('/');
    const headSha = job.data.headSha ?? '';

    await measureStage(
      'post-comments',
      jobId,
      repositoryFullName,
      async () => {
        // Fetch the saved review to get the full IFinding[] array
        const savedReview = await Review.findOne({
          'repository.fullName': repositoryFullName,
          prNumber,
        });

        if (!savedReview) {
          log.warn('Could not find saved review for comment posting — skipping');
          return;
        }

        // Post rich Markdown summary + inline review comments
        const commentResult = await postReviewComment({
          token: job.data.githubToken!,
          owner,
          repo: repoName,
          prNumber,
          headSha,
          findings: savedReview.findings,
          context,
          metrics: {
            codeQualityScore: metrics.codeQualityScore,
            vulnerabilitiesCount: vulnerabilities.length,
            performanceIssuesCount: enrichedFindings.filter(
              (f) => f.category === 'performance',
            ).length,
          },
          eventId,
        });

        // Post one-click suggestion comments for actionable findings
        const suggestionResult = await postSuggestions({
          token: job.data.githubToken!,
          owner,
          repo: repoName,
          prNumber,
          headSha,
          findings: savedReview.findings,
          eventId,
        });

        // Apply PR labels based on findings
        const labelResult = await applyPRLabels(
          job.data.githubToken!,
          owner,
          repoName,
          prNumber,
          savedReview.findings,
          eventId,
        );

        log.info(
          {
            summaryCommentId: commentResult.summaryCommentId,
            inlineComments: commentResult.inlineCommentsPosted,
            suggestions: suggestionResult.suggestionsPosted,
            labelsApplied: labelResult.labelsApplied,
          },
          '✅ GitHub comments + labels posted',
        );
      },
    );
  } else {
    log.info('No githubToken in job payload — skipping GitHub comment posting');
  }

  log.info(
    {
      findings: enrichedFindings.length,
      vulnerabilities: vulnerabilities.length,
      score: metrics.codeQualityScore,
    },
    '🎉 Review pipeline complete',
  );
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/** Fetches the raw diff text from GitHub's diff URL */
async function fetchDiff(
  diffUrl: string,
  log: pino.Logger,
): Promise<string> {
  log.debug({ diffUrl }, 'Fetching PR diff');

  const response = await axios.get<string>(diffUrl, {
    timeout: 15_000,
    headers: { Accept: 'application/vnd.github.v3.diff' },
  });

  if (typeof response.data !== 'string') {
    throw new Error('Unexpected diff response type');
  }

  log.debug({ bytes: response.data.length }, 'Diff fetched');
  return response.data;
}


/** Computes aggregate metrics from enriched findings */
function computeMetrics(
  findings: AnalysisFinding[],
  vulnerabilityCount: number,
): AnalysisResult['metrics'] {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    totalFindings: findings.length,
    vulnerabilitiesFound: vulnerabilityCount,
    codeQualityScore: 100,
  };

  for (const f of findings) {
    counts[f.severity]++;
  }

  // Deduct from quality score: critical=20, high=10, medium=5, low=2, vuln=15
  counts.codeQualityScore = Math.max(
    0,
    100 -
      counts.critical * 20 -
      counts.high * 10 -
      counts.medium * 5 -
      counts.low * 2 -
      vulnerabilityCount * 15,
  );

  return counts;
}

/** Builds a one-paragraph summary of the analysis */
function buildSummary(
  findings: AnalysisFinding[],
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

  if (criticalCount > 0) parts.push(`🚨 ${criticalCount} critical issue(s) require immediate attention.`);
  if (highCount > 0) parts.push(`⚠️ ${highCount} high-severity issue(s) found.`);
  if (vulnCount > 0) parts.push(`🔒 ${vulnCount} dependency vulnerability/vulnerabilities detected.`);

  return parts.join(' ');
}
