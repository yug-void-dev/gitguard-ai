/**
 * @file tests/unit/services/suggestionService.test.ts
 * @description Unit tests for one-click inline suggestions posting and applying.
 */

const mockGet = jest.fn();
const mockCreateReviewComment = jest.fn();
const mockGetContent = jest.fn();
const mockCreateOrUpdateFileContents = jest.fn();

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      pulls: {
        get: mockGet,
        createReviewComment: mockCreateReviewComment,
      },
      repos: {
        getContent: mockGetContent,
        createOrUpdateFileContents: mockCreateOrUpdateFileContents,
      },
    },
  })),
}));

// Mock Mongoose models
const mockCommentSave = jest.fn();

jest.mock('../../../src/models/GitHubComment', () => ({
  GitHubComment: jest.fn().mockImplementation((data) => ({
    ...data,
    save: mockCommentSave,
    applySuggestion: jest.fn(),
  })),
}));

jest.mock('../../../src/models/Review', () => ({
  Review: {
    findById: jest.fn(),
  },
}));

import { postInlineSuggestions } from '../../../src/services/suggestionService';
import { Octokit } from '@octokit/rest';

describe('suggestionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: { head: { sha: 'commit-sha-123' } } });
    mockCreateReviewComment.mockResolvedValue({ data: { id: 999 } });
  });

  describe('postInlineSuggestions', () => {
    it('should post suggestions for critical and high findings only', async () => {
      const mockOctokit = new Octokit();
      const mockCommentDoc = {
        repository: { owner: 'owner', name: 'repo' },
        save: mockCommentSave,
      };

      const findings = [
        { file: 'src/app.ts', line: 10, severity: 'critical', suggestion: 'fix 1', message: 'msg1' },
        { file: 'src/app.ts', line: 20, severity: 'high', suggestion: 'fix 2', message: 'msg2' },
        { file: 'src/app.ts', line: 30, severity: 'medium', suggestion: 'fix 3', message: 'msg3' },
      ];

      await postInlineSuggestions({
        octokit: mockOctokit,
        commentDoc: mockCommentDoc as any,
        findings: findings as any,
        prNumber: 42,
      });

      // Should only post critical and high (2 comments)
      expect(mockCreateReviewComment).toHaveBeenCalledTimes(2);
      expect(mockCommentSave).toHaveBeenCalled();
    });
  });
});
