/**
 * @file tests/unit/github/diffProcessor.test.ts
 * @description Unit tests for diff parsing, cleaning, and chunking.
 */

import { processDiff, ProcessedDiff } from '../../../src/github/diffProcessor';
import { PRContext } from '../../../src/types/analysis';

const EVENT_ID = 'test-event-diff';

const BASE_CONTEXT: PRContext = {
  prNumber: 42,
  title: 'feat: add user authentication',
  description: 'Adds JWT-based auth',
  linkedIssues: [10],
  headBranch: 'feat/auth',
  baseBranch: 'main',
  language: 'TypeScript',
  changedFiles: 2,
  additions: 50,
  deletions: 5,
  isDraft: false,
  repositoryFullName: 'owner/repo',
  authorLogin: 'octocat',
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

const MULTI_FILE_DIFF = SIMPLE_DIFF + `
diff --git a/src/models/user.ts b/src/models/user.ts
index 111111..222222 100644
--- a/src/models/user.ts
+++ b/src/models/user.ts
@@ -1,3 +1,8 @@
 import mongoose from 'mongoose';
+
+const userSchema = new mongoose.Schema({
+  email: { type: String, required: true, unique: true },
+  passwordHash: { type: String, required: true },
+});
+
 export default mongoose.model('User', userSchema);
`;

const GENERATED_FILE_DIFF = `diff --git a/package-lock.json b/package-lock.json
index aaa..bbb 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,3 +1,3 @@
-  "version": "1.0.0",
+  "version": "1.0.1",
`;

describe('processDiff', () => {
  describe('✅ Basic parsing', () => {
    it('should parse a simple single-file diff', () => {
      const result: ProcessedDiff = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles).toHaveLength(1);
      expect(result.allFiles[0]?.filename).toBe('src/auth.ts');
      expect(result.allFiles[0]?.language).toBe('TypeScript');
      expect(result.allFiles[0]?.changeType).toBe('modified');
      expect(result.allFiles[0]?.additions).toBeGreaterThan(0);
    });

    it('should parse multiple files', () => {
      const result = processDiff(MULTI_FILE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles).toHaveLength(2);
      expect(result.allFiles.map((f) => f.filename)).toContain('src/auth.ts');
      expect(result.allFiles.map((f) => f.filename)).toContain('src/models/user.ts');
    });

    it('should count additions and deletions correctly', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.totalAdditions).toBeGreaterThan(0);
    });
  });

  describe('🧹 Cleaning', () => {
    it('should strip git metadata from diff content', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      const diff = result.allFiles[0]?.cleanDiff ?? '';
      expect(diff).not.toContain('index abc123');
      expect(diff).not.toContain('--- a/');
      expect(diff).not.toContain('+++ b/');
    });

    it('should keep hunk headers and code lines', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      const diff = result.allFiles[0]?.cleanDiff ?? '';
      expect(diff).toContain('@@');
      expect(diff).toContain('+import jwt');
    });
  });

  describe('🚫 Skip patterns', () => {
    it('should skip package-lock.json', () => {
      const result = processDiff(GENERATED_FILE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles).toHaveLength(0);
      expect(result.skippedFiles).toContain('package-lock.json');
    });

    it('should skip files matching node_modules/ pattern', () => {
      const vendorDiff = SIMPLE_DIFF.split('src/auth.ts').join('node_modules/express/lib/router.ts');
      const result = processDiff(vendorDiff, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles).toHaveLength(0);
    });
  });

  describe('📦 Chunking', () => {
    it('should produce at least one chunk for non-empty diff', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should back-fill totalChunks on every chunk', () => {
      const result = processDiff(MULTI_FILE_DIFF, BASE_CONTEXT, EVENT_ID);
      for (const chunk of result.chunks) {
        expect(chunk.totalChunks).toBe(result.chunks.length);
      }
    });

    it('should include contextHeader with PR info', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      const header = result.chunks[0]?.contextHeader ?? '';
      expect(header).toContain('owner/repo');
      expect(header).toContain('42');
    });

    it('should include file diffs in chunk content', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      const content = result.chunks[0]?.content ?? '';
      expect(content).toContain('src/auth.ts');
      expect(content).toContain('```diff');
    });

    it('should handle empty diff gracefully', () => {
      const result = processDiff('', BASE_CONTEXT, EVENT_ID);
      expect(result.chunks).toHaveLength(0);
      expect(result.allFiles).toHaveLength(0);
    });
  });

  describe('🌐 Language detection', () => {
    it('should detect TypeScript', () => {
      const result = processDiff(SIMPLE_DIFF, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles[0]?.language).toBe('TypeScript');
    });

    it('should detect Python files', () => {
      const pyDiff = SIMPLE_DIFF.replace(/src\/auth\.ts/g, 'src/auth.py');
      const result = processDiff(pyDiff, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles[0]?.language).toBe('Python');
    });

    it('should label unknown extensions as Unknown', () => {
      const weirdDiff = SIMPLE_DIFF.replace(/src\/auth\.ts/g, 'src/auth.xyz');
      const result = processDiff(weirdDiff, BASE_CONTEXT, EVENT_ID);
      expect(result.allFiles[0]?.language).toBe('Unknown');
    });
  });
});
