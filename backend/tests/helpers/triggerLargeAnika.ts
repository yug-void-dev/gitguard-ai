import axios from 'axios';
import crypto from 'crypto';

const TARGET_URL = 'http://localhost:3001/api/webhooks/github';
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your_super_secret_webhook_secret_here';

const rawDiffString = `diff --git a/src/auth.ts b/src/auth.ts
index 832f05a..e74d1a5 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,5 +10,15 @@
 export function authenticate(user, password) {
-  if (user === "admin" && password === "secret") {
-    return true;
-  }
+  // Quick hack to fix login issues
+  const query = "SELECT * FROM users WHERE username = '" + user + "' AND password = '" + password + "'";
+  const dbResult = db.execute(query);
+  
+  // Added hardcoded JWT for testing
+  const testJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
+  
+  if (dbResult.length > 0) {
+    return testJwt;
+  }
   return false;
 }
diff --git a/src/utils.ts b/src/utils.ts
index a123bcd..f987def 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -50,6 +50,13 @@
 export function processData(input) {
   let result = [];
   for (let i = 0; i < input.length; i++) {
-    result.push(input[i].trim());
+    // TODO: Need to optimize this loop
+    for (let j = 0; j < 10000; j++) {
+      result.push(input[i].trim() + j);
+    }
   }
+  
+  eval("console.log('Processing finished')");
+  
   return result;
 }
`;

async function trigger() {
  console.log('🚀 Simulating custom PR with raw diff for anika0520...');

  const payload = {
    action: 'opened',
    number: 999,
    rawDiff: rawDiffString,
    pull_request: {
      id: 9999999,
      number: 999,
      state: 'open',
      title: 'feat: explicit raw diff test from anika0520',
      body: 'This PR introduces a raw diff directly to bypass github size limits!',
      html_url: 'https://github.com/anika0520/test-repo/pull/999',
      diff_url: 'https://github.com/facebook/react/pull/999.diff', 
      draft: false,
      additions: 15,
      deletions: 4,
      changed_files: 2,
      commits: 2,
      head: { ref: 'feat/rawdiff', sha: '3333333333333333333333333333333333333333' },
      base: { ref: 'main', sha: '0000000000000000000000000000000000000000' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        login: 'anika0520',
        id: 9876543,
        avatar_url: 'https://github.com/anika0520.png',
        type: 'User'
      }
    },
    repository: {
      id: 55555,
      name: 'test-repo',
      full_name: 'anika0520/test-repo',
      private: false,
      html_url: 'https://github.com/anika0520/test-repo',
      default_branch: 'main',
      language: 'TypeScript',
      owner: {
        login: 'anika0520',
        id: 9876543,
        avatar_url: 'https://github.com/anika0520.png',
        type: 'User'
      }
    },
    sender: {
      login: 'anika0520',
      id: 9876543,
      avatar_url: 'https://github.com/anika0520.png',
      type: 'User'
    }
  };

  const body = JSON.stringify(payload);

  const signature = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(body)
    .digest('hex');

  try {
    const response = await axios.post(TARGET_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request',
        'x-github-delivery': crypto.randomUUID(),
        'x-hub-signature-256': signature,
      },
    });

    console.log('✅ Webhook accepted by server!');
    console.log('Status:', response.status);
  } catch (error: any) {
    console.error('❌ Failed to trigger webhook:');
  }
}

trigger();
