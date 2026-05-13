/**
 * @file src/llm/parsers/reviewParser.ts
 * @description Structured JSON parsing and validation for LLM responses.
 *
 * LLMs can return:
 * - Valid JSON directly
 * - JSON wrapped in markdown fences (```json ... ```)
 * - JSON with leading/trailing text
 * - Partial JSON on token overflow
 *
 * This parser handles all cases with Zod validation and detailed error reporting
 * to enable intelligent retry logic in the router.
 */

import { z } from 'zod';
import { logger } from '../../lib/logger';
import { AnalysisFinding, FindingCategory, FindingSeverity } from '../../types/analysis';

// ─── Exported Types ───────────────────────────────────────────────────────────

/** A processed diff chunk ready for LLM review */
export interface DiffChunk {
  chunkIndex: number;
  totalChunks: number;
  content: string;
  charCount: number;
}

/** Parsed, validated review response from the LLM */
export interface ParsedReview {
  reviewId: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;           // 0-100
  issues: ParsedIssue[];
  summary: string;
  suggestedTests: string[];
}

export interface ParsedIssue {
  file: string;
  lineStart: number | null;
  lineEnd: number | null;
  type: 'bug' | 'security' | 'performance' | 'refactor' | 'test';
  description: string;
  suggestion: string;
  fixCode: string | null;
}

export interface ParseResult {
  success: boolean;
  review?: ParsedReview;
  error?: string;
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const issueSchema = z.object({
  file:        z.string().min(1),
  lineStart:   z.number().int().nullable().default(null),
  lineEnd:     z.number().int().nullable().default(null),
  type:        z.enum(['bug', 'security', 'performance', 'refactor', 'test']),
  description: z.string().min(1),
  suggestion:  z.string().min(1),
  fixCode:     z.string().nullable().default(null),
});

const reviewSchema = z.object({
  reviewId:       z.string().default('unknown'),
  severity:       z.enum(['Critical', 'High', 'Medium', 'Low']),
  confidence:     z.number().min(0).max(100),
  issues:         z.array(issueSchema).default([]),
  summary:        z.string().min(1),
  suggestedTests: z.array(z.string()).default([]),
});

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses and validates a raw LLM response string into a structured review.
 *
 * @param rawText - The raw string from the LLM API
 * @param eventId - Correlation ID for logging
 */
export function parseReviewResponse(rawText: string, eventId: string): ParseResult {
  const log = logger.child({ module: 'reviewParser', eventId });

  let jsonText = rawText.trim();

  // Step 1: Strip markdown fences
  jsonText = stripMarkdownFences(jsonText);

  // Step 2: Extract first JSON object from any surrounding text
  jsonText = extractFirstJsonObject(jsonText);

  if (!jsonText) {
    log.warn({ preview: rawText.slice(0, 100) }, 'No JSON object found in LLM response');
    return { success: false, error: 'No JSON object found in response' };
  }

  // Step 3: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JSON.parse failed';
    log.warn({ error: msg, preview: jsonText.slice(0, 150) }, 'JSON parse failed');
    return { success: false, error: `JSON parse error: ${msg}` };
  }

  // Step 4: Validate with Zod
  const result = reviewSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    log.warn({ zodIssues: issues }, 'Schema validation failed');
    return { success: false, error: `Schema validation: ${issues}` };
  }

  const data = result.data;

  // Step 5: Filter low-confidence issues (< 50 overall means we flag nothing)
  // The LLM sets confidence at the review level; issues inherit it
  const filteredIssues = data.confidence >= 50 ? data.issues : [];

  log.info({
    severity: data.severity,
    confidence: data.confidence,
    issueCount: filteredIssues.length,
  }, 'Review parsed successfully');

  return {
    success: true,
    review: {
      reviewId:       data.reviewId,
      severity:       data.severity,
      confidence:     data.confidence,
      issues:         filteredIssues.map(normaliseIssue),
      summary:        data.summary,
      suggestedTests: data.suggestedTests,
    },
  };
}

/**
 * Converts a parsed review into the shared AnalysisFinding format
 * used by the enrichment and storage layers.
 */
export function reviewToFindings(review: ParsedReview): AnalysisFinding[] {
  return review.issues.map((issue) => ({
    file:       issue.file,
    line:       issue.lineStart ?? 0,
    severity:   mapSeverity(review.severity),
    category:   mapCategory(issue.type),
    message:    issue.description,
    suggestion: issue.suggestion.includes(issue.fixCode ?? '')
      ? issue.suggestion
      : issue.fixCode
        ? `${issue.suggestion}\n\n**Fix:**\n\`\`\`\n${issue.fixCode}\n\`\`\``
        : issue.suggestion,
    confidence: review.confidence / 100, // 0-1 range
  }));
}

/**
 * Merges findings from multiple chunk reviews, deduplicating by file+description.
 */
export function mergeChunkFindings(reviews: ParsedReview[]): AnalysisFinding[] {
  const seen = new Set<string>();
  const all: AnalysisFinding[] = [];

  for (const review of reviews) {
    for (const finding of reviewToFindings(review)) {
      const key = `${finding.file}::${finding.message.slice(0, 60)}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(finding);
      }
    }
  }

  return all;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return '';
  return text.slice(start, end + 1);
}

function normaliseIssue(issue: z.infer<typeof issueSchema>): ParsedIssue {
  return {
    file:        issue.file,
    lineStart:   issue.lineStart,
    lineEnd:     issue.lineEnd,
    type:        issue.type,
    description: issue.description,
    suggestion:  issue.suggestion,
    fixCode:     issue.fixCode,
  };
}

function mapSeverity(s: ParsedReview['severity']): FindingSeverity {
  const map: Record<ParsedReview['severity'], FindingSeverity> = {
    Critical: 'critical',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
  };
  return map[s];
}

function mapCategory(t: ParsedIssue['type']): FindingCategory {
  const map: Record<ParsedIssue['type'], FindingCategory> = {
    bug:         'bug',
    security:    'security',
    performance: 'performance',
    refactor:    'refactoring',
    test:        'test-coverage',
  };
  return map[t];
}
