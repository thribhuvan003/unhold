import { describe, expect, it, vi } from 'vitest';
import { withReadRetry } from '@/lib/supabase/retry';

describe('withReadRetry', () => {
  it('returns the result without retrying when the read succeeds', async () => {
    const read = vi.fn().mockResolvedValue('ok');
    await expect(withReadRetry(read)).resolves.toBe('ok');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('retries a transient blip and resolves once it clears', async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValue('ok');
    await expect(withReadRetry(read, { baseDelayMs: 0 })).resolves.toBe('ok');
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('re-throws after exhausting all attempts', async () => {
    const read = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(withReadRetry(read, { attempts: 3, baseDelayMs: 0 })).rejects.toThrow(
      'fetch failed',
    );
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('does not retry deterministic errors rejected by shouldRetry', async () => {
    const deterministic = new Error('forbidden');
    const read = vi.fn().mockRejectedValue(deterministic);
    await expect(
      withReadRetry(read, { baseDelayMs: 0, shouldRetry: () => false }),
    ).rejects.toBe(deterministic);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
