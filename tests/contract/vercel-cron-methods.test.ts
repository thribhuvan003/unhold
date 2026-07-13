import { describe, expect, it } from 'vitest';
import {
  GET as getTick,
  POST as postTick,
} from '@/app/api/v1/internal/cron/tick/route';
import {
  GET as getReminders,
  POST as postReminders,
} from '@/app/api/v1/internal/cron/reminders/route';
import {
  GET as getRankings,
  POST as postRankings,
} from '@/app/api/v1/internal/cron/rankings/route';

describe('Vercel Cron route methods', () => {
  it.each([
    ['tick', getTick, postTick],
    ['reminders', getReminders, postReminders],
    ['rankings', getRankings, postRankings],
  ])('%s accepts GET through the authenticated production handler', (_name, get, post) => {
    expect(get).toBe(post);
  });
});
