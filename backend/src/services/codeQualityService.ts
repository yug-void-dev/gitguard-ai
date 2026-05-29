/**
 * @file src/services/codeQualityService.ts
 * @description Service for computing enhanced code quality metrics (density, ratios, grades).
 */

export interface EnhancedMetrics {
  codeQualityScore: number;
  vulnerabilitiesCount: number;
  performanceIssuesCount: number;
  bugDensity: number;          // bugs per 100 lines changed
  securityRatio: number;       // % of findings that are security category
  coverageScore: number;       // test-coverage score (0-100)
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Computes advanced code quality metrics based on findings, vulnerabilities, and raw diff lines.
 *
 * @param findings List of filtered analysis findings
 * @param vulnerabilitiesCount Number of security vulnerabilities scanned
 * @param rawDiff Raw pull request diff
 */
export function computeEnhancedMetrics(
  findings: any[],
  vulnerabilitiesCount: number,
  rawDiff: string,
): EnhancedMetrics {
  // 1. Calculate basic code quality score
  const critical = findings.filter((f) => f.severity === 'critical').length;
  const high = findings.filter((f) => f.severity === 'high').length;
  const medium = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;

  // Deduct from quality score: critical=20, high=10, medium=5, low=2, vuln=15
  const codeQualityScore = Math.max(
    0,
    100 -
      critical * 20 -
      high * 10 -
      medium * 5 -
      low * 2 -
      vulnerabilitiesCount * 15,
  );

  // 2. Parse raw diff to compute total lines changed (additions + deletions)
  let linesChanged = 0;
  if (rawDiff) {
    const lines = rawDiff.split('\n');
    for (const line of lines) {
      // Count lines starting with '+' or '-' (ignoring '+++' and '---' headers)
      if (
        (line.startsWith('+') && !line.startsWith('+++')) ||
        (line.startsWith('-') && !line.startsWith('---'))
      ) {
        linesChanged++;
      }
    }
  }

  // 3. Bug Density: Number of functional bugs or high-severity issues per 100 lines changed
  const bugsCount = findings.filter(
    (f) => f.category === 'bug' || f.severity === 'critical' || f.severity === 'high',
  ).length;
  const bugDensity = linesChanged > 0 ? parseFloat(((bugsCount / linesChanged) * 100).toFixed(2)) : 0;

  // 4. Security Ratio: Percentage of findings categorized under security
  const securityCount = findings.filter((f) => f.category === 'security').length;
  const securityRatio = findings.length > 0 ? parseFloat(((securityCount / findings.length) * 100).toFixed(2)) : 0;

  // 5. Test Coverage Score: Presence of tests in changed files
  let coverageScore = 70; // baseline
  const hasTestsChanged = rawDiff && (
    rawDiff.toLowerCase().includes('/test/') ||
    rawDiff.toLowerCase().includes('/tests/') ||
    rawDiff.toLowerCase().includes('/spec/') ||
    rawDiff.toLowerCase().includes('.test.') ||
    rawDiff.toLowerCase().includes('.spec.')
  );

  if (hasTestsChanged) {
    coverageScore = 100;
  } else {
    // Check if there is any finding pointing to missing test cases or coverage
    const hasTestFinding = findings.some(
      (f) =>
        f.message.toLowerCase().includes('test') ||
        f.message.toLowerCase().includes('coverage') ||
        f.suggestion.toLowerCase().includes('test'),
    );
    if (hasTestFinding) {
      coverageScore = 40;
    }
  }

  // 6. Overall Grade mapping
  let overallGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (codeQualityScore >= 90) overallGrade = 'A';
  else if (codeQualityScore >= 80) overallGrade = 'B';
  else if (codeQualityScore >= 70) overallGrade = 'C';
  else if (codeQualityScore >= 60) overallGrade = 'D';

  const performanceIssuesCount = findings.filter((f) => f.category === 'performance').length;

  return {
    codeQualityScore,
    vulnerabilitiesCount,
    performanceIssuesCount,
    bugDensity,
    securityRatio,
    coverageScore,
    overallGrade,
  };
}
