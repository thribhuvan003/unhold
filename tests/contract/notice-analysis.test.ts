import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/cases/[id]/notice-analysis/route';
import { errorEnvelopeSchema } from '@/lib/validation/api-schemas';
import type { NoticeAnalysisOutput } from '@/lib/agents/schemas';

const caseId = '22222222-2222-4222-8222-222222222222';
const userId = '55555555-5555-4555-8555-555555555555';

const userIdRef: { current: string | null } = { current: null };
const caseRowRef: { current: { id: string; user_id: string | null; guest_session_id: string | null } | null } = {
  current: null,
};
const hasConsentMock = vi.fn();
const analyzeNoticeMock = vi.fn();
const noticeInsertMock = vi.fn();
const actionLogInsertMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: userIdRef.current ? { id: userIdRef.current } : null } }) },
  }),
}));

vi.mock('@/lib/consent/record', () => ({
  hasGrantedConsent: (...args: unknown[]) => hasConsentMock(...args),
}));

vi.mock('@/lib/agents/notice/runner', () => ({
  analyzeNotice: (...args: unknown[]) => analyzeNoticeMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'cases') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: caseRowRef.current ? { ...caseRowRef.current, frozen_amount_paise: 2500000 } : null,
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'notice_analysis') {
        return { insert: () => ({ select: () => ({ single: () => Promise.resolve(noticeInsertMock()) }) }) };
      }
      if (table === 'swarm_events') {
        return { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'e-1' }, error: null }) }) }) };
      }
      if (table === 'action_logs') {
        return { insert: actionLogInsertMock };
      }
      if (table === 'permissions') {
        return { select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

function postRequest(body?: unknown) {
  return new NextRequest(`http://localhost/api/v1/cases/${caseId}/notice-analysis`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function validAnalysis(): NoticeAnalysisOutput {
  return {
    freeze_reason: 'cyber_upi_chain',
    severity: 'high',
    confidence: 0.8,
    plain_english: 'Frozen on a cyber-fraud complaint.',
    what_this_means: 'Locked pending investigation.',
    suggested_next: ['Gather statement'],
    extracted: { bank_name: 'SBI', amount_paise: 2500000, reference: 'NCRP123' },
    human_review_required: false,
  };
}

describe('POST /cases/:id/notice-analysis', () => {
  beforeEach(() => {
    userIdRef.current = null;
    caseRowRef.current = null;
    hasConsentMock.mockReset();
    analyzeNoticeMock.mockReset();
    noticeInsertMock.mockReset().mockReturnValue({ data: { id: 'na-1' }, error: null });
    actionLogInsertMock.mockReset().mockResolvedValue({ error: null });
  });

  it('returns 401 with no auth', async () => {
    const response = await POST(postRequest({ input_kind: 'text', pasted_text: 'x' }), {
      params: Promise.resolve({ id: caseId }),
    });
    expect(response.status).toBe(401);
    expect(errorEnvelopeSchema.safeParse(await response.json()).success).toBe(true);
  });

  it('returns 422 and never calls the model when AI consent is not granted', async () => {
    userIdRef.current = userId;
    caseRowRef.current = { id: caseId, user_id: userId, guest_session_id: null };
    hasConsentMock.mockResolvedValue(false);

    const response = await POST(postRequest({ input_kind: 'text', pasted_text: 'frozen notice' }), {
      params: Promise.resolve({ id: caseId }),
    });
    const json = await response.json();
    expect(response.status).toBe(422);
    expect(json.error.guard).toBe('ai_ocr_processing_consent');
    expect(analyzeNoticeMock).not.toHaveBeenCalled();
  });

  it('stores the analysis and logs notice.analyzed on success', async () => {
    userIdRef.current = userId;
    caseRowRef.current = { id: caseId, user_id: userId, guest_session_id: null };
    hasConsentMock.mockResolvedValue(true);
    analyzeNoticeMock.mockResolvedValue(validAnalysis());

    const response = await POST(postRequest({ input_kind: 'text', pasted_text: 'frozen notice' }), {
      params: Promise.resolve({ id: caseId }),
    });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.analysis_id).toBe('na-1');
    expect(json.analysis.freeze_reason).toBe('cyber_upi_chain');
    expect(actionLogInsertMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'notice.analyzed' }));
  });

  it('returns 200 with null analysis (manual fallback) when analysis is unavailable', async () => {
    userIdRef.current = userId;
    caseRowRef.current = { id: caseId, user_id: userId, guest_session_id: null };
    hasConsentMock.mockResolvedValue(true);
    analyzeNoticeMock.mockResolvedValue(null);

    const response = await POST(postRequest({ input_kind: 'text', pasted_text: 'garbled' }), {
      params: Promise.resolve({ id: caseId }),
    });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.analysis).toBeNull();
    expect(json.analysis_id).toBeNull();
  });
});
