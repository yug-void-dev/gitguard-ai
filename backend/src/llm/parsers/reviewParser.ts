/**
 * @file src/llm/parsers/reviewParser.ts
 * @description Structured JSON parsing and Zod validation for LLM responses.
 */

import { z } from 'zod';
import { logger } from '../../lib/logger';
import { AnalysisFinding, FindingCategory, FindingSeverity } from '../../types/analysis';

export interface DiffChunk {
  chunkIndex: number;
  totalChunks: number;
  content: string;
  charCount: number;
}

export interface ParsedReview {
  reviewId: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
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

const issueSchema = z.object({
  file: z.string().min(1),
  lineStart: z.number().int().nullable().default(null),
  lineEnd: z.number().int().nullable().default(null),
  type: z.enum(['bug', 'security', 'performance', 'refactor', 'test']),
  description: z.string().min(1),
  suggestion: z.string().min(1),
  fixCode: z.string().nullable().default(null),
});

const reviewSchema = z.object({
  reviewId: z.string().default('unknown'),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  confidence: z.number().min(0).max(100),
  issues: z.array(issueSchema).default([]),
  summary: z.string().min(1),
  suggestedTests: z.array(z.string()).default([]),
});

export function parseReviewResponse(rawText: string, eventId: string): ParseResult {
  const log = logger.child({ module: 'reviewParser', eventId });
  let jsonText = rawText.trim();
  jsonText = jsonText
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();
  const start = jsonText.indexOf('{'),
    end = jsonText.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    log.warn({ preview: rawText.slice(0, 100) }, 'No JSON object found in LLM response');
    return { success: false, error: 'No JSON object found in response' };
  }
  jsonText = jsonText.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JSON.parse failed';
    log.warn({ error: msg, preview: jsonText.slice(0, 150) }, 'JSON parse failed');
    return { success: false, error: `JSON parse error: ${msg}` };
  }

  const result = reviewSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    log.warn({ zodIssues: issues }, 'Schema validation failed');
    return { success: false, error: `Schema validation: ${issues}` };
  }

  const data = result.data;
  const filteredIssues = data.confidence >= 50 ? data.issues : [];

  log.info(
    {
      severity: data.severity,
      confidence: data.confidence,
      issueCount: filteredIssues.length,
    },
    'Review parsed successfully',
  );

  return {
    success: true,
    review: {
      reviewId: data.reviewId,
      severity: data.severity,
      confidence: data.confidence,
      issues: filteredIssues.map((i) => ({
        file: i.file,
        lineStart: i.lineStart,
        lineEnd: i.lineEnd,
        type: i.type,
        description: i.description,
        suggestion: i.suggestion,
        fixCode: i.fixCode,
      })),
      summary: data.summary,
      suggestedTests: data.suggestedTests,
    },
  };
}

export function reviewToFindings(review: ParsedReview): AnalysisFinding[] {
  const severityMap: Record<ParsedReview['severity'], FindingSeverity> = {
    Critical: 'critical',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
  };
  const categoryMap: Record<ParsedIssue['type'], FindingCategory> = {
    bug: 'bug',
    security: 'security',
    performance: 'performance',
    refactor: 'refactoring',
    test: 'test-coverage',
  };
  return review.issues.map((i) => ({
    file: i.file,
    line: i.lineStart ?? 0,
    severity: severityMap[review.severity],
    category: categoryMap[i.type],
    message: i.description,
    suggestion: i.fixCode
      ? `${i.suggestion}\n\n\`\`\`\n${i.fixCode}\n\`\`\``
      : i.suggestion,
    confidence: review.confidence / 100,
  }));
}

export function mergeChunkFindings(reviews: ParsedReview[]): AnalysisFinding[] {
  const seen = new Set<string>();
  const all: AnalysisFinding[] = [];
  for (const review of reviews) {
    for (const f of reviewToFindings(review)) {
      const key = `${f.file}::${f.message.slice(0, 60)}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(f);
      }
    }
  }
  return all;
}
