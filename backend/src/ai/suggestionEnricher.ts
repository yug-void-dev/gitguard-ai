/**
 * @file src/ai/suggestionEnricher.ts
 * @description Post-processes raw LLM findings to add test skeletons and refactoring hints.
 *
 * System Design Rationale:
 * ─────────────────────────
 * The LLM identifies *what* is wrong and *what to change*. This module adds
 * two extra layers of value on top of raw findings:
 *
 *  1. TEST SUGGESTIONS — for critical/high findings, it auto-generates a
 *     language-appropriate test skeleton so the developer can immediately write
 *     a regression test for the bug being fixed.
 *
 *  2. REFACTORING HINTS — for findings that mention code-quality indicators
 *     (deep nesting, long functions, God classes, etc.) it appends a structured
 *     refactoring recommendation.
 *
 * This module is deterministic (no LLM call) — it uses heuristic pattern matching
 * on the finding message and category. This keeps it fast, cheap, and testable.
 *
 * @module ai/suggestionEnricher
 */

import { logger } from '../lib/logger';
import { AnalysisFinding, FindingCategory, FindingSeverity } from '../types/analysis';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Findings at these severities get a test skeleton */
const SUGGEST_TEST_AT_SEVERITIES: ReadonlySet<FindingSeverity> = new Set([
  'critical',
  'high',
]);

/** Categories that should always generate a test suggestion */
const TEST_SUGGESTION_CATEGORIES: ReadonlySet<FindingCategory> = new Set([
  'security',
  'bug',
]);

/** Patterns in the finding message that indicate refactoring is warranted */
const REFACTOR_INDICATORS: RegExp[] = [
  /nested|nesting|deeply\s+nested/i,
  /too\s+long|long\s+function|function\s+too\s+large/i,
  /god\s+(class|object|function)/i,
  /complex(ity)?|cyclomatic/i,
  /duplicate|duplicated|duplicat(ion|e)/i,
  /magic\s+(number|string|value)/i,
  /hardcoded|hard-coded/i,
  /single\s+responsibility/i,
  /spaghetti/i,
  /coupling|tightly\s+coupled/i,
];

// ─── Language detection ───────────────────────────────────────────────────────

type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'go'
  | 'ruby'
  | 'generic';

const EXTENSION_TO_LANG: Record<string, SupportedLanguage> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  py: 'python',
  java: 'java',
  go: 'go',
  rb: 'ruby',
};

