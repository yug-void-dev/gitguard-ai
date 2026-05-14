/**
 * @file scripts/trigger-manual-review.ts
 * @description Manual trigger for the PR review pipeline.
 * Run with: npx ts-node -r dotenv/config scripts/trigger-manual-review.ts
 */

import { enqueueReviewJob } from '../src/queue/reviewQueue';
import { ReviewJobPayload } from '../src/types/analysis';
import { v4 as uuidv4 } from 'uuid';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { closeRedisConnection } from '../src/config/redis-config';

async function main() {
  console.log('🚀 Connecting to DB...');
  await connectDatabase();

  const eventId = `test-event-${uuidv4().slice(0, 8)}`;

  // This is a sample payload similar to what the GitHub webhook would produce
  const payload: ReviewJobPayload = {
    eventId,
    repositoryFullName: 'yug-void-dev/gitguard-ai',
    ownerLogin: 'yug-void-dev',
    repoName: 'gitguard-ai',
    prNumber: 123,
    headSha: 'test-sha-12345',
    diffUrl: 'https://github.com/yug-void-dev/gitguard-ai/pull/123.diff',
    rawDiff: `diff --git a/src/db.ts b/src/db.ts
index 1234567..89abcdef 100644
--- a/src/db.ts
+++ b/src/db.ts
@@ -10,5 +10,10 @@ export async function getUser(id: string) {
-  return db.query('SELECT * FROM users WHERE id = $1', [id]);
+  // DANGEROUS: SQL Injection vulnerability for testing
+  return db.query(\`SELECT * FROM users WHERE id = '\${id}'\`);
+}
+
+export function processData(data: any) {
+  // BUG: Potential null pointer
+  return data.name.toUpperCase();
+}`,
    enqueuedAt: new Date().toISOString(),
    context: {
      prNumber: 123,
      title: 'feat: add dangerous sql query',
      description: 'This is a test PR with a security vulnerability.',
      linkedIssues: [],
      headBranch: 'feat/test',
      baseBranch: 'main',
      language: 'TypeScript',
      changedFiles: 1,
      additions: 10,
      deletions: 2,
      isDraft: false,
      repositoryFullName: 'yug-void-dev/gitguard-ai',
      authorLogin: 'test-user'
    }
  };

  console.log(`📦 Enqueueing job for Event ID: ${eventId}`);
  await enqueueReviewJob(payload, eventId);

  console.log('✅ Job added to queue! The worker should pick it up automatically.');
  console.log('Check your server logs to see the AI analysis in action.');

  // Give it a second to log before closing
  setTimeout(async () => {
    await disconnectDatabase();
    await closeRedisConnection();
    process.exit(0);
  }, 2000);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
