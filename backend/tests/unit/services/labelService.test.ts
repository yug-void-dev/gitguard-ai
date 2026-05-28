/**
 * @file tests/unit/services/labelService.test.ts
 * @description Unit tests for auto-label logic.
 */

const mockCreateLabel = jest.fn();
const mockAddLabels   = jest.fn();
const mockRemoveLabel = jest.fn();

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      issues: {
        createLabel: mockCreateLabel,
        addLabels:   mockAddLabels,
        removeLabel: mockRemoveLabel,
      },
    },
  })),
}));

import { applyPRLabels, GITGUARD_LABELS } from '../../../src/services/labelService';
import { IFinding } from '../../../src/models/Review';

function makeFinding(overrides: Partial<IFinding> = {}): IFinding {
  return {
    file: 'src/auth.ts',
    line: 10,
    severity: 'high',
    message: 'Unvalidated input',
    suggestion: 'Validate the input',
    confidence: 0.85,
    ...overrides,
  } as IFinding;
}

beforeEach(() => {
  mockCreateLabel.mockResolvedValue({});
  mockAddLabels.mockResolvedValue({});
  mockRemoveLabel.mockResolvedValue({});
  jest.clearAllMocks();
  mockCreateLabel.mockResolvedValue({});
  mockAddLabels.mockResolvedValue({});
  mockRemoveLabel.mockResolvedValue({});
});

describe('applyPRLabels', () => {
  describe('✅ Label selection', () => {
    it('should always apply ai-reviewed label', async () => {
      const result = await applyPRLabels('token', 'owner', 'repo', 1, [], 'evt-1');
      expect(result.labelsApplied).toContain('ai-reviewed');
    });

    it('should apply approved-by-ai when no critical/high findings', async () => {
      const findings = [makeFinding({ severity: 'low' })];
      const result = await applyPRLabels('token', 'owner', 'repo', 1, findings, 'evt-2');
      expect(result.labelsApplied).toContain('approved-by-ai');
      expect(result.labelsApplied).not.toContain('security-issue');
    });

    it('should apply security-issue + needs-review for high findings', async () => {
      const findings = [makeFinding({ severity: 'high' })];
      const result = await applyPRLabels('token', 'owner', 'repo', 1, findings, 'evt-3');
      expect(result.labelsApplied).toContain('security-issue');
      expect(result.labelsApplied).toContain('needs-review');
      expect(result.labelsApplied).not.toContain('approved-by-ai');
    });

    it('should apply critical-bug for critical findings', async () => {
      const findings = [makeFinding({ severity: 'critical' })];
      const result = await applyPRLabels('token', 'owner', 'repo', 1, findings, 'evt-4');
      expect(result.labelsApplied).toContain('critical-bug');
      expect(result.labelsApplied).toContain('security-issue');
    });

    it('should apply performance-issue for perf-related messages', async () => {
      const findings = [makeFinding({ message: 'N+1 query detected in database call' })];
      const result = await applyPRLabels('token', 'owner', 'repo', 1, findings, 'evt-5');
      expect(result.labelsApplied).toContain('performance-issue');
    });

    it('should not duplicate labels', async () => {
      const findings = [
        makeFinding({ severity: 'high' }),
        makeFinding({ severity: 'high', file: 'src/user.ts' }),
      ];
      const result = await applyPRLabels('token', 'owner', 'repo', 1, findings, 'evt-6');
      const unique = new Set(result.labelsApplied);
      expect(unique.size).toBe(result.labelsApplied.length);
    });
  });

  describe('🔖 Label definitions', () => {
    it('should have all 6 label definitions', () => {
      const keys = Object.keys(GITGUARD_LABELS);
      expect(keys).toContain('ai-reviewed');
      expect(keys).toContain('security-issue');
      expect(keys).toContain('critical-bug');
      expect(keys).toContain('needs-review');
      expect(keys).toContain('performance-issue');
      expect(keys).toContain('approved-by-ai');
    });

    it('should have valid hex colors (no #)', () => {
      for (const def of Object.values(GITGUARD_LABELS)) {
        expect(def.color).toMatch(/^[0-9a-f]{6}$/i);
      }
    });
  });

  describe('📡 GitHub API calls', () => {
    it('should call addLabels with the correct params', async () => {
      await applyPRLabels('token', 'owner', 'repo', 42, [], 'evt-7');
      expect(mockAddLabels).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'owner', repo: 'repo', issue_number: 42 }),
      );
    });

    it('should not throw if removeLabel returns 404 (label not on PR)', async () => {
      mockRemoveLabel.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
      const findings = [makeFinding({ severity: 'high' })];
      await expect(
        applyPRLabels('token', 'owner', 'repo', 1, findings, 'evt-8'),
      ).resolves.not.toThrow();
    });
  });
});
