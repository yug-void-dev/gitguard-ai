/**
 * @file tests/unit/services/suggestionService.test.ts
 * @description Unit tests for one-click suggestion posting.
 */

const mockCreateReviewComment = jest.fn();

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      pulls: { createReviewComment: mockCreateReviewComment },
    },
  })),
}));

import { postSuggestions, PostSuggestionsOptions } from '../../../src/services/suggestionService';
import { IFinding } from '../../../src/models/Review';

function makeFinding(overrides: Partial<IFinding> = {}): IFinding {
  return {
    file: 'src/auth.ts', line: 15, severity: 'high',
    message: 'JWT secret not validated',
    suggestion: 'const secret = process.env.JWT_SECRET;\nif (!secret) throw new Error("missing");',
    confidence: 0.9,
    ...overrides,
  } as IFinding;
}

const BASE_OPTS: PostSuggestionsOptions = {
  token: 'ghp_test', owner: 'owner', repo: 'repo',
  prNumber: 42, headSha: 'abc123', findings: [], eventId: 'evt-test',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateReviewComment.mockResolvedValue({ data: { id: 5001 } });
});

describe('postSuggestions', () => {
  it('should return zero when no findings', async () => {
    const r = await postSuggestions(BASE_OPTS);
    expect(r.suggestionsPosted).toBe(0);
    expect(mockCreateReviewComment).not.toHaveBeenCalled();
  });

  it('should post suggestion for high finding with code', async () => {
    const opts = { ...BASE_OPTS, findings: [makeFinding()] };
    const r = await postSuggestions(opts);
    expect(r.suggestionsPosted).toBe(1);
    expect(r.commentIds).toContain(5001);
  });

  it('should not post for medium/low findings', async () => {
    const opts = { ...BASE_OPTS, findings: [makeFinding({ severity: 'medium' })] };
    const r = await postSuggestions(opts);
    expect(r.suggestionsPosted).toBe(0);
  });

  it('should skip findings with line=0', async () => {
    const opts = { ...BASE_OPTS, findings: [makeFinding({ line: 0 })] };
    const r = await postSuggestions(opts);
    expect(r.suggestionsPosted).toBe(0);
  });

  it('should skip findings with plain-text (non-code) suggestions', async () => {
    const opts = {
      ...BASE_OPTS,
      findings: [makeFinding({ suggestion: 'Please validate the input before using it' })],
    };
    const r = await postSuggestions(opts);
    expect(r.suggestionsPosted).toBe(0);
  });

  it('should include ```suggestion``` block in comment body', async () => {
    const opts = { ...BASE_OPTS, findings: [makeFinding()] };
    await postSuggestions(opts);
    const body = (mockCreateReviewComment.mock.calls[0][0] as { body: string }).body;
    expect(body).toContain('```suggestion');
  });

  it('should increment skipped on API failure', async () => {
    mockCreateReviewComment.mockRejectedValue(new Error('Line outside diff'));
    const opts = { ...BASE_OPTS, findings: [makeFinding()] };
    const r = await postSuggestions(opts);
    expect(r.skipped).toBe(1);
    expect(r.suggestionsPosted).toBe(0);
  });

  it('should handle multiple findings independently', async () => {
    mockCreateReviewComment
      .mockResolvedValueOnce({ data: { id: 6001 } })
      .mockResolvedValueOnce({ data: { id: 6002 } });
    const opts = {
      ...BASE_OPTS,
      findings: [
        makeFinding({ line: 10 }),
        makeFinding({ line: 20, file: 'src/user.ts' }),
      ],
    };
    const r = await postSuggestions(opts);
    expect(r.suggestionsPosted).toBe(2);
    expect(r.commentIds).toEqual([6001, 6002]);
  });
});
