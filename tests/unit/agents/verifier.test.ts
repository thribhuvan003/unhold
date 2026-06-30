import { describe, expect, it, vi, beforeEach } from 'vitest';
import { VerifierResultOutputSchema, type VerifierResultOutput } from '@/lib/agents/schemas';
import { validateVerifierOutput } from '@/lib/agents/validators';
import { redactExtractedFields, redactForgeryFlags, redactMismatches, redactPiiText } from '@/lib/redaction/pii';

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
    storage: {
      from: () => ({ download: () => storageDownloadMock() }),
    },
  }),
}));

function fullOutput(overrides: Partial<VerifierResultOutput> = {}): VerifierResultOutput {
  return VerifierResultOutputSchema.parse({
    confidence: 0.95,
    field_confidence: { bank_name: 0.95 },
    extracted: { bank_name: 'State Bank of India', amount_paise: 2500000, ncrp_id: '12345678901234' },
    forgery_risk: false,
    forgery_flags: [],
    mismatches: [],
    human_review_required: false,
    ...overrides,
  });
}

describe('validateVerifierOutput', () => {
  it('is invalid when forgery_risk coexists with high confidence', () => {
    const result = validateVerifierOutput(fullOutput({ forgery_risk: true, confidence: 0.9 }));
    expect(result.valid).toBe(false);
  });

  it('is valid and does not require human gate for a clean high-confidence output', () => {
    const result = validateVerifierOutput(fullOutput());
    expect(result.valid).toBe(true);
    expect(result.human_gate_required).toBe(false);
  });

  it('requires human gate just below the 0.85 threshold', () => {
    const result = validateVerifierOutput(fullOutput({ confidence: 0.84 }));
    expect(result.human_gate_required).toBe(true);
  });

  it('does not require human gate at exactly the 0.85 threshold', () => {
    const result = validateVerifierOutput(fullOutput({ confidence: 0.85 }));
    expect(result.human_gate_required).toBe(false);
  });

  it('requires human gate when human_review_required is set regardless of confidence', () => {
    const result = validateVerifierOutput(fullOutput({ confidence: 0.99, human_review_required: true }));
    expect(result.human_gate_required).toBe(true);
  });

  it('requires human gate whenever forgery_risk is true', () => {
    const result = validateVerifierOutput(fullOutput({ forgery_risk: true, confidence: 0.5 }));
    expect(result.human_gate_required).toBe(true);
  });
});

describe('VerifierResultOutputSchema', () => {
  it('rejects an ncrp_id that is not exactly 14 digits', () => {
    const result = VerifierResultOutputSchema.safeParse({
      confidence: 0.9,
      field_confidence: {},
      extracted: { ncrp_id: '12345' },
      forgery_risk: false,
      forgery_flags: [],
      mismatches: [],
      human_review_required: false,
    });
    expect(result.success).toBe(false);
  });

  it('accepts output with every extracted field omitted', () => {
    const result = VerifierResultOutputSchema.safeParse({
      confidence: 0.2,
      field_confidence: {},
      extracted: {},
      forgery_risk: false,
      forgery_flags: [],
      mismatches: [],
      human_review_required: true,
    });
    expect(result.success).toBe(true);
  });
});

describe('redactPiiText', () => {
  it('masks a PAN-like pattern to the first 5 chars redacted', () => {
    expect(redactPiiText('PAN: ABCDE1234F on file')).toContain('XXXXX1234F');
  });

  it('masks a long digit sequence to its last 4 digits', () => {
    expect(redactPiiText('Account 123456789012')).toContain('XXXXXXXX9012');
  });

  it('is a no-op on text with no PII-shaped patterns', () => {
    expect(redactPiiText('State Bank of India, Mumbai')).toBe('State Bank of India, Mumbai');
  });

  it('masks a digit run glued directly onto a preceding label with no separator', () => {
    // realistic OCR output: no space between an abbreviation and the number
    expect(redactPiiText('Acc123456789012')).toContain('XXXXXXXX9012');
    expect(redactPiiText('Acc123456789012')).not.toMatch(/123456789012/);
  });
});

describe('redactExtractedFields', () => {
  it('redacts bank_name and freeze_type, leaving ncrp_id/amount_paise untouched', () => {
    const redacted = redactExtractedFields({
      bank_name: 'Acct 123456789012 SBI',
      freeze_type: 'debit_freeze ref 123456789012',
      amount_paise: 2500000,
      ncrp_id: '12345678901234',
      date_detected: '2026-01-15',
    });
    expect(redacted.bank_name).toContain('XXXXXXXX9012');
    expect(redacted.freeze_type).toContain('XXXXXXXX9012');
    expect(redacted.amount_paise).toBe(2500000);
    expect(redacted.ncrp_id).toBe('12345678901234');
    expect(redacted.date_detected).toBe('2026-01-15');
  });
});

describe('redactForgeryFlags', () => {
  it('redacts PII-shaped text echoed in a forgery flag', () => {
    const redacted = redactForgeryFlags(['Account 123456789012 appears edited']);
    expect(redacted[0]).toContain('XXXXXXXX9012');
    expect(redacted[0]).not.toMatch(/123456789012/);
  });
});

describe('redactMismatches', () => {
  it('redacts expected/found free text but leaves the field name untouched', () => {
    const redacted = redactMismatches([
      { field: 'amount_paise', expected: '2500000', found: 'Acc123456789012' },
    ]);
    expect(redacted[0].field).toBe('amount_paise');
    expect(redacted[0].found).toContain('XXXXXXXX9012');
    expect(redacted[0].found).not.toMatch(/123456789012/);
  });
});

