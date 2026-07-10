import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MonitorTickOutputSchema } from '@/lib/agents/schemas';
import { MONITOR_SYSTEM_PROMPT } from '@/lib/agents/prompts/monitor';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/user-actions/create', () => ({
  createUserAction: vi.fn().mockResolvedValue('action-id'),
}));

vi.mock('@/lib/swarm/append-event', () => ({
  appendSwarmEvent: vi.fn().mockResolvedValue('event-id'),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { runMonitorTick } from '@/lib/agents/monitor/runner';

const mockCase = {
  id: 'case-1',
  status: 'monitoring',
  created_at: new Date().toISOString(),
};

function mockSupabase(caseRow: typeof mockCase, escalationDue: string | null = null) {
  const from = vi.fn((table: string) => {
    if (table === 'cases') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: caseRow, error: null }),
          }),
        }),
      };
    }
    if (table === 'escalations') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: escalationDue ? { response_due_at: escalationDue } : null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    return {};
  });

  return { from };
}

describe('MONITOR_SYSTEM_PROMPT', () => {
  it('exports non-empty prompt string', () => {
    expect(MONITOR_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(MONITOR_SYSTEM_PROMPT).toContain('never auto-transition');
    expect(MONITOR_SYSTEM_PROMPT).toContain('22:00–08:00 IST');
  });
});

describe('runMonitorTick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns valid MonitorTickOutput for monitoring case', async () => {
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase(mockCase) as never);
    const output = await runMonitorTick({ case_id: 'case-1' });
    expect(() => MonitorTickOutputSchema.parse(output)).not.toThrow();
    expect(output.suggest_status_transition).toBeNull();
  });

  it('suggests wait when awaiting_response before due date', async () => {
    const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(createAdminClient).mockReturnValue(
      mockSupabase({ ...mockCase, status: 'awaiting_response' }, futureDue) as never,
    );
    const output = await runMonitorTick({
      case_id: 'case-1',
      case_status: 'awaiting_response',
      escalation_response_due_at: futureDue,
    });
    expect(output.user_action_required).toBe(false);
    expect(output.action_code).toBe('await_response');
  });

  it('flags overdue awaiting_response', async () => {
    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(createAdminClient).mockReturnValue(
      mockSupabase({ ...mockCase, status: 'awaiting_response' }, pastDue) as never,
    );
    const output = await runMonitorTick({
      case_id: 'case-1',
      escalation_response_due_at: pastDue,
    });
    expect(output.user_action_required).toBe(true);
    expect(output.action_code).toBe('review_timeout');
  });
});