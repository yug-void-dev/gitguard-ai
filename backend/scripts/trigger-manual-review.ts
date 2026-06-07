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

  const prNumber = process.env.PR_NUMBER
    ? parseInt(process.env.PR_NUMBER, 10)
    : Math.floor(Math.random() * 10000) + 200;

  const repositoryFullName = process.env.REPO_FULL_NAME || 'yug-void-dev/gitguard-ai';
  const [ownerLogin, repoName] = repositoryFullName.split('/');

  const eventId = `test-event-${uuidv4().slice(0, 8)}`;

  // This is a sample payload similar to what the GitHub webhook would produce
  const payload: ReviewJobPayload = {
    eventId,
    repositoryFullName,
    ownerLogin,
    repoName,
    prNumber,
    headSha: `test-sha-${uuidv4().slice(0, 8)}`,
    diffUrl: `https://github.com/${repositoryFullName}/pull/${prNumber}.diff`,
    rawDiff: `diff --git a/test.js b/test.js
index 1234567..89abcdef 100644
--- a/test.js
+++ b/test.js
@@ -10,5 +10,10 @@ export async function getUser(id) {
-  return db.query('SELECT * FROM users WHERE id = ' + id);
+  // DANGEROUS: SQL Injection vulnerability for testing
+  return db.query(\`SELECT * FROM users WHERE id = '\${id}'\`);
+}`,

    enqueuedAt: new Date().toISOString(),
    context: {
      prNumber,
      title: `feat: add dangerous sql query (Test PR #${prNumber})`,
      description: 'This is a test PR with a security vulnerability.',
      linkedIssues: [],
      headBranch: 'feat/test',
      baseBranch: 'main',
      language: 'TypeScript',
      changedFiles: 1,
      additions: 10,
      deletions: 2,
      isDraft: false,
      repositoryFullName,
      authorLogin: 'test-user',
    },
  };

  console.log(`📦 Enqueueing job for Event ID: ${eventId} and PR #${prNumber}`);
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

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
