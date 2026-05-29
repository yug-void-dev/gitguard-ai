/**
 * @file tests/unit/ruleEngine.test.ts
 * @description Unit tests for the ruleEngine service.
 */

import '../helpers/setup';

jest.mock('../../src/config/env', () => ({
  env: {
    GITHUB_WEBHOOK_SECRET: 'test-webhook-secret-at-least-16-chars',
    NODE_ENV: 'test',
    PORT: 3002,
    MONGODB_URI: 'mongodb://localhost:27017/gitguard-test',
    ALLOWED_ORIGINS: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    WEBHOOK_RATE_LIMIT_MAX: 30,
    WEBHOOK_RATE_LIMIT_WINDOW_MS: 60000,
  },
  isProduction: false,
  isDevelopment: false,
  isTest: true,
}));

import { filterFindings, scanDiffForCustomPatterns, isPathAllowed } from '../../src/services/ruleEngine';
import { IRepositoryRuleSpec } from '../../src/models/RepositoryRule';

describe('ruleEngine', () => {
  const baseSpec: IRepositoryRuleSpec = {
    strictMode: false,
    ignoreLinting: false,
    checkPerformance: true,
    minConfidence: 0.7,
    allowAutoApply: false,
    ignoredPaths: [],
    onlySecurity: false,
    customPatterns: [],
  };

  describe('isPathAllowed (safe glob path matching)', () => {
    it('should allow clean paths when no ignore patterns are present', () => {
      expect(isPathAllowed('src/index.ts', [])).toBe(true);
    });

    it('should ignore paths matching explicit patterns', () => {
      expect(isPathAllowed('node_modules/lodash/index.js', ['node_modules'])).toBe(false);
    });

    it('should support safe glob wildcard matching', () => {
      const ignored = ['*.test.ts', 'dist/*'];
      expect(isPathAllowed('src/app.test.ts', ignored)).toBe(false);
      expect(isPathAllowed('dist/bundle.js', ignored)).toBe(false);
      expect(isPathAllowed('src/index.ts', ignored)).toBe(true);
    });
  });

  describe('filterFindings', () => {
    it('should keep findings above minConfidence and suppress below it', () => {
      const spec = { ...baseSpec, minConfidence: 0.8 };
      const findings = [
        { file: 'index.ts', confidence: 0.9, category: 'bug', severity: 'high' },
        { file: 'index.ts', confidence: 0.5, category: 'bug', severity: 'low' },
      ];

      const result = filterFindings(findings, spec);
      expect(result.filteredFindings.length).toBe(1);
      expect(result.filteredFindings[0].confidence).toBe(0.9);
      expect(result.suppressedCount).toBe(1);
      expect(result.suppressedReasons.lowConfidence).toBe(1);
    });

    it('should support ignoreLinting (code-quality) suppression', () => {
      const spec = { ...baseSpec, ignoreLinting: true };
      const findings = [
        { file: 'index.ts', confidence: 0.9, category: 'code-quality', severity: 'low' },
        { file: 'index.ts', confidence: 0.9, category: 'security', severity: 'high' },
      ];

      const result = filterFindings(findings, spec);
      expect(result.filteredFindings.length).toBe(1);
      expect(result.filteredFindings[0].category).toBe('security');
      expect(result.suppressedReasons.ignoreLinting).toBe(1);
    });

    it('should support onlySecurity flag', () => {
      const spec = { ...baseSpec, onlySecurity: true };
      const findings = [
        { file: 'index.ts', confidence: 0.9, category: 'bug', severity: 'high' },
        { file: 'index.ts', confidence: 0.9, category: 'security', severity: 'high' },
      ];

      const result = filterFindings(findings, spec);
      expect(result.filteredFindings.length).toBe(1);
      expect(result.filteredFindings[0].category).toBe('security');
      expect(result.suppressedReasons.securityOnly).toBe(1);
    });

    it('should apply custom suppress patterns', () => {
      const spec = {
        ...baseSpec,
        customPatterns: [
          {
            pattern: 'TODO',
            type: 'substring' as const,
            category: 'code-quality' as const,
            message: 'banned TODOs',
            severity: 'low' as const,
            action: 'suppress' as const,
          },
        ],
      };

      const findings = [
        { file: 'index.ts', message: 'Contains a TODO comment', confidence: 0.9, category: 'code-quality', severity: 'low' },
        { file: 'index.ts', message: 'Critical logic flaw', confidence: 0.9, category: 'bug', severity: 'high' },
      ];

      const result = filterFindings(findings, spec);
      expect(result.filteredFindings.length).toBe(1);
      expect(result.filteredFindings[0].message).toBe('Critical logic flaw');
      expect(result.suppressedReasons.customSuppressed).toBe(1);
    });

    it('should apply custom flag patterns to modify severity and categorizations', () => {
      const spec = {
        ...baseSpec,
        customPatterns: [
          {
            pattern: 'console\\.log',
            type: 'regex' as const,
            category: 'code-quality' as const,
            message: 'Avoid console logs in production',
            severity: 'high' as const,
            action: 'flag' as const,
          },
        ],
      };

      const findings = [
        { file: 'index.ts', message: 'Do not use console.log', confidence: 0.9, category: 'code-quality', severity: 'low' },
      ];

      const result = filterFindings(findings, spec);
      expect(result.filteredFindings.length).toBe(1);
      expect(result.filteredFindings[0].severity).toBe('high');
      expect(result.filteredFindings[0].message).toContain('Avoid console logs in production');
    });
  });

  describe('scanDiffForCustomPatterns', () => {
    it('should parse unified diff and generate findings for flagged custom patterns', () => {
      const spec = {
        ...baseSpec,
        customPatterns: [
          {
            pattern: 'eval(',
            type: 'substring' as const,
            category: 'security' as const,
            message: 'Never use eval() to execute dynamic code',
            severity: 'critical' as const,
            action: 'flag' as const,
          },
        ],
      };

      const mockDiff = `
diff --git a/src/index.ts b/src/index.ts
index 123456..789101 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,6 @@
 import express from 'express';
 const app = express();
+const payload = eval(req.body.code);
 app.listen(3000);
`;

      const findings = scanDiffForCustomPatterns(mockDiff, spec);
      expect(findings.length).toBe(1);
      expect(findings[0].file).toBe('src/index.ts');
      expect(findings[0].line).toBe(3);
      expect(findings[0].severity).toBe('critical');
      expect(findings[0].category).toBe('security');
      expect(findings[0].message).toBe('Never use eval() to execute dynamic code');
    });
  });
});
