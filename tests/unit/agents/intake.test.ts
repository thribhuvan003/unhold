import { describe, expect, it } from 'vitest';
import { buildIntakeManifest } from '@/lib/agents/intake/manifest';
import { classifyIntakeFromRules } from '@/lib/agents/intake/rules';
import { validateIntakeOutput } from '@/lib/agents/validators';

describe('intake rules engine', () => {
  it('classifies innocent receiver UPI chain with evidence_count=0', () => {
    const output = classifyIntakeFromRules({
      case_id: 'c1',
      evidence_count: 0,
      intake_json: {
        narration: 'UPI lien debit freeze',
        user_role: 'innocent_receiver',
        bank_slug: 'sbi',
      },
      manifest: [
        { source_id: 'intake_json', field: 'narration', value: 'UPI lien debit freeze' },
      ],
    });

    expect(output.freeze_reason).toBe('cyber_upi_chain');
    expect(output.victim_role).toBe('innocent_receiver');
    expect(output.playbook_slug).toBe('innocent_receiver_upi_chain_sbi');
    expect(output.refuse_to_classify).toBe(false);
  });

  it('forces human gate for court_order without evidence', () => {
    const output = classifyIntakeFromRules({
      case_id: 'c2',
      evidence_count: 0,
      intake_json: { freeze_reason_hint: 'court_order', narration: 'Court order' },
      manifest: [{ source_id: 'intake_json', field: 'narration', value: 'Court order' }],
      evidence_types: [],
    });

    expect(output.freeze_reason).toBe('court_order');
    expect(output.refuse_to_classify).toBe(true);
    expect(output.human_review_required).toBe(true);
  });

  it('forces human gate for tax_attachment', () => {
    const output = classifyIntakeFromRules({
      case_id: 'c3',
      evidence_count: 0,
      intake_json: { freeze_reason_hint: 'tax_attachment' },
      manifest: [
        { source_id: 'intake_json', field: 'freeze_reason_hint', value: 'tax_attachment' },
      ],
    });

    expect(output.freeze_reason).toBe('tax_attachment');
    expect(output.human_review_required).toBe(true);
  });

  it('forces human gate for suspected_mule', () => {
    const output = classifyIntakeFromRules({
      case_id: 'c4',
      evidence_count: 0,
      intake_json: { freeze_reason_hint: 'suspected_mule' },
      manifest: [
        { source_id: 'intake_json', field: 'freeze_reason_hint', value: 'suspected_mule' },
      ],
    });

    expect(output.freeze_reason).toBe('suspected_mule');
    expect(output.human_review_required).toBe(true);
  });

  it('refuses amount mismatch >10%', () => {
    const output = classifyIntakeFromRules({
      case_id: 'c5',
      evidence_count: 1,
      intake_json: { amount_inr: 100000, ocr_amount_inr: 10000, narration: 'UPI' },
      manifest: [{ source_id: 'intake_json', field: 'amount_inr', value: '100000' }],
      evidence_types: ['freeze_sms'],
    });

    expect(output.refuse_to_classify).toBe(true);
    expect(output.refuse_reason).toBe('amount_mismatch_gt_10pct');
  });

  it('validates citations against manifest source_ids', () => {
    const output = classifyIntakeFromRules({
      case_id: 'c6',
      evidence_count: 0,
      intake_json: { narration: 'UPI freeze' },
      manifest: [{ source_id: 'intake_json', field: 'narration', value: 'UPI freeze' }],
    });

    const validation = validateIntakeOutput(
      output,
      new Set(output.citations.map((c) => c.source_id)),
    );
    expect(validation.valid).toBe(true);
  });

  it('builds manifest from intake_json and evidence rows', () => {
    const manifest = buildIntakeManifest(
      { narration: 'test', ncrp_id: '12345678901234' },
      [{ id: 'ev-1', evidence_type: 'freeze_sms' }],
    );

    expect(manifest.some((m) => m.source_id === 'intake_json')).toBe(true);
    expect(manifest.some((m) => m.source_id === 'evidence:ev-1')).toBe(true);
  });
});