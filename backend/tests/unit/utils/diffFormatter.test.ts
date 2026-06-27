/**
 * @file tests/unit/utils/diffFormatter.test.ts
 * @description Unit tests for rich Markdown + inline comment formatting.
 */

import {
  formatFindingsAsMarkdown,
  formatInlineComment,
  getInlineFindingsForFile,
} from '../../../src/utils/diffFormatter';
import { IFinding } from '../../../src/models/Review';
import { PRContext } from '../../../src/types/analysis';

const CTX: PRContext = {
  prNumber: 42,
  title: 'feat: add auth',
  description: 'Adds JWT auth',
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

const METRICS = {
  codeQualityScore: 72,
  vulnerabilitiesCount: 1,
  performanceIssuesCount: 0,
};

function makeFinding(overrides: Partial<IFinding> = {}): IFinding {
  return {
    file: 'src/auth.ts',
    line: 15,
    severity: 'high',
    message: 'JWT secret not validated',
    suggestion: 'Validate length',
    confidence: 0.85,
    ...overrides,
  } as IFinding;
}

describe('formatFindingsAsMarkdown', () => {
  it('should return a MarkdownComment with fullMarkdown string', () => {
    const result = formatFindingsAsMarkdown([], CTX, METRICS, 'evt-1');
    expect(typeof result.fullMarkdown).toBe('string');
    expect(result.fullMarkdown.length).toBeGreaterThan(0);
  });

  it('should include PR number and title', () => {
    const result = formatFindingsAsMarkdown([], CTX, METRICS, 'evt-1');
    expect(result.fullMarkdown).toContain('#42');
    expect(result.fullMarkdown).toContain('feat: add auth');
  });

  it('should include code quality score', () => {
    const result = formatFindingsAsMarkdown([], CTX, METRICS, 'evt-1');
    expect(result.fullMarkdown).toContain('72%');
  });

  it('should include finding message in per-file block', () => {
    const findings = [makeFinding()];
    const result = formatFindingsAsMarkdown(findings, CTX, METRICS, 'evt-1');
    expect(result.fullMarkdown).toContain('JWT secret not validated');
    expect(result.fullMarkdown).toContain('src/auth.ts');
  });

  it('should group findings by file', () => {
    const findings = [
      makeFinding({ file: 'src/auth.ts' }),
      makeFinding({ file: 'src/user.ts', message: 'Missing validation' }),
    ];
    const result = formatFindingsAsMarkdown(findings, CTX, METRICS, 'evt-1');
    expect(result.fullMarkdown).toContain('src/auth.ts');
    expect(result.fullMarkdown).toContain('src/user.ts');
  });

  it('should show 🟢 emoji when no critical/high findings', () => {
    const findings = [makeFinding({ severity: 'low' })];
    const result = formatFindingsAsMarkdown(
      findings,
      CTX,
      { ...METRICS, codeQualityScore: 95 },
      'evt-1',
    );
    expect(result.fullMarkdown).toContain('🟢');
  });

  it('should show 🔴 emoji when critical findings present', () => {
    const findings = [makeFinding({ severity: 'critical' })];
    const result = formatFindingsAsMarkdown(
      findings,
      CTX,
      { ...METRICS, codeQualityScore: 50 },
      'evt-1',
    );
    expect(result.fullMarkdown).toContain('🔴');
  });

  it('should include footer with GitGuard branding', () => {
    const result = formatFindingsAsMarkdown([], CTX, METRICS, 'evt-1');
    expect(result.fullMarkdown).toContain('GitGuard AI');
  });

  it('should count criticalCount correctly', () => {
    const findings = [
      makeFinding({ severity: 'critical' }),
      makeFinding({ severity: 'high' }),
      makeFinding({ severity: 'medium' }),
    ];
    const result = formatFindingsAsMarkdown(findings, CTX, METRICS, 'evt-1');
    expect(result.criticalCount).toBe(1);
    expect(result.findingsCount).toBe(3);
  });
});

describe('formatInlineComment', () => {
  it('should include severity and confidence', () => {
    const comment = formatInlineComment(makeFinding());
    expect(comment).toContain('HIGH');
    expect(comment).toContain('85%');
  });

  it('should include the finding message', () => {
    const comment = formatInlineComment(makeFinding());
    expect(comment).toContain('JWT secret not validated');
  });

  it('should include a suggestion block', () => {
    const comment = formatInlineComment(makeFinding());
    expect(comment).toContain('suggestion');
  });

  it('should use correct emoji for critical', () => {
    const comment = formatInlineComment(makeFinding({ severity: 'critical' }));
    expect(comment).toContain('🔴');
  });
});

describe('getInlineFindingsForFile', () => {
  const findings = [
    makeFinding({ file: 'src/auth.ts', severity: 'critical', line: 5 }),
    makeFinding({ file: 'src/auth.ts', severity: 'high', line: 10 }),
    makeFinding({ file: 'src/auth.ts', severity: 'medium', line: 15 }),
    makeFinding({ file: 'src/user.ts', severity: 'high', line: 20 }),
  ];

  it('should return only critical+high for the specified file', () => {
    const result = getInlineFindingsForFile(findings, 'src/auth.ts');
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.severity === 'critical' || f.severity === 'high')).toBe(
      true,
    );
  });

  it('should not include findings from other files', () => {
    const result = getInlineFindingsForFile(findings, 'src/auth.ts');
    expect(result.every((f) => f.file === 'src/auth.ts')).toBe(true);
  });

  it('should sort by line number ascending', () => {
    const result = getInlineFindingsForFile(findings, 'src/auth.ts');
    expect(result[0]?.line).toBeLessThan(result[1]?.line ?? 999);
  });

  it('should return empty array for unknown file', () => {
    expect(getInlineFindingsForFile(findings, 'src/nonexistent.ts')).toHaveLength(0);
  });
});
