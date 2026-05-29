import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Repository } from '../src/models/Repository';
import { User } from '../src/models/User';
import { Review } from '../src/models/Review';

async function main() {
  console.log('Connecting to database...');
  await connectDatabase();

  const repos = await Repository.find().lean();
  console.log('--- Connected Repositories ---');
  console.log(JSON.stringify(repos, null, 2));

  const users = await User.find().lean();
  console.log('--- Users ---');
  console.log(JSON.stringify(users.map((u: any) => ({ _id: u._id, login: u.login, hasToken: !!u.accessToken })), null, 2));

  const reviews = await Review.find().sort({ createdAt: -1 }).limit(3).lean();
  console.log('--- Recent Reviews ---');
  console.log(JSON.stringify(reviews.map((r: any) => ({ _id: r._id, repository: r.repository, prNumber: r.prNumber, status: r.status, summary: r.summary })), null, 2));

  await disconnectDatabase();
}

main().catch(console.error);
