/**
 * @file tests/unit/github/diffProcessor.test.ts
 * @description Unit tests for diff parsing, cleaning, and chunking.
 */

import { processDiff } from '../../../src/github/diffProcessor';
import { PRContext } from '../../../src/types/analysis';

const EVENT_ID = 'test-event-diff';

const BASE_CONTEXT: PRContext = {
  prNumber: 42, title: 'feat: add auth', description: 'Adds JWT auth',
  linkedIssues: [], headBranch: 'feat/auth', baseBranch: 'main',
  language: 'TypeScript', changedFiles: 2, additions: 50, deletions: 5,
  isDraft: false, repositoryFullName: 'owner/repo', authorLogin: 'octocat',
};

const SIMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index abc123..def456 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,5 +1,10 @@
 import express from 'express';
+import jwt from 'jsonwebtoken';
+
+export function generateToken(userId: string): string {
+  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
+}
+
 export function setupAuth(app: express.Application): void {
   app.use(express.json());
 }
`;

const SKIP_DIFF = `diff --git a/package-lock.json b/package-lock.json
index aaa..bbb 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,3 +1,3 @@
-  "version": "1.0.0",
+  "version": "1.0.1",
`;

describe('processDiff', () => {
  describe('✅ Basic parsing', () => {
    it('should parse a single-file diff', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles).toHaveLength(1);
      expect(result.allFiles[0]?.filename).toBe('src/auth.ts');
      expect(result.allFiles[0]?.language).toBe('TypeScript');
      expect(result.allFiles[0]?.changeType).toBe('modified');
    });

    it('should count additions', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.totalAdditions).toBeGreaterThan(0);
    });

    it('should handle empty diff', () => {
      const result = processDiff('', BASE_CONTEXT, EVENT_ID);
      expect(result.chunks).toHaveLength(0);
      expect(result.allFiles).toHaveLength(0);
    });
  });

  describe('🧹 Cleaning', () => {
    it('should strip git metadata', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      const diff = result.allFiles[0]?.cleanDiff ?? '';
      expect(diff).not.toContain('index abc123');
      expect(diff).not.toContain('--- a/');
      expect(diff).toContain('@@');
      expect(diff).toContain('+import jwt');
    });
  });

  describe('🚫 Skip patterns', () => {
    it('should skip package-lock.json', () => {
      const result = processDiff(SKIP_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles).toHaveLength(0);
      expect(result.skippedFiles).toContain('package-lock.json');
    });

    it('should skip node_modules files', () => {
      const diff = SIMPLE_DIFF.split('src/auth.ts').join('node_modules/express/lib/router.ts');
      const result = processDiff(diff, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles).toHaveLength(0);
    });
  });

  describe('📦 Chunking', () => {
    it('should produce at least one chunk', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should back-fill totalChunks on every chunk', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      for (const chunk of result.chunks) {
        expect(chunk.totalChunks).toBe(result.chunks.length);
      }
    });

    it('should include PR info in context header', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.chunks[0]?.contextHeader).toContain('owner/repo');
      expect(result.chunks[0]?.contextHeader).toContain('42');
    });
  });

  describe('🌐 Language detection', () => {
    it('should detect TypeScript', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles[0]?.language).toBe('TypeScript');
    });

    it('should detect Python', () => {
      const diff = SIMPLE_DIFF.split('src/auth.ts').join('src/auth.py');
      const result = processDiff(diff, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles[0]?.language).toBe('Python');
    });

    it('should label unknown extensions as Unknown', () => {
      const diff = SIMPLE_DIFF.split('src/auth.ts').join('src/auth.xyz');
      const result = processDiff(diff, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles[0]?.language).toBe('Unknown');
    });
  });
});
