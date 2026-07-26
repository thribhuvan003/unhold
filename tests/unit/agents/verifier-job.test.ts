import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Database } from '@/supabase/database.types';

type AgentJobRow = Database['public']['Tables']['agent_jobs']['Row'];

const hasGrantedConsentMock = vi.fn();
const isNvidiaLlmConfiguredMock = vi.fn();
const appendSwarmEventMock = vi.fn();
const enqueueHumanGateMock = vi.fn();
const evidenceSelectSingleMock = vi.fn();
const caseSelectMaybeSingleMock = vi.fn();
const evidenceUpdateEqMock = vi.fn();

vi.mock('@/lib/llm/nvidia', async () => {
  const actual = await vi.importActual<typeof import('@/lib/llm/nvidia')>('@/lib/llm/nvidia');
  return { ...actual, isNvidiaLlmConfigured: () => isNvidiaLlmConfiguredMock() };
});

vi.mock('@/lib/consent/record', () => ({
  hasGrantedConsent: (...args: unknown[]) => hasGrantedConsentMock(...args),
}));

vi.mock('@/lib/swarm/append-event', () => ({
  appendSwarmEvent: (...args: unknown[]) => appendSwarmEventMock(...args),
}));

vi.mock('@/lib/ops/human-gate', () => ({
  enqueueHumanGate: (...args: unknown[]) => enqueueHumanGateMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'evidence') {
        return {
          select: () => ({ eq: () => ({ single: () => evidenceSelectSingleMock() }) }),
          update: () => ({ eq: () => evidenceUpdateEqMock() }),
        };
      }
      if (table === 'cases') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => caseSelectMaybeSingleMock() }) }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

describe('runVerifierJob side effects', () => {
  beforeEach(() => {
    hasGrantedConsentMock.mockReset().mockResolvedValue(false);
    isNvidiaLlmConfiguredMock.mockReset().mockReturnValue(false);
    appendSwarmEventMock.mockReset().mockResolvedValue('event-1');
    enqueueHumanGateMock.mockReset().mockResolvedValue(undefined);
    evidenceSelectSingleMock.mockReset().mockResolvedValue({
      data: { id: 'ev-1', case_id: 'case-1', storage_path: 'case-1/ev-1/sms.jpg', mime_type: 'image/jpeg' },
      error: null,
    });
    caseSelectMaybeSingleMock.mockReset().mockResolvedValue({
      data: { frozen_amount_paise: 2500000 },
      error: null,
    });
    evidenceUpdateEqMock.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it('publishes verification flags in the swarm event metadata, keyed by evidence_id', async () => {
    const { runVerifierJob } = await import('@/lib/agents/verifier/runner');
    const job = { id: 'job-1', payload_json: { evidence_id: 'ev-1' } } as unknown as AgentJobRow;

    await runVerifierJob(job);

    expect(appendSwarmEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'evidence.verified',
        metadata: expect.objectContaining({
          evidence_id: 'ev-1',
          confidence: 0,
          forgery_risk: false,
          forgery_flags: [],
          mismatches: [],
          human_review_required: true,
        }),
      }),
    );
  });
});
