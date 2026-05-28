/**
 * @file tests/unit/services/commentService.test.ts
 * @description Unit tests for GitHub comment posting service.
 */

const mockListComments    = jest.fn();
const mockCreateComment   = jest.fn();
const mockUpdateComment   = jest.fn();
const mockCreateReview    = jest.fn();
const mockCreateReviewComment = jest.fn();

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      issues: {
        listComments:  mockListComments,
        createComment: mockCreateComment,
        updateComment: mockUpdateComment,
      },
      pulls: {
        createReview:        mockCreateReview,
        createReviewComment: mockCreateReviewComment,
      },
    },
  })),
}));

import { postReviewComment, PostReviewOptions } from '../../../src/services/commentService';
import { IFinding } from '../../../src/models/Review';
import { PRContext } from '../../../src/types/analysis';

const CTX: PRContext = {
  prNumber: 42, title: 'feat: add auth', description: null,
  linkedIssues: [], headBranch: 'feat/auth', baseBranch: 'main',
  language: 'TypeScript', changedFiles: 3, additions: 80, deletions: 10,
  isDraft: false, repositoryFullName: 'owner/repo', authorLogin: 'octocat',
};

function makeFinding(overrides: Partial<IFinding> = {}): IFinding {
  return {
    file: 'src/auth.ts', line: 15, severity: 'high',
    message: 'JWT secret not validated', suggestion: 'Validate length',
    confidence: 0.85, ...overrides,
  } as IFinding;
}

const BASE_OPTIONS: PostReviewOptions = {
  token: 'ghp_test', owner: 'owner', repo: 'repo', prNumber: 42,
  headSha: 'abc123', findings: [], context: CTX,
  metrics: { codeQualityScore: 85, vulnerabilitiesCount: 0, performanceIssuesCount: 0 },
  eventId: 'evt-test',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockListComments.mockResolvedValue({ data: [] });
  mockCreateComment.mockResolvedValue({ data: { id: 1001 } });
  mockUpdateComment.mockResolvedValue({ data: { id: 1001 } });
  mockCreateReview.mockResolvedValue({ data: { id: 2001 } });
  mockCreateReviewComment.mockResolvedValue({ data: { id: 3001 } });
});

describe('postReviewComment', () => {
  describe('✅ Summary comment', () => {
    it('should create a new summary comment when none exists', async () => {
      const result = await postReviewComment(BASE_OPTIONS);
      expect(mockCreateComment).toHaveBeenCalledTimes(1);
      expect(result.summaryCommentId).toBe(1001);
      expect(result.skipped).toBe(false);
    });

    it('should UPDATE existing GitGuard comment instead of creating a new one', async () => {
      mockListComments.mockResolvedValue({
        data: [{ id: 999, body: '<!-- gitguard-ai-review -->\n\n## Old Review' }],
      });
      const result = await postReviewComment(BASE_OPTIONS);
      expect(mockUpdateComment).toHaveBeenCalledTimes(1);
      expect(mockCreateComment).not.toHaveBeenCalled();
      expect(result.summaryCommentId).toBe(1001);
    });

    it('should include the hidden marker in the comment body', async () => {
      await postReviewComment(BASE_OPTIONS);
      const body = (mockCreateComment.mock.calls[0][0] as { body: string }).body;
      expect(body).toContain('<!-- gitguard-ai-review -->');
    });
  });

  describe('💬 Inline review comments', () => {
    it('should NOT post inline comments when findings have line=0', async () => {
      const opts = { ...BASE_OPTIONS, findings: [makeFinding({ line: 0 })] };
      const result = await postReviewComment(opts);
      expect(mockCreateReview).not.toHaveBeenCalled();
      expect(result.inlineCommentsPosted).toBe(0);
    });

    it('should post inline review for high findings with valid line numbers', async () => {
      const opts = { ...BASE_OPTIONS, findings: [makeFinding({ line: 15 })] };
      const result = await postReviewComment(opts);
      expect(mockCreateReview).toHaveBeenCalledTimes(1);
      expect(result.inlineCommentsPosted).toBe(1);
    });

    it('should use REQUEST_CHANGES for critical findings', async () => {
      const opts = { ...BASE_OPTIONS, findings: [makeFinding({ severity: 'critical', line: 10 })] };
      await postReviewComment(opts);
      expect(mockCreateReview).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'REQUEST_CHANGES' }),
      );
    });

    it('should use COMMENT event for high (not critical) findings', async () => {
      const opts = { ...BASE_OPTIONS, findings: [makeFinding({ severity: 'high', line: 10 })] };
      await postReviewComment(opts);
      expect(mockCreateReview).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'COMMENT' }),
      );
    });

    it('should NOT post inline for medium/low findings', async () => {
      const opts = { ...BASE_OPTIONS, findings: [makeFinding({ severity: 'medium', line: 10 })] };
      await postReviewComment(opts);
      expect(mockCreateReview).not.toHaveBeenCalled();
    });

    it('should degrade gracefully when review API fails', async () => {
      mockCreateReview.mockRejectedValue(new Error('Line outside diff'));
      mockCreateReviewComment.mockResolvedValue({ data: { id: 4001 } });
      const opts = { ...BASE_OPTIONS, findings: [makeFinding({ line: 15 })] };
      const result = await postReviewComment(opts);
      expect(result.inlineCommentsPosted).toBe(1);
    });
  });

  describe('🛡️ Resilience', () => {
    it('should return null summaryCommentId gracefully if comment API fails', async () => {
      mockListComments.mockRejectedValue(new Error('GitHub API error'));
      const result = await postReviewComment(BASE_OPTIONS);
      expect(result.summaryCommentId).toBeNull();
    });
  });
});
