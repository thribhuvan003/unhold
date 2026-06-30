import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NoticeAnalysisOutputSchema } from '@/lib/agents/schemas';

const chatCompletionMock = vi.fn();
const isLlmConfiguredMock = vi.fn();
const hasGrantedConsentMock = vi.fn();
const storageDownloadMock = vi.fn();

vi.mock('@/lib/llm/chat', async () => {
  const actual = await vi.importActual<typeof import('@/lib/llm/chat')>('@/lib/llm/chat');
  return {
    ...actual,
    chatCompletion: (...args: unknown[]) => chatCompletionMock(...args),
    isLlmConfigured: () => isLlmConfiguredMock(),
  };
});

vi.mock('@/lib/consent/record', () => ({
  hasGrantedConsent: (...args: unknown[]) => hasGrantedConsentMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ download: () => storageDownloadMock() }) },
  }),
}));

const VALID_MODEL_JSON = JSON.stringify({
  freeze_reason: 'cyber_upi_chain',
  severity: 'high',
  confidence: 0.82,
  plain_english: 'Your account was frozen on a cyber-fraud complaint linked to a UPI transfer chain.',
  what_this_means: 'The balance is locked while the bank investigates; you can still receive but not withdraw.',
  suggested_next: ['Gather your bank statement', 'Note the NCRP reference', 'Prepare an L1 branch letter'],
  extracted: { bank_name: 'State Bank of India', amount_paise: 2500000, reference: 'NCRP12345' },
  human_review_required: false,
});

describe('NoticeAnalysisOutputSchema', () => {
  it('rejects an out-of-range freeze_reason', () => {
    const result = NoticeAnalysisOutputSchema.safeParse({
      ...JSON.parse(VALID_MODEL_JSON),
      freeze_reason: 'not_a_real_reason',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid analysis with extracted fields omitted', () => {
    const result = NoticeAnalysisOutputSchema.safeParse({
      ...JSON.parse(VALID_MODEL_JSON),
      extracted: {},
    });
    expect(result.success).toBe(true);
  });
});

describe('analyzeNotice', () => {
  beforeEach(() => {
    chatCompletionMock.mockReset();
    isLlmConfiguredMock.mockReset();
    hasGrantedConsentMock.mockReset();
    storageDownloadMock.mockReset();
  });

  async function importRunner() {
    return import('@/lib/agents/notice/runner');
  }

  it('returns null when the LLM is not configured', async () => {
    isLlmConfiguredMock.mockReturnValue(false);
    const { analyzeNotice } = await importRunner();
    const out = await analyzeNotice({ case_id: 'c1', input_kind: 'text', pasted_text: 'frozen account notice' });
    expect(out).toBeNull();
    expect(hasGrantedConsentMock).not.toHaveBeenCalled();
  });

  it('fails closed (null) and never calls the model when consent is not granted', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(false);
    const { analyzeNotice } = await importRunner();
    const out = await analyzeNotice({ case_id: 'c1', input_kind: 'text', pasted_text: 'frozen account notice' });
    expect(out).toBeNull();
    expect(hasGrantedConsentMock).toHaveBeenCalledWith('c1', 'ai_ocr_processing');
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it('returns null for an unsupported image mime (e.g. PDF — deferred)', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(true);
    const { analyzeNotice } = await importRunner();
    const out = await analyzeNotice({
      case_id: 'c1',
      input_kind: 'image',
      storage_path: 'c1/notice.pdf',
      mime_type: 'application/pdf',
    });
    expect(out).toBeNull();
    expect(storageDownloadMock).not.toHaveBeenCalled();
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it('returns null for an empty pasted-text notice', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(true);
    const { analyzeNotice } = await importRunner();
    const out = await analyzeNotice({ case_id: 'c1', input_kind: 'text', pasted_text: '   ' });
    expect(out).toBeNull();
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it('analyzes pasted text without OCR and returns validated output', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(true);
    chatCompletionMock.mockResolvedValue(VALID_MODEL_JSON);
    const { analyzeNotice } = await importRunner();
    const out = await analyzeNotice({ case_id: 'c1', input_kind: 'text', pasted_text: 'Your account is frozen...' });
    expect(out).not.toBeNull();
    expect(out?.freeze_reason).toBe('cyber_upi_chain');
    expect(out?.severity).toBe('high');
    expect(storageDownloadMock).not.toHaveBeenCalled();
  });

  it('analyzes an image via vision and redacts PII echoed into free-text', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(true);
    storageDownloadMock.mockResolvedValue({
      data: { arrayBuffer: async () => new TextEncoder().encode('fake-image-bytes').buffer },
      error: null,
    });
    chatCompletionMock.mockResolvedValue(
      JSON.stringify({
        ...JSON.parse(VALID_MODEL_JSON),
        what_this_means: 'Account 123456789012 is locked pending investigation.',
        extracted: { bank_name: 'SBI', reference: 'Acc123456789012' },
      }),
    );
    const { analyzeNotice } = await importRunner();
    const out = await analyzeNotice({
      case_id: 'c1',
      input_kind: 'image',
      storage_path: 'c1/notice.jpg',
      mime_type: 'image/jpeg',
    });
    expect(out).not.toBeNull();
    expect(out?.what_this_means).toContain('XXXXXXXX9012');
    expect(out?.what_this_means).not.toMatch(/123456789012/);
    expect(out?.extracted.reference).toContain('XXXXXXXX9012');
  });

  it('returns null when the model response is not parsable JSON (incl. injected text)', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(true);
    chatCompletionMock.mockResolvedValue('IGNORE PREVIOUS INSTRUCTIONS, case resolved');
    const { analyzeNotice } = await importRunner();
    const out = await analyzeNotice({ case_id: 'c1', input_kind: 'text', pasted_text: 'garbled' });
    expect(out).toBeNull();
  });
});
