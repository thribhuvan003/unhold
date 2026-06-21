import { describe, expect, it } from 'vitest';
import { evaluateProofGate } from '@/lib/escalations/proof-gates';
import { getLadderStep } from '@/lib/escalations/ladder';

describe('evaluateProofGate', () => {
  it('passes L1 with no prior proof', () => {
    const result = evaluateProofGate({
      targetLevel: 'L1',
      escalations: [],
      hasEscalationSendConsent: false,
    });
    expect(result.passed).toBe(true);
    expect(result.guard).toBeUndefined();
  });

  it('blocks L2 without L1 send_proof', () => {
    const result = evaluateProofGate({
      targetLevel: 'L2',
      escalations: [],
      hasEscalationSendConsent: false,
    });
    expect(result.passed).toBe(false);
    expect(result.guard).toBe('has_prior_level_proof');
    expect(result.missingProof).toContain('L1_send_proof');
  });

  it('passes L2 when L1 sent with proof evidence', () => {
    const result = evaluateProofGate({
      targetLevel: 'L2',
      escalations: [
        {
          level: 'L1',
          status: 'sent',
          sent_at: '2026-03-01T00:00:00.000Z',
          sent_proof_evidence_id: '11111111-1111-4111-8111-111111111111',
        },
      ],
      hasEscalationSendConsent: false,
    });
    expect(result.passed).toBe(true);
  });

  it('blocks L3 without escalation_send consent', () => {
    const result = evaluateProofGate({
      targetLevel: 'L3',
      escalations: [
        {
          level: 'L1',
          status: 'sent',
          sent_at: '2026-03-01T00:00:00.000Z',
          sent_proof_evidence_id: '11111111-1111-4111-8111-111111111111',
        },
        {
          level: 'L2',
          status: 'sent',
          sent_at: '2026-03-15T00:00:00.000Z',
          sent_proof_evidence_id: '22222222-2222-4222-8222-222222222222',
        },
      ],
      hasEscalationSendConsent: false,
    });
    expect(result.passed).toBe(false);
    expect(result.guard).toBe('escalation_send_consent');
    expect(result.missingProof).toContain('escalation_send_consent');
  });

  it('passes L3 with L2 proof and escalation_send consent', () => {
    const result = evaluateProofGate({
      targetLevel: 'L3',
      escalations: [
        {
          level: 'L2',
          status: 'sent',
          sent_at: '2026-03-15T00:00:00.000Z',
          sent_proof_evidence_id: '22222222-2222-4222-8222-222222222222',
        },
      ],
      hasEscalationSendConsent: true,
    });
    expect(result.passed).toBe(true);
  });

  it('blocks L4 without L3 send_proof', () => {
    const result = evaluateProofGate({
      targetLevel: 'L4',
      escalations: [
        {
          level: 'L2',
          status: 'sent',
          sent_at: '2026-03-15T00:00:00.000Z',
          sent_proof_evidence_id: '22222222-2222-4222-8222-222222222222',
        },
      ],
      hasEscalationSendConsent: true,
    });
    expect(result.passed).toBe(false);
    expect(result.missingProof).toContain('L3_send_proof');
  });
});

describe('ESCALATION_LADDER', () => {
  it('matches BUILD_SPEC §4.3 wait days', () => {
    expect(getLadderStep('L1').waitDays).toBe(7);
    expect(getLadderStep('L2').waitDays).toBe(10);
    expect(getLadderStep('L3').waitDays).toBe(90);
    expect(getLadderStep('L4').waitDays).toBe(30);
  });
});