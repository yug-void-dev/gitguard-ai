import axios from 'axios';
import crypto from 'crypto';

const TARGET_URL = 'http://localhost:3001/api/webhooks/github';
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your_super_secret_webhook_secret_here';

async function trigger() {
  console.log('🚀 Simulating GitHub Webhook event for anika0520...');

  const payload = {
    action: 'opened',
    number: 42,
    pull_request: {
      id: 123456,
      number: 42,
      state: 'open',
      title: 'feat: AI code review test from anika0520',
      body: 'This PR introduces a brand new module that needs review!',
      html_url: 'https://github.com/anika0520/test-repo/pull/42',
      diff_url: 'https://github.com/facebook/react/pull/31415.diff', // using a real diff URL to ensure the bot can download and review something!
      draft: false,
      additions: 10,
      deletions: 5,
      changed_files: 2,
      commits: 1,
      head: { ref: 'feat/test', sha: '1111111111111111111111111111111111111111' },
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
    console.log('Response:', response.data);
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
