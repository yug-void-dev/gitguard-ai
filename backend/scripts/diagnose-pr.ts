import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { GitHubComment } from '../src/models/GitHubComment';
import { User } from '../src/models/User';
import { createOctokitClient } from '../src/github/octokitClient';
import { closeRedisConnection } from '../src/config/redis-config';

async function main() {
  console.log('🚀 Connecting to DB...');
  await connectDatabase();

  // Find the latest GitHubComment
  const latestComment = await GitHubComment.findOne().sort({ createdAt: -1 });
  if (!latestComment) {
    console.log('❌ No GitHub comments found in database.');
    await disconnectDatabase();
    return;
  }

  console.log('📝 Latest Comment Details:');
  console.log(`  - ID: ${latestComment._id}`);
  console.log(`  - Repository: ${latestComment.repository.fullName}`);
  console.log(`  - PR Number: ${latestComment.prNumber}`);
  console.log(`  - Status: ${latestComment.status}`);

  // Find the user
  const user = await User.findOne({ login: latestComment.repository.owner }).select('+accessToken');
  if (!user) {
    console.log(`❌ Owner user "${latestComment.repository.owner}" not found in database.`);
    // Let's get any user
    const anyUser = await User.findOne().select('+accessToken');
    if (anyUser) {
      console.log(`ℹ️ Found fallback user: ${anyUser.login}`);
      testWithUser(anyUser, latestComment);
    } else {
      console.log('❌ No users found in database.');
      await disconnectDatabase();
    }
  } else {
    await testWithUser(user, latestComment);
  }
}

async function testWithUser(user: any, comment: any) {
  const token = user.accessToken;
  if (!token) {
    console.log(`❌ User "${user.login}" does not have an access token stored in the database.`);
    await disconnectDatabase();
    return;
  }

  console.log(`🔑 Testing GitHub API access using token for user "${user.login}" (Token starts with: ${token.substring(0, 8)}...)`);

  const octokit = createOctokitClient(token);
  const owner = comment.repository.owner;
  const repo = comment.repository.name;
  const prNumber = comment.prNumber;

  try {
    console.log(`📡 Fetching PR #${prNumber} from GitHub (${owner}/${repo})...`);
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    console.log(`✅ Success! PR #${prNumber} exists.`);
    console.log(`  - Title: ${pr.title}`);
    console.log(`  - State: ${pr.state}`);
    console.log(`  - Head Branch: ${pr.head.ref}`);
    console.log(`  - Base Branch: ${pr.base.ref}`);

    console.log(`📡 Testing file content fetch for: ${comment.inlineComments?.[0]?.filename || 'src/db.ts'}`);
    const filePath = comment.inlineComments?.[0]?.filename || 'src/db.ts';
    try {
      const fileResponse = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: pr.head.ref,
      });
      console.log(`✅ File fetched successfully! Data type: ${typeof fileResponse.data}`);
    } catch (fileErr: any) {
      console.log(`❌ Failed to fetch file content: ${fileErr.status} - ${fileErr.message}`);
    }

  } catch (err: any) {
    console.log('❌ GitHub API Error:');
    console.log(`  Status: ${err.status}`);
    console.log(`  Message: ${err.message}`);
    console.log('  Documentation URL:', err.response?.data?.documentation_url);
    if (err.status === 404) {
      console.log('\n💡 Diagnosis: GitHub returned 404 (Not Found). Possible reasons:');
      console.log('  1. The PR number actually does not exist in the repository on GitHub.');
      console.log('  2. The OAuth token does not have access/permissions for this repository.');
      console.log('  3. The OAuth scopes requested during login are insufficient (e.g. need "repo" scope).');
    }
  }

  await disconnectDatabase();
  await closeRedisConnection();
}

main().catch(err => {
  console.error('❌ Diagnostic script error:', err);
  process.exit(1);
});
