/**
 * @file tests/unit/queue/reviewQueue.test.ts
 * @description Unit tests for the BullMQ review queue module.
 *
 * Uses jest.mock to stub out IORedis and BullMQ so we don't need a live
 * Redis server to run unit tests.
 */

// ─── Mock BullMQ before importing anything ────────────────────────────────────

const mockAdd = jest.fn().mockResolvedValue({ id: 'job-123' });
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockOn = jest.fn().mockReturnThis();
const mockGetJobCounts = jest.fn().mockResolvedValue({
  waiting: 2,
  active: 1,
  completed: 10,
  failed: 0,
  delayed: 0,
  paused: 0,
});
const mockIsPaused = jest.fn().mockResolvedValue(false);

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    close: mockClose,
    on: mockOn,
    name: 'review-pr',
    getJobCounts: mockGetJobCounts,
    isPaused: mockIsPaused,
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: mockOn,
    close: mockClose,
  })),
}));

// Mock IORedis
jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
    quit: jest.fn().mockResolvedValue('OK'),
  })),
);

// Mock env config so we don't need a .env file
jest.mock('../../../src/config/env', () => ({
  env: {
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: '',
    LOG_LEVEL: 'info',
  },
}));

// Now import after mocks are set up
import {
  getReviewQueue,
  enqueueReviewJob,
  closeReviewQueue,
  REVIEW_QUEUE_NAME,
} from '../../../src/queue/reviewQueue';
import { getQueueSnapshot } from '../../../src/queue/queueMetrics';
import { ReviewJobPayload, PRContext } from '../../../src/types/analysis';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockContext(): PRContext {
  return {
    prNumber: 42,
    title: 'Fix off-by-one error',
    description: 'Fixes #7 — the counter was incrementing too early',
    linkedIssues: [7],
    headBranch: 'fix/off-by-one',
    baseBranch: 'main',
    language: 'TypeScript',
    changedFiles: 3,
    additions: 15,
    deletions: 8,
    isDraft: false,
    repositoryFullName: 'acme/my-repo',
    authorLogin: 'dev-alice',
  };
}

function makeMockPayload(eventId = 'evt-001'): ReviewJobPayload {
  return {
    eventId,
    repositoryFullName: 'acme/my-repo',
    ownerLogin: 'acme',
    repoName: 'my-repo',
    prNumber: 42,
    headSha: 'abc123def456',
    diffUrl: 'https://github.com/acme/my-repo/pull/42.diff',
    context: makeMockContext(),
    enqueuedAt: new Date().toISOString(),
  };
}

// ─── getReviewQueue ───────────────────────────────────────────────────────────

describe('getReviewQueue()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a Queue instance', () => {
    const queue = getReviewQueue();
    expect(queue).toBeDefined();
    expect(queue.name).toBe(REVIEW_QUEUE_NAME);
  });

  it('returns the same singleton instance on repeated calls', () => {
    const q1 = getReviewQueue();
    const q2 = getReviewQueue();
    expect(q1).toBe(q2);
  });
});

// ─── enqueueReviewJob ─────────────────────────────────────────────────────────

describe('enqueueReviewJob()', () => {
  beforeEach(() => {
    mockAdd.mockClear();
  });

  it('calls queue.add() with the correct payload', async () => {
    const payload = makeMockPayload('evt-abc');
    await enqueueReviewJob(payload, 'evt-abc');

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith('review-pr', payload, {
      jobId: 'evt-abc',
    });
  });

  it('returns the created job object', async () => {
    const payload = makeMockPayload('evt-def');
    const job = await enqueueReviewJob(payload, 'evt-def');

    expect(job).toBeDefined();
    expect(job.id).toBe('job-123');
  });

  it('uses eventId as jobId for idempotency', async () => {
    const payload = makeMockPayload('unique-event-id');
    await enqueueReviewJob(payload, 'unique-event-id');

    const [, , options] = mockAdd.mock.calls[0];
    expect(options.jobId).toBe('unique-event-id');
  });
});

// ─── closeReviewQueue ─────────────────────────────────────────────────────────

describe('closeReviewQueue()', () => {
  it('calls queue.close() on shutdown', async () => {
    await closeReviewQueue();
    expect(mockClose).toHaveBeenCalled();
  });
});

// ─── getQueueSnapshot ─────────────────────────────────────────────────────────

describe('getQueueSnapshot()', () => {
  it('returns a snapshot with all required fields', async () => {
    const snapshot = await getQueueSnapshot();

    expect(snapshot).toHaveProperty('queueName', REVIEW_QUEUE_NAME);
    expect(snapshot).toHaveProperty('counts');
    expect(snapshot.counts).toHaveProperty('waiting');
    expect(snapshot.counts).toHaveProperty('active');
    expect(snapshot.counts).toHaveProperty('completed');
    expect(snapshot.counts).toHaveProperty('failed');
    expect(snapshot.counts).toHaveProperty('delayed');
    expect(snapshot).toHaveProperty('isPaused');
    expect(snapshot).toHaveProperty('capturedAt');
  });

  it('returns correct job counts from the mock', async () => {
    const snapshot = await getQueueSnapshot();

    expect(snapshot.counts.waiting).toBe(2);
    expect(snapshot.counts.active).toBe(1);
    expect(snapshot.counts.completed).toBe(10);
    expect(snapshot.counts.failed).toBe(0);
  });

  it('capturedAt is a valid ISO 8601 date string', async () => {
    const snapshot = await getQueueSnapshot();
    const date = new Date(snapshot.capturedAt);
    expect(date.toISOString()).toBe(snapshot.capturedAt);
  });
});

// ─── REVIEW_QUEUE_NAME constant ───────────────────────────────────────────────

describe('REVIEW_QUEUE_NAME', () => {
  it('is set to "review-pr"', () => {
    expect(REVIEW_QUEUE_NAME).toBe('review-pr');
  });
});
