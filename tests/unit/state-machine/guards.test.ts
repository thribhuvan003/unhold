import { describe, expect, it } from 'vitest';
import {
  evaluateTransition,
  guardBundleSha256,
  guardChecklistComplete,
  guardHasMinEvidence,
  guardHasPriorLevelProof,
  guardLevelBelowL4,
  guardPlaybookAssigned,
  guardProofAndUserApproved,
  guardPublicStatsConsent,
  guardResolutionTypeSet,
  guardUnfreezeConfirmed,
  findTransitionRule,
} from '@/lib/state-machine/guards';
import type { CaseContext } from '@/lib/state-machine/types';

function ctx(partial: Partial<CaseContext> & { case: CaseContext['case'] }): CaseContext {
  return {
    evidence: [],
    escalations: [],
    checklist: [],
    payload: {},
    ...partial,
  };
}

const verifiedEvidence = {
  id: 'e1',
  evidence_type: 'freeze_sms' as const,
  sha256: 'a'.repeat(64),
  sha256_verified_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
};

describe('state machine guards', () => {
  describe('has_min_evidence', () => {
    it('passes with one verified evidence', () => {
      expect(guardHasMinEvidence(ctx({ case: baseCase('new'), evidence: [verifiedEvidence] })).ok).toBe(true);
    });
    it('fails with zero evidence', () => {
      expect(guardHasMinEvidence(ctx({ case: baseCase('new') })).guard).toBe('has_min_evidence');
    });
    it('fails when evidence not verified', () => {
      const unverified = { ...verifiedEvidence, sha256_verified_at: null };
      expect(guardHasMinEvidence(ctx({ case: baseCase('new'), evidence: [unverified] })).ok).toBe(false);
    });
    it('fails when evidence soft-deleted', () => {
      const deleted = { ...verifiedEvidence, deleted_at: '2026-01-02T00:00:00Z' };
      expect(guardHasMinEvidence(ctx({ case: baseCase('new'), evidence: [deleted] })).ok).toBe(false);
    });
    it('passes with multiple verified items', () => {
      expect(
        guardHasMinEvidence(
          ctx({ case: baseCase('new'), evidence: [verifiedEvidence, { ...verifiedEvidence, id: 'e2' }] }),
        ).ok,
      ).toBe(true);
    });
  });

  describe('playbook_assigned', () => {
    it('passes when playbook_id present', () => {
      expect(guardPlaybookAssigned(ctx({ case: { ...baseCase('intake_scoping'), playbook_id: 'pb-1' } })).ok).toBe(
        true,
      );
    });
    it('fails when playbook_id null', () => {
      expect(guardPlaybookAssigned(ctx({ case: baseCase('intake_scoping') })).guard).toBe('playbook_assigned');
    });
    it('fails when playbook_id undefined coerced null', () => {
      expect(guardPlaybookAssigned(ctx({ case: { ...baseCase('intake_scoping'), playbook_id: null } })).ok).toBe(
        false,
      );
    });
  });

  describe('checklist_complete', () => {
    it('passes when no required checklist items', () => {
      expect(guardChecklistComplete(ctx({ case: baseCase('monitoring'), checklist: [] })).ok).toBe(true);
    });
    it('passes when required evidence present', () => {
      const result = guardChecklistComplete(
        ctx({
          case: baseCase('monitoring'),
          checklist: [{ evidence_type: 'freeze_sms' }],
          evidence: [verifiedEvidence],
        }),
      );
      expect(result.ok).toBe(true);
    });
    it('fails when required evidence missing', () => {
      expect(
        guardChecklistComplete(
          ctx({ case: baseCase('monitoring'), checklist: [{ evidence_type: 'bank_statement' }] }),
        ).guard,
      ).toBe('checklist_complete');
    });
    it('ignores optional checklist items', () => {
      expect(
        guardChecklistComplete(
          ctx({
            case: baseCase('monitoring'),
            checklist: [{ evidence_type: 'police_fir', optional: true }],
          }),
        ).ok,
      ).toBe(true);
    });
    it('requires all non-optional types', () => {
      const result = guardChecklistComplete(
        ctx({
          case: baseCase('monitoring'),
          checklist: [{ evidence_type: 'freeze_sms' }, { evidence_type: 'bank_statement' }],
          evidence: [verifiedEvidence],
        }),
      );
      expect(result.ok).toBe(false);
    });
  });

  describe('bundle_sha256', () => {
    it('passes with payload bundle_sha256', () => {
      expect(
        guardBundleSha256(
          ctx({ case: baseCase('evidence_building'), payload: { bundle_sha256: 'b'.repeat(64) } }),
        ).ok,
      ).toBe(true);
    });
    it('passes with metadata bundle_sha256', () => {
      expect(
        guardBundleSha256(
          ctx({
            case: { ...baseCase('evidence_building'), metadata_json: { bundle_sha256: 'c'.repeat(64) } },
          }),
        ).ok,
      ).toBe(true);
    });
    it('fails without bundle hash', () => {
      expect(guardBundleSha256(ctx({ case: baseCase('evidence_building') })).guard).toBe('bundle_sha256');
    });
    it('fails with invalid hash format', () => {
      expect(
        guardBundleSha256(ctx({ case: baseCase('evidence_building'), payload: { bundle_sha256: 'bad' } })).ok,
      ).toBe(false);
    });
  });

  describe('proof_and_user_approved', () => {
    it('passes L1 with approved escalation', () => {
      expect(
        guardProofAndUserApproved(
          ctx({
            case: { ...baseCase('escalation'), escalation_level: 'L1' },
            escalations: [{ id: 'x', level: 'L1', status: 'approved', approved_at: 't', sent_proof_evidence_id: null }],
            payload: { escalation_level: 'L1' },
          }),
        ).ok,
      ).toBe(true);
    });
    it('fails without escalation row', () => {
      expect(guardProofAndUserApproved(ctx({ case: baseCase('escalation') })).guard).toBe('proof_and_user_approved');
    });
    it('fails when escalation draft only', () => {
      expect(
        guardProofAndUserApproved(
          ctx({
            case: baseCase('escalation'),
            escalations: [{ id: 'x', level: 'L1', status: 'draft', approved_at: null, sent_proof_evidence_id: null }],
          }),
        ).ok,
      ).toBe(false);
    });
    it('requires prior proof for L2', () => {
      expect(
        guardProofAndUserApproved(
          ctx({
            case: { ...baseCase('escalation'), escalation_level: 'L2' },
            escalations: [
              { id: 'l2', level: 'L2', status: 'approved', approved_at: 't', sent_proof_evidence_id: null },
            ],
            payload: { escalation_level: 'L2' },
          }),
        ).guard,
      ).toBe('has_prior_level_proof');
    });
    it('passes L2 when L1 sent', () => {
      expect(
        guardProofAndUserApproved(
          ctx({
            case: { ...baseCase('escalation'), escalation_level: 'L2' },
            escalations: [
              { id: 'l1', level: 'L1', status: 'sent', approved_at: 't', sent_proof_evidence_id: 'p1' },
              { id: 'l2', level: 'L2', status: 'approved', approved_at: 't', sent_proof_evidence_id: null },
            ],
            payload: { escalation_level: 'L2' },
          }),
        ).ok,
      ).toBe(true);
    });
    it('accepts sent status as approved path', () => {
      expect(
        guardProofAndUserApproved(
          ctx({
            case: baseCase('escalation'),
            escalations: [{ id: 'x', level: 'L1', status: 'sent', approved_at: 't', sent_proof_evidence_id: null }],
          }),
        ).ok,
      ).toBe(true);
    });
  });

  describe('has_prior_level_proof', () => {
    it('passes when L1 sent for L2 requirement', () => {
      expect(
        guardHasPriorLevelProof(
          ctx({
            case: baseCase('awaiting_response'),
            escalations: [{ id: 'l1', level: 'L1', status: 'sent', approved_at: null, sent_proof_evidence_id: 'p' }],
            payload: { required_proof: 'L1' },
          }),
        ).ok,
      ).toBe(true);
    });
    it('fails when prior level missing', () => {
      expect(guardHasPriorLevelProof(ctx({ case: baseCase('awaiting_response'), payload: { required_proof: 'L1' } })).ok).toBe(
        false,
      );
    });
    it('fails when prior level draft', () => {
      expect(
        guardHasPriorLevelProof(
          ctx({
            case: baseCase('awaiting_response'),
            escalations: [{ id: 'l1', level: 'L1', status: 'draft', approved_at: null, sent_proof_evidence_id: null }],
            payload: { required_proof: 'L1' },
          }),
        ).ok,
      ).toBe(false);
    });
    it('accepts response_received', () => {
      expect(
        guardHasPriorLevelProof(
          ctx({
            case: baseCase('awaiting_response'),
            escalations: [
              { id: 'l1', level: 'L1', status: 'response_received', approved_at: null, sent_proof_evidence_id: 'p' },
            ],
            payload: { required_proof: 'L1' },
          }),
        ).ok,
      ).toBe(true);
    });
    it('accepts timeout status', () => {
      expect(
        guardHasPriorLevelProof(
          ctx({
            case: baseCase('awaiting_response'),
            escalations: [{ id: 'l1', level: 'L1', status: 'timeout', approved_at: null, sent_proof_evidence_id: null }],
            payload: { required_proof: 'L1' },
          }),
        ).ok,
      ).toBe(true);
    });
    it('uses escalation_level default L2 needs L1', () => {
      expect(
        guardHasPriorLevelProof(
          ctx({ case: { ...baseCase('awaiting_response'), escalation_level: 'L2' }, escalations: [] }),
        ).guard,
      ).toBe('has_prior_level_proof');
    });
    it('L3 requires L2 proof via payload', () => {
      expect(
        guardHasPriorLevelProof(
          ctx({
            case: baseCase('awaiting_response'),
            escalations: [{ id: 'l2', level: 'L2', status: 'sent', approved_at: null, sent_proof_evidence_id: 'p' }],
            payload: { required_proof: 'L2' },
          }),
        ).ok,
      ).toBe(true);
    });
    it('L4 requires L3 proof via payload', () => {
      expect(
        guardHasPriorLevelProof(
          ctx({
            case: baseCase('awaiting_response'),
            escalations: [{ id: 'l3', level: 'L3', status: 'sent', approved_at: null, sent_proof_evidence_id: 'p' }],
            payload: { required_proof: 'L3' },
          }),
        ).ok,
      ).toBe(true);
    });
  });

  describe('level_below_l4', () => {
    it('passes for L1', () => {
      expect(guardLevelBelowL4(ctx({ case: { ...baseCase('awaiting_response'), escalation_level: 'L1' } })).ok).toBe(
        true,
      );
    });
    it('passes for L3', () => {
      expect(guardLevelBelowL4(ctx({ case: { ...baseCase('awaiting_response'), escalation_level: 'L3' } })).ok).toBe(
        true,
      );
    });
    it('fails for L4', () => {
      expect(guardLevelBelowL4(ctx({ case: { ...baseCase('awaiting_response'), escalation_level: 'L4' } })).guard).toBe(
        'level_below_l4',
      );
    });
  });

  describe('unfreeze_confirmed', () => {
    it('passes with bank_release_letter evidence', () => {
      expect(
        guardUnfreezeConfirmed(
          ctx({
            case: baseCase('awaiting_response'),
            evidence: [{ ...verifiedEvidence, evidence_type: 'bank_release_letter' }],
          }),
        ).ok,
      ).toBe(true);
    });
    it('passes with user confirmed payload', () => {
      expect(
        guardUnfreezeConfirmed(ctx({ case: baseCase('awaiting_response'), payload: { confirmed: true } })).ok,
      ).toBe(true);
    });
    it('passes with resolution_confirmed_by user', () => {
      expect(
        guardUnfreezeConfirmed(
          ctx({ case: baseCase('awaiting_response'), payload: { resolution_confirmed_by: 'user' } }),
        ).ok,
      ).toBe(true);
    });
    it('fails without proof or confirm', () => {
      expect(guardUnfreezeConfirmed(ctx({ case: baseCase('awaiting_response') })).guard).toBe('unfreeze_confirmed');
    });
  });

  describe('resolution_type_set', () => {
    it('passes with payload resolution_type', () => {
      expect(
        guardResolutionTypeSet(ctx({ case: baseCase('verified'), payload: { resolution_type: 'full_unfreeze' } })).ok,
      ).toBe(true);
    });
    it('passes with case resolution_type', () => {
      expect(
        guardResolutionTypeSet(
          ctx({ case: { ...baseCase('verified'), resolution_type: 'partial_release' } }),
        ).ok,
      ).toBe(true);
    });
    it('fails when unset', () => {
      expect(guardResolutionTypeSet(ctx({ case: baseCase('verified') })).guard).toBe('resolution_type_set');
    });
  });

  describe('public_stats_consent', () => {
    it('passes with payload opt-in', () => {
      expect(
        guardPublicStatsConsent(ctx({ case: baseCase('resolved'), payload: { public_stats_opt_in: true } })).ok,
      ).toBe(true);
    });
    it('passes with case opt-in flag', () => {
      expect(
        guardPublicStatsConsent(ctx({ case: { ...baseCase('resolved'), public_stats_opt_in: true } })).ok,
      ).toBe(true);
    });
    it('fails when not opted in', () => {
      expect(guardPublicStatsConsent(ctx({ case: baseCase('resolved') })).guard).toBe('public_stats_consent');
    });
  });

  describe('evaluateTransition', () => {
    it('allows new -> intake_scoping with evidence', () => {
      const result = evaluateTransition(
        ctx({ case: baseCase('new'), evidence: [verifiedEvidence] }),
        'evidence.submitted',
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.to).toBe('intake_scoping');
    });
    it('blocks new -> intake_scoping without evidence', () => {
      const result = evaluateTransition(ctx({ case: baseCase('new') }), 'evidence.submitted');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.guard).toBe('has_min_evidence');
    });
    it('blocks invalid transition new -> monitoring', () => {
      const result = evaluateTransition(ctx({ case: baseCase('new') }), 'intake.classified');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.guard).toBe('valid_transition');
    });
    it('allows intake_scoping -> monitoring with playbook', () => {
      const result = evaluateTransition(
        ctx({ case: { ...baseCase('intake_scoping'), playbook_id: 'pb' } }),
        'intake.classified',
      );
      expect(result.ok).toBe(true);
    });
    it('allows monitoring -> closed on abandon', () => {
      expect(evaluateTransition(ctx({ case: baseCase('monitoring') }), 'user.abandon').ok).toBe(true);
    });
    it('allows monitoring -> closed on inactive_30d', () => {
      expect(evaluateTransition(ctx({ case: baseCase('monitoring') }), 'inactive_30d').ok).toBe(true);
    });
    it('blocks escalation without bundle hash', () => {
      expect(evaluateTransition(ctx({ case: baseCase('evidence_building') }), 'bundle.ready').ok).toBe(false);
    });
    it('allows escalation -> awaiting_response when approved', () => {
      const result = evaluateTransition(
        ctx({
          case: baseCase('escalation'),
          escalations: [{ id: 'l1', level: 'L1', status: 'approved', approved_at: 't', sent_proof_evidence_id: null }],
        }),
        'user.mark_sent',
      );
      expect(result.ok).toBe(true);
    });
    it('blocks response.timeout at L4', () => {
      const result = evaluateTransition(
        ctx({
          case: { ...baseCase('awaiting_response'), escalation_level: 'L4' },
          escalations: [{ id: 'l3', level: 'L3', status: 'sent', approved_at: null, sent_proof_evidence_id: 'p' }],
          payload: { required_proof: 'L3' },
        }),
        'response.timeout',
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.guard).toBe('level_below_l4');
    });
    it('allows human_escalation from escalation', () => {
      expect(evaluateTransition(ctx({ case: baseCase('escalation') }), 'cost_cap').ok).toBe(true);
    });
    it('allows ops.handoff to closed', () => {
      expect(evaluateTransition(ctx({ case: baseCase('human_escalation') }), 'ops.handoff').ok).toBe(true);
    });
    it('findTransitionRule returns null for unknown pair', () => {
      expect(findTransitionRule('closed', 'evidence.submitted')).toBeNull();
    });
    it('rejects ESCALATION_L1 style invalid from status', () => {
      const statuses = ['new', 'intake_scoping', 'monitoring'] as const;
      for (const status of statuses) {
        expect(evaluateTransition(ctx({ case: baseCase(status) }), 'user.mark_sent').ok).toBe(false);
      }
    });
  });
});

function baseCase(status: CaseContext['case']['status']): CaseContext['case'] {
  return {
    id: 'case-1',
    status,
    playbook_id: null,
    escalation_level: 'L1',
    resolution_type: null,
    public_stats_opt_in: false,
    metadata_json: {},
  };
}