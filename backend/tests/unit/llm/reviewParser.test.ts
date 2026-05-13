/**
 * @file tests/unit/llm/reviewParser.test.ts
 * @description Unit tests for LLM response parsing and validation.
 */

import { parseReviewResponse, mergeChunkFindings, reviewToFindings } from '../../../src/llm/parsers/reviewParser';

const EVENT_ID = 'test-event-parser';

const VALID_RESPONSE = JSON.stringify({
  reviewId: 'evt-001',
  severity: 'High',
  confidence: 85,
  issues: [
    {
      file: 'src/auth.ts',
      lineStart: 15,
      lineEnd: 15,
      type: 'security',
      description: 'JWT secret read from env without validation — could be undefined',
      suggestion: 'Use a validated env var with a minimum length check',
      fixCode: 'const secret = process.env.JWT_SECRET;\nif (!secret || secret.length < 32) throw new Error("JWT_SECRET too short");',
    },
  ],
  summary: 'PR adds JWT auth but uses an unvalidated secret.',
  suggestedTests: ['test that generateToken throws when JWT_SECRET is missing'],
});

const MARKDOWN_WRAPPED = `\`\`\`json\n${VALID_RESPONSE}\n\`\`\``;
const WITH_PREAMBLE = `Sure, here is my review:\n${VALID_RESPONSE}`;

describe('parseReviewResponse', () => {
  describe('✅ Valid responses', () => {
    it('should parse clean JSON', () => {
      const result = parseReviewResponse(VALID_RESPONSE, EVENT_ID);
      expect(result.success).toBe(true);
      expect(result.review?.severity).toBe('High');
      expect(result.review?.confidence).toBe(85);
      expect(result.review?.issues).toHaveLength(1);
      expect(result.review?.summary).toContain('JWT');
    });

    it('should strip markdown fences and parse', () => {
      const result = parseReviewResponse(MARKDOWN_WRAPPED, EVENT_ID);
      expect(result.success).toBe(true);
      expect(result.review?.severity).toBe('High');
    });

    it('should extract JSON from preamble text', () => {
      const result = parseReviewResponse(WITH_PREAMBLE, EVENT_ID);
      expect(result.success).toBe(true);
    });

    it('should parse response with no issues (clean PR)', () => {
      const clean = JSON.stringify({
        reviewId: 'evt-clean',
        severity: 'Low',
        confidence: 95,
        issues: [],
        summary: 'No issues found. Clean implementation.',
        suggestedTests: [],
      });
      const result = parseReviewResponse(clean, EVENT_ID);
      expect(result.success).toBe(true);
      expect(result.review?.issues).toHaveLength(0);
    });

    it('should default suggestedTests to empty array when missing', () => {
      const noTests = JSON.stringify({
        reviewId: 'evt-x', severity: 'Low', confidence: 80,
        issues: [], summary: 'OK',
      });
      const result = parseReviewResponse(noTests, EVENT_ID);
      expect(result.success).toBe(true);
      expect(result.review?.suggestedTests).toEqual([]);
    });
  });

  describe('❌ Invalid responses', () => {
    it('should fail on empty string', () => {
      const result = parseReviewResponse('', EVENT_ID);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail on invalid JSON', () => {
      const result = parseReviewResponse('not json at all', EVENT_ID);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No JSON object found');
    });

    it('should fail when severity is missing', () => {
      const bad = JSON.stringify({ reviewId: 'x', confidence: 80, issues: [], summary: 'ok' });
      const result = parseReviewResponse(bad, EVENT_ID);
      expect(result.success).toBe(false);
    });

    it('should fail when confidence is out of range', () => {
      const bad = JSON.stringify({
        reviewId: 'x', severity: 'High', confidence: 150, issues: [], summary: 'ok',
      });
      const result = parseReviewResponse(bad, EVENT_ID);
      expect(result.success).toBe(false);
    });

    it('should fail for invalid severity value', () => {
      const bad = JSON.stringify({
        reviewId: 'x', severity: 'CRITICAL', confidence: 90, issues: [], summary: 'ok',
      });
      const result = parseReviewResponse(bad, EVENT_ID);
      expect(result.success).toBe(false);
    });
  });

  describe('🔒 Confidence filtering', () => {
    it('should return empty issues when overall confidence < 50', () => {
      const low = JSON.stringify({
        reviewId: 'evt-low', severity: 'High', confidence: 30,
        issues: [{ file: 'src/a.ts', lineStart: 1, lineEnd: 1, type: 'bug', description: 'maybe', suggestion: 'fix', fixCode: null }],
        summary: 'Uncertain', suggestedTests: [],
      });
      const result = parseReviewResponse(low, EVENT_ID);
      expect(result.success).toBe(true);
      expect(result.review?.issues).toHaveLength(0);
    });
  });
});

describe('reviewToFindings', () => {
  it('should convert parsed review to AnalysisFinding array', () => {
    const parseResult = parseReviewResponse(VALID_RESPONSE, EVENT_ID);
    expect(parseResult.success).toBe(true);
    const findings = reviewToFindings(parseResult.review!);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.file).toBe('src/auth.ts');
    expect(findings[0]?.severity).toBe('high');
    expect(findings[0]?.category).toBe('security');
    expect(findings[0]?.confidence).toBe(0.85);
  });
});

describe('mergeChunkFindings', () => {
  it('should deduplicate identical findings from multiple chunks', () => {
    const r1 = parseReviewResponse(VALID_RESPONSE, EVENT_ID).review!;
    const r2 = parseReviewResponse(VALID_RESPONSE, EVENT_ID).review!;
    const merged = mergeChunkFindings([r1, r2]);
    expect(merged).toHaveLength(1); // deduplicated
  });

  it('should keep distinct findings from different files', () => {
    const r1 = parseReviewResponse(VALID_RESPONSE, EVENT_ID).review!;
    const r2 = parseReviewResponse(
      VALID_RESPONSE.replace('src/auth.ts', 'src/other.ts'), EVENT_ID,
    ).review!;
    const merged = mergeChunkFindings([r1, r2]);
    expect(merged).toHaveLength(2);
  });
});
