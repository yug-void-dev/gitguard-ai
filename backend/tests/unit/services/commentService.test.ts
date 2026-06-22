/**
 * @file tests/unit/services/commentService.test.ts
 * @description Unit tests for GitHub comment posting service (Mongoose-integrated).
 */

const mockListComments = jest.fn();
const mockListReviewComments = jest.fn();
const mockDeleteComment = jest.fn();
const mockDeleteReviewComment = jest.fn();
const mockCreateReview = jest.fn();

// ── Mock Octokit ─────────────────────────────────────────────────────────────
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      issues: {
        listComments: mockListComments,
        deleteComment: mockDeleteComment,
      },
      pulls: {
        listReviewComments: mockListReviewComments,
        deleteReviewComment: mockDeleteReviewComment,
        createReview: mockCreateReview,
      },
    },
  })),
}));

// ── Mock logger ───────────────────────────────────────────────────────────────
jest.mock('../../../src/lib/logger', () => ({
  logger: {
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

// ── Mock GitHubComment model ──────────────────────────────────────────────────
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockAddAuditEvent = jest.fn();
const mockMarkAsPosted = jest.fn();
const mockMarkAsFailed = jest.fn();

const mockGitHubCommentInstance = {
  addAuditEvent: mockAddAuditEvent,
  markAsPosted: mockMarkAsPosted,
  markAsFailed: mockMarkAsFailed,
  save: mockSave,
  githubReviewId: undefined as number | undefined,
};

jest.mock('../../../src/models/GitHubComment', () => ({
  GitHubComment: jest.fn().mockImplementation(() => mockGitHubCommentInstance),
}));

// ── Mock GitHubComment updateMany (for deleteExistingBotComments) ─────────────
jest.mock('../../../src/models/GitHubComment', () => ({
  GitHubComment: Object.assign(
    jest.fn().mockImplementation(() => mockGitHubCommentInstance),
    { updateMany: jest.fn().mockResolvedValue({}) },
  ),
}));

// ── Mock diffFormatter ────────────────────────────────────────────────────────
jest.mock('../../../src/utils/diffFormatter', () => ({
  formatFindingsAsMarkdown: jest.fn().mockReturnValue({
    fullMarkdown: '## GitGuard AI Code Review\n\nNo issues found.',
    blocks: [],
    findingsCount: 0,
    criticalCount: 0,
    title: 'Test Review',
  }),
}));

import '../../../tests/helpers/setup';
import {
  postReviewComment,
  deleteExistingBotComments,
} from '../../../src/services/commentService';
import { Octokit } from '@octokit/rest';
import { IReview } from '../../../src/models/Review';
import { PRContext } from '../../../src/types/analysis';

// ── Test Fixtures ─────────────────────────────────────────────────────────────

const CTX: PRContext = {
  prNumber: 42,
  title: 'feat: add auth',
  description: null,
  linkedIssues: [],
  headBranch: 'feat/auth',
  baseBranch: 'main',
  language: 'TypeScript',
  changedFiles: 3,
  additions: 80,
  deletions: 10,
  isDraft: false,
  repositoryFullName: 'owner/repo',
  authorLogin: 'octocat',
};

const REVIEW_DOC = {
  _id: 'rev-123',
  repository: { owner: 'owner', name: 'repo', fullName: 'owner/repo' },
  prNumber: 42,
  prTitle: 'feat: add auth',
  findings: [],
  metrics: { codeQualityScore: 85, vulnerabilitiesCount: 0, performanceIssuesCount: 0 },
} as unknown as IReview;

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  mockListComments.mockResolvedValue({ data: [] });
  mockListReviewComments.mockResolvedValue({ data: [] });
  mockDeleteComment.mockResolvedValue({});
  mockDeleteReviewComment.mockResolvedValue({});
  mockCreateReview.mockResolvedValue({ data: { id: 2001 } });
  mockSave.mockResolvedValue(undefined);

  // Reset mutable instance field
  mockGitHubCommentInstance.githubReviewId = undefined;
});

describe('deleteExistingBotComments', () => {
  it('should not delete comments that are not from the bot', async () => {
    mockListComments.mockResolvedValue({
      data: [{ id: 100, body: 'Normal user comment' }],
    });
    mockListReviewComments.mockResolvedValue({ data: [] });

    const octokit = new Octokit();
    await deleteExistingBotComments({
      octokit,
      owner: 'owner',
      repo: 'repo',
      prNumber: 42,
    });

    expect(mockDeleteComment).not.toHaveBeenCalled();
  });

  it('should delete comments that contain the GitGuard bot signature', async () => {
    mockListComments.mockResolvedValue({
      data: [{ id: 999, body: '## GitGuard AI Code Review — something' }],
    });
    mockListReviewComments.mockResolvedValue({ data: [] });

    const octokit = new Octokit();
    await deleteExistingBotComments({
      octokit,
      owner: 'owner',
      repo: 'repo',
      prNumber: 42,
    });

    expect(mockDeleteComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 999 }),
    );
  });
});

describe('postReviewComment', () => {
  it('should save a GitHubComment document and post to GitHub', async () => {
    const octokit = new Octokit();

    const result = await postReviewComment({
      octokit,
      reviewDoc: REVIEW_DOC,
      context: CTX,
      eventTraceId: 'trace-abc',
    });

    // Should save document twice (once before posting, once after marking posted)
    expect(mockSave).toHaveBeenCalled();
    expect(mockCreateReview).toHaveBeenCalledTimes(1);
    expect(mockMarkAsPosted).toHaveBeenCalledWith(2001);
    expect(result).toBeDefined();
  });

  it('should mark comment as failed when GitHub API throws', async () => {
    mockCreateReview.mockRejectedValue(
      Object.assign(new Error('GitHub API error'), { status: 422 }),
    );
    const octokit = new Octokit();

    await expect(
      postReviewComment({
        octokit,
        reviewDoc: REVIEW_DOC,
        context: CTX,
        eventTraceId: 'trace-err',
      }),
    ).rejects.toThrow('GitHub API error');

    expect(mockMarkAsFailed).toHaveBeenCalled();
  });

  it('should call addAuditEvent on the comment document', async () => {
    const octokit = new Octokit();

    await postReviewComment({
      octokit,
      reviewDoc: REVIEW_DOC,
      context: CTX,
      eventTraceId: 'trace-audit',
    });

    expect(mockAddAuditEvent).toHaveBeenCalledWith('created', expect.any(Object));
  });
});
