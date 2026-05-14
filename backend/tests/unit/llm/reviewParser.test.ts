/**
 * @file tests/unit/llm/reviewParser.test.ts
 * @description Unit tests for LLM response parsing and validation.
 */

import { parseReviewResponse, mergeChunkFindings, reviewToFindings } from '../../../src/llm/parsers/reviewParser';

const EVENT_ID = 'test-event-parser';

const VALID_RESPONSE = JSON.stringify({
  reviewId: 'evt-001', severity: 'High', confidence: 85,
  issues: [{
    file: 'src/auth.ts', lineStart: 15, lineEnd: 15, type: 'security',
    description: 'JWT secret read from env without validation',
    suggestion: 'Validate secret length before use',
    fixCode: 'if (!secret || secret.length < 32) throw new Error("JWT_SECRET too short");',
  }],
  summary: 'PR adds JWT auth but uses an unvalidated secret.',
  suggestedTests: ['test that generateToken throws when JWT_SECRET is missing'],
});

describe('parseReviewResponse', () => {
  describe('✅ Valid responses', () => {
    it('should parse clean JSON', () => {
      const r = parseReviewResponse(VALID_RESPONSE, EVENT_ID);
      expect(r.success).toBe(true);
      expect(r.review?.severity).toBe('High');
      expect(r.review?.confidence).toBe(85);
      expect(r.review?.issues).toHaveLength(1);
    });

    it('should strip markdown fences', () => {
      const r = parseReviewResponse(`\`\`\`json\n${VALID_RESPONSE}\n\`\`\``, EVENT_ID);
      expect(r.success).toBe(true);
    });

    it('should extract JSON from preamble text', () => {
      const r = parseReviewResponse(`Sure, here is my review:\n${VALID_RESPONSE}`, EVENT_ID);
      expect(r.success).toBe(true);
    });

    it('should parse clean PR with no issues', () => {
      const clean = JSON.stringify({ reviewId: 'x', severity: 'Low', confidence: 95, issues: [], summary: 'No issues.', suggestedTests: [] });
      const r = parseReviewResponse(clean, EVENT_ID);
      expect(r.success).toBe(true);
      expect(r.review?.issues).toHaveLength(0);
    });

    it('should default suggestedTests to empty array', () => {
      const r = parseReviewResponse(JSON.stringify({ reviewId: 'x', severity: 'Low', confidence: 80, issues: [], summary: 'OK' }), EVENT_ID);
      expect(r.success).toBe(true);
      expect(r.review?.suggestedTests).toEqual([]);
    });
  });

  describe('❌ Invalid responses', () => {
    it('should fail on empty string', () => {
      expect(parseReviewResponse('', EVENT_ID).success).toBe(false);
    });

    it('should fail on plain text', () => {
      expect(parseReviewResponse('not json at all', EVENT_ID).success).toBe(false);
    });

    it('should fail when severity is missing', () => {
      expect(parseReviewResponse(JSON.stringify({ reviewId: 'x', confidence: 80, issues: [], summary: 'ok' }), EVENT_ID).success).toBe(false);
    });

    it('should fail when confidence > 100', () => {
      expect(parseReviewResponse(JSON.stringify({ reviewId: 'x', severity: 'High', confidence: 150, issues: [], summary: 'ok' }), EVENT_ID).success).toBe(false);
    });

    it('should fail for invalid severity value', () => {
      expect(parseReviewResponse(JSON.stringify({ reviewId: 'x', severity: 'CRITICAL', confidence: 90, issues: [], summary: 'ok' }), EVENT_ID).success).toBe(false);
    });
  });

  describe('🔒 Confidence filtering', () => {
    it('should return empty issues when confidence < 50', () => {
      const low = JSON.stringify({
        reviewId: 'x', severity: 'High', confidence: 30,
        issues: [{ file: 'a.ts', lineStart: 1, lineEnd: 1, type: 'bug', description: 'maybe', suggestion: 'fix', fixCode: null }],
        summary: 'Uncertain', suggestedTests: [],
      });
      const r = parseReviewResponse(low, EVENT_ID);
      expect(r.success).toBe(true);
      expect(r.review?.issues).toHaveLength(0);
    });
  });
});

describe('reviewToFindings', () => {
  it('should convert parsed review to AnalysisFinding array', () => {
    const r = parseReviewResponse(VALID_RESPONSE, EVENT_ID);
    const findings = reviewToFindings(r.review!);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.file).toBe('src/auth.ts');
    expect(findings[0]?.severity).toBe('high');
    expect(findings[0]?.category).toBe('security');
    expect(findings[0]?.confidence).toBe(0.85);
  });
});

describe('mergeChunkFindings', () => {
  it('should deduplicate identical findings', () => {
    const r = parseReviewResponse(VALID_RESPONSE, EVENT_ID).review!;
    expect(mergeChunkFindings([r, r])).toHaveLength(1);
  });

  it('should keep distinct findings from different files', () => {
    const r1 = parseReviewResponse(VALID_RESPONSE, EVENT_ID).review!;
    const r2 = parseReviewResponse(VALID_RESPONSE.replace('src/auth.ts', 'src/other.ts'), EVENT_ID).review!;
    expect(mergeChunkFindings([r1, r2])).toHaveLength(2);
  });
});
