/**
 * @file tests/helpers/triggerTestReview.ts
 * @description Manual test helper to trigger a PR review job locally.
 *
 * This script simulates a GitHub 'push' webhook event by sending a POST
 * request directly to the local server. It bypasses the need for ngrok/localtunnel.
 */

import axios from 'axios';
import crypto from 'crypto';

const TARGET_URL = 'http://localhost:5000/api/webhooks/github';
const SECRET = 'GitGuard_Webhook_Secret_2026';

async function trigger() {
  console.log('🚀 Simulating GitHub Webhook event...');

  const payload = {
    ref: 'refs/heads/main',
    before: '0000000000000000000000000000000000000000',
    after: '6111111111111111111111111111111111111111',
    repository: {
      name: 'gitguard-ai',
      full_name: 'yug-void-dev/gitguard-ai',
      owner: { name: 'yug-void-dev' },
      private: false,
    },
    pusher: { name: 'test-user' },
    commits: [
      {
        id: '6111111111111111111111111111111111111111',
        message: 'feat: add new security module',
        author: { name: 'test-user' },
        added: ['src/security.ts'],
        removed: [],
        modified: ['package.json'],
      },
    ],
  };

  const body = JSON.stringify(payload);

  // Compute HMAC signature (as GitHub does)
  const signature =
    'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');

  try {
    const response = await axios.post(TARGET_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': crypto.randomUUID(),
        'x-hub-signature-256': signature,
      },
    });

    console.log('✅ Webhook accepted by server!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log(
      '\n👉 Check your main backend terminal to see the worker processing the job.',
    );
  } catch (error: any) {
    console.error('❌ Failed to trigger webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

trigger();