function detectLanguage(filePath: string): SupportedLanguage {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TO_LANG[ext] ?? 'generic';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enriches an array of AnalysisFindings with test and refactoring suggestions.
 *
 * Returns a new array (immutable — original findings are not mutated).
 *
 * @param findings - Raw findings from the LLM response
 * @param eventId  - Correlation ID for logging
 * @returns Enriched findings with testSuggestion / refactoringSuggestion added
 */
export function enrichFindings(
  findings: AnalysisFinding[],
  eventId: string,
): AnalysisFinding[] {
  const log = logger.child({ module: 'suggestionEnricher', eventId });

  let testSuggestionsAdded = 0;
  let refactorSuggestionsAdded = 0;

  const enriched = findings.map((finding) => {
    const enrichedFinding: AnalysisFinding = { ...finding };

    // ── Test suggestion ──────────────────────────────────────────────────
    if (shouldAddTestSuggestion(finding)) {
      enrichedFinding.testSuggestion = generateTestSuggestion(finding);
      testSuggestionsAdded++;
    }

    // ── Refactoring suggestion ───────────────────────────────────────────
    if (shouldAddRefactoringSuggestion(finding)) {
      enrichedFinding.refactoringSuggestion = generateRefactoringSuggestion(finding);
      refactorSuggestionsAdded++;
    }

    return enrichedFinding;
  });

  log.info(
    { testSuggestionsAdded, refactorSuggestionsAdded, totalFindings: findings.length },
    'Finding enrichment complete',
  );

  return enriched;
}

// ─── Private: Decision Logic ──────────────────────────────────────────────────

function shouldAddTestSuggestion(finding: AnalysisFinding): boolean {
  if (finding.testSuggestion) return false; // already present
  return (
    SUGGEST_TEST_AT_SEVERITIES.has(finding.severity) ||
    TEST_SUGGESTION_CATEGORIES.has(finding.category)
  );
}

function shouldAddRefactoringSuggestion(finding: AnalysisFinding): boolean {
  if (finding.refactoringSuggestion) return false; // already present
  if (finding.category === 'refactoring') return true;
  return REFACTOR_INDICATORS.some((pattern) => pattern.test(finding.message));
}

// ─── Private: Template Generators ────────────────────────────────────────────

function generateTestSuggestion(finding: AnalysisFinding): string {
  const lang = detectLanguage(finding.file);
  const testName = `should handle ${finding.category} case in ${finding.file.split('/').pop() ?? 'module'}`;

  switch (lang) {
    case 'typescript':
    case 'javascript':
      return [
        '```typescript',
        `// Suggested regression test for: ${finding.message.slice(0, 80)}`,
        `describe('${finding.file.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Module'}', () => {`,
        `  it('${testName}', () => {`,
        '    // Arrange',
        '    // TODO: set up the failing scenario described in the finding',
        '',
        '    // Act',
        '    // TODO: call the function / trigger the code path',
        '',
        '    // Assert',
        `    // TODO: verify the ${finding.severity} issue does NOT occur`,
        '    expect(true).toBe(true); // replace with actual assertion',
        '  });',
        '});',
        '```',
      ].join('\n');

    case 'python':
      return [
        '```python',
        `# Suggested regression test for: ${finding.message.slice(0, 80)}`,
        'import pytest',
        '',
        `def test_${testName.replace(/\s+/g, '_').toLowerCase()}():`,
        '    # Arrange',
        '    # TODO: set up the failing scenario described in the finding',
        '',
        '    # Act',
        '    # TODO: call the function / trigger the code path',
        '',
        '    # Assert',
        '    assert True  # replace with actual assertion',
        '```',
      ].join('\n');

    case 'go':
      return [
        '```go',
        `// Suggested regression test for: ${finding.message.slice(0, 80)}`,
        'func TestHandleCase(t *testing.T) {',
        '    // Arrange',
        '    // TODO: set up the failing scenario',
        '',
        '    // Act',
        '    // TODO: call the relevant function',
        '',
        '    // Assert',
        '    // TODO: use t.Errorf or require package assertions',
        '}',
        '```',
      ].join('\n');

    default:
      return [
        `// Suggested test for: ${finding.message.slice(0, 80)}`,
        '// Create a test that:',
        `// 1. Sets up the scenario described in the ${finding.severity} finding`,
        '// 2. Executes the affected code path',
        '// 3. Asserts the issue does NOT occur after the fix',
      ].join('\n');
  }
}

function generateRefactoringSuggestion(finding: AnalysisFinding): string {
  const suggestions: string[] = [
    `**Refactoring recommendation for \`${finding.file}\`:**`,
    '',
  ];

  const msg = finding.message.toLowerCase();

  if (/nested|nesting/.test(msg)) {
    suggestions.push(
      '- Extract nested logic into well-named private helper functions',
      '- Consider using early-return (guard clauses) to flatten nesting',
      '- Aim for a maximum nesting depth of 3 levels',
    );
  } else if (/duplicate|duplicat/.test(msg)) {
    suggestions.push(
      '- Extract the duplicated logic into a shared utility function',
      '- Follow the DRY (Don\'t Repeat Yourself) principle',
      '- Place shared utilities in a `utils/` or `helpers/` module',
    );
  } else if (/magic\s+(number|string|value)|hardcoded|hard-coded/.test(msg)) {
    suggestions.push(
      '- Extract magic values into named constants at the top of the file',
      '- Consider moving configuration to environment variables if environment-specific',
      '- Use an enum or a frozen object for related constants',
    );
  } else if (/long\s+function|too\s+large/.test(msg)) {
    suggestions.push(
      '- Break the function into smaller, single-responsibility functions',
      '- Each function should do ONE thing and do it well (Unix philosophy)',
      '- Target < 30 lines per function for readability',
    );
  } else if (/coupling|tightly/.test(msg)) {
    suggestions.push(
      '- Introduce an abstraction layer (interface / protocol) between components',
      '- Depend on abstractions, not concrete implementations (Dependency Inversion)',
      '- Consider injecting dependencies rather than importing them directly',
    );
  } else {
    suggestions.push(
      '- Apply the Single Responsibility Principle: one class/function should have one reason to change',
      '- Review SOLID principles for appropriate refactoring patterns',
      '- Consider extracting this logic into a dedicated service or utility',
    );
  }

  return suggestions.join('\n');
}