describe('runVerifier', () => {
  beforeEach(() => {
    chatCompletionMock.mockReset();
    isLlmConfiguredMock.mockReset();
    hasGrantedConsentMock.mockReset();
    storageDownloadMock.mockReset();
  });

  async function importRunner() {
    return import('@/lib/agents/verifier/runner');
  }

  it('skips OCR entirely for a PDF evidence file', async () => {
    const { runVerifier } = await importRunner();
    const output = await runVerifier({
      evidence_id: 'ev-1',
      case_id: 'case-1',
      storage_path: 'case-1/ev-1/statement.pdf',
      mime_type: 'application/pdf',
      frozen_amount_paise: 2500000,
    });

    expect(output.human_review_required).toBe(true);
    expect(output.confidence).toBe(0);
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it('does not skip a supported image mime type', async () => {
    isLlmConfiguredMock.mockReturnValue(false);
    const { runVerifier } = await importRunner();
    const output = await runVerifier({
      evidence_id: 'ev-1',
      case_id: 'case-1',
      storage_path: 'case-1/ev-1/sms.jpg',
      mime_type: 'image/jpeg',
      frozen_amount_paise: 2500000,
    });

    // Falls back to no-OCR because the LLM isn't configured, but it did
    // reach that branch rather than being skipped for format reasons.
    expect(output.human_review_required).toBe(true);
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it('short-circuits to no-OCR when consent has not been granted', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(false);
    const { runVerifier } = await importRunner();

    const output = await runVerifier({
      evidence_id: 'ev-1',
      case_id: 'case-1',
      storage_path: 'case-1/ev-1/sms.jpg',
      mime_type: 'image/jpeg',
      frozen_amount_paise: 2500000,
    });

    expect(output.human_review_required).toBe(true);
    expect(hasGrantedConsentMock).toHaveBeenCalledWith('case-1', 'ai_ocr_processing');
    expect(storageDownloadMock).not.toHaveBeenCalled();
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it('returns the redacted, validated LLM output on a successful extraction', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(true);
    storageDownloadMock.mockResolvedValue({
      data: { arrayBuffer: async () => new TextEncoder().encode('fake-image-bytes').buffer },
      error: null,
    });
    chatCompletionMock.mockResolvedValue(
      JSON.stringify({
        confidence: 0.9,
        field_confidence: { bank_name: 0.9 },
        extracted: { bank_name: 'Acct 123456789012 SBI', amount_paise: 2500000 },
        forgery_risk: false,
        forgery_flags: [],
        mismatches: [{ field: 'amount_paise', expected: '2500000', found: 'Acc123456789012' }],
        human_review_required: false,
      }),
    );

    const { runVerifier } = await importRunner();
    const output = await runVerifier({
      evidence_id: 'ev-1',
      case_id: 'case-1',
      storage_path: 'case-1/ev-1/sms.jpg',
      mime_type: 'image/jpeg',
      frozen_amount_paise: 2500000,
    });

    expect(output.confidence).toBe(0.9);
    expect(output.extracted.bank_name).toContain('XXXXXXXX9012');
    expect(output.human_review_required).toBe(false);
    // SEC-2: mismatches echo model free-text read off the document image —
    // same PII-echo risk as `extracted`, redacted the same way (forgery_flags
    // redaction is covered independently in the `redactForgeryFlags` suite above).
    expect(output.mismatches[0].found).toContain('XXXXXXXX9012');
    expect(output.mismatches[0].found).not.toMatch(/123456789012/);
  });

  it('falls back to no-OCR when the model response is not parsable JSON', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(true);
    storageDownloadMock.mockResolvedValue({
      data: { arrayBuffer: async () => new TextEncoder().encode('fake-image-bytes').buffer },
      error: null,
    });
    chatCompletionMock.mockResolvedValue('not json at all');

    const { runVerifier } = await importRunner();
    const output = await runVerifier({
      evidence_id: 'ev-1',
      case_id: 'case-1',
      storage_path: 'case-1/ev-1/sms.jpg',
      mime_type: 'image/jpeg',
      frozen_amount_paise: 2500000,
    });

    expect(output.human_review_required).toBe(true);
    expect(output.confidence).toBe(0);
  });

  it('falls back to no-OCR (keeping forgery_risk) when the model returns an internally inconsistent result', async () => {
    isLlmConfiguredMock.mockReturnValue(true);
    hasGrantedConsentMock.mockResolvedValue(true);
    storageDownloadMock.mockResolvedValue({
      data: { arrayBuffer: async () => new TextEncoder().encode('fake-image-bytes').buffer },
      error: null,
    });
    chatCompletionMock.mockResolvedValue(
      JSON.stringify({
        confidence: 0.95,
        field_confidence: {},
        extracted: {},
        forgery_risk: true,
        forgery_flags: ['edited_amount_field'],
        mismatches: [],
        human_review_required: false,
      }),
    );

    const { runVerifier } = await importRunner();
    const output = await runVerifier({
      evidence_id: 'ev-1',
      case_id: 'case-1',
      storage_path: 'case-1/ev-1/sms.jpg',
      mime_type: 'image/jpeg',
      frozen_amount_paise: 2500000,
    });

    expect(output.human_review_required).toBe(true);
    expect(output.forgery_risk).toBe(true);
    expect(output.confidence).toBe(0);
  });
});
