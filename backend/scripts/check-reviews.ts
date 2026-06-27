import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Review } from '../src/models/Review';
import { Repository } from '../src/models/Repository';
import { closeRedisConnection } from '../src/config/redis-config';

async function main() {
  console.log('🚀 Connecting to DB...');
  await connectDatabase();

  const repo = await Repository.findOne({ fullName: 'yug-void-dev/gitguard-ai' });
  if (!repo) {
    console.log('❌ Repository "yug-void-dev/gitguard-ai" not found in DB.');
    await disconnectDatabase();
    return;
  }

  console.log('📝 Repository details:');
  console.log(`  - ID: ${repo._id}`);
  console.log(`  - Full Name: ${repo.fullName}`);
  console.log(`  - Active: ${repo.isActive}`);

  const reviews = await Review.find({ 'repository.fullName': repo.fullName });
  console.log(`\n🔍 Found ${reviews.length} reviews:`);
  for (const review of reviews) {
    console.log(`  - PR #${review.prNumber}: status=${review.status}, title="${review.prTitle}", findingsCount=${review.findings?.length}, qualityScore=${review.metrics?.codeQualityScore}`);
  }

  await disconnectDatabase();
  await closeRedisConnection();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
