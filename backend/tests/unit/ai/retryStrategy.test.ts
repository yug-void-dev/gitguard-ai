/**
 * @file tests/unit/ai/retryStrategy.test.ts
 * @description Unit tests for the exponential back-off retry wrapper.
 *
 * Uses real (but short) delays to avoid flaky fake timer interactions.
 */

import { withRetry, computeDelay } from '../../../src/ai/retryStrategy';

const EVENT_ID = 'test-retry-event';

// ─── computeDelay ─────────────────────────────────────────────────────────────

describe('computeDelay()', () => {
  it('returns baseDelay on attempt 1', () => {
    expect(computeDelay(1, 500, 8000)).toBe(500);
  });

  it('doubles on each attempt (exponential)', () => {
    expect(computeDelay(2, 500, 8000)).toBe(1000);
    expect(computeDelay(3, 500, 8000)).toBe(2000);
    expect(computeDelay(4, 500, 8000)).toBe(4000);
  });

  it('caps at maxDelay', () => {
    expect(computeDelay(10, 500, 8000)).toBe(8000);
  });
});

// ─── withRetry — success path ──────────────────────────────────────────────────

describe('withRetry() — success cases', () => {
  it('returns result immediately on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, {}, EVENT_ID);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds on second attempt after one transient failure', async () => {
    const transientError = Object.assign(new Error('Service Unavailable'), {
      response: { status: 503 },
    });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce('recovered');

    // Small delay (1ms) for fast tests
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 }, EVENT_ID);

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('succeeds on third attempt after two failures', async () => {
    const transientError = Object.assign(new Error('Too Many Requests'), {
      response: { status: 429 },
    });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce('final-success');

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 }, EVENT_ID);

    expect(result).toBe('final-success');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ─── withRetry — failure path ─────────────────────────────────────────────────

describe('withRetry() — failure cases', () => {
  it('throws immediately on non-retryable error', async () => {
    const hardError = new Error('Validation failed');
    const fn = jest.fn().mockRejectedValue(hardError);

    await expect(withRetry(fn, { maxAttempts: 3 }, EVENT_ID)).rejects.toThrow('Validation failed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all attempts on persistent transient error', async () => {
    const rateLimitError = Object.assign(new Error('Rate limited'), {
      response: { status: 429 },
    });
    const fn = jest.fn().mockRejectedValue(rateLimitError);

    await expect(
      withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 }, EVENT_ID)
    ).rejects.toThrow('Rate limited');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('respects custom shouldRetry predicate', async () => {
    const customError = new Error('custom-retryable');
    const fn = jest
      .fn()
      .mockRejectedValueOnce(customError)
      .mockResolvedValueOnce('success');

    const result = await withRetry(
      fn,
      {
        maxAttempts: 2,
        baseDelayMs: 1,
        shouldRetry: (err) => (err as Error).message === 'custom-retryable',
      },
      EVENT_ID
    );

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on ECONNRESET network error', async () => {
    const networkError = Object.assign(new Error('socket hang up'), {
      code: 'ECONNRESET',
    });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('reconnected');

    const result = await withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 }, EVENT_ID);

    expect(result).toBe('reconnected');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ─── withRetry — custom options ───────────────────────────────────────────────

describe('withRetry() — options', () => {
  it('uses maxAttempts = 1 (no retries)', async () => {
    const err = Object.assign(new Error('fail'), { response: { status: 503 } });
    const fn = jest.fn().mockRejectedValue(err);

    await expect(withRetry(fn, { maxAttempts: 1 }, EVENT_ID)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
