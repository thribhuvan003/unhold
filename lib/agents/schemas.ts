/**
 * Product agent Zod output schemas.
 * @see docs/BUILD_SPEC_AGENTS.md §2
 */

import { z } from 'zod';

export const FreezeReasonSchema = z.enum([
  'cyber_upi_chain',
  'suspected_mule',
  'kyc_expired',
  'tax_attachment',
  'court_order',
  'police_notice_bnss106',
  'bank_str',
  'cheque_dishonour',
  'death_nomination_dispute',
]);

export const CitationSchema = z.object({
  source_id: z.string(),
  field: z.string(),
  excerpt: z.string().max(200),
});

export const IntakeClassificationOutputSchema = z.object({
  freeze_reason: FreezeReasonSchema,
  freeze_type: z.enum(['debit_freeze', 'credit_freeze', 'total_freeze', 'partial_lien']),
  victim_role: z.enum(['victim', 'innocent_receiver']),
  confidence: z.number().min(0).max(1),
  confidence_breakdown: z.record(z.string(), z.number()),
  missing_documents: z.array(z.string()),
  playbook_slug: z.string(),
  refuse_to_classify: z.boolean(),
  refuse_reason: z.string().optional(),
  human_review_required: z.boolean(),
  citations: z.array(CitationSchema).min(1),
});

export const LetterDraftOutputSchema = z.object({
  subject: z.string().max(200),
  body: z.string().max(8000),
  level: z.enum(['L1', 'L2', 'L3', 'L4']),
  template_slug: z.string(),
  placeholders_used: z.array(z.string()),
  placeholders_missing: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  disclaimer_block: z.literal('DRAFT ONLY — REVIEW BEFORE USE'),
  language: z.literal('en'),
});

export const MonitorTickOutputSchema = z.object({
  message: z.string().max(500),
  user_action_required: z.boolean(),
  action_code: z.string().optional(),
  action_title: z.string().optional(),
  suggest_status_transition: z.null(),
  quiet_hours_suppressed: z.boolean(),
});

export const VerifierResultOutputSchema = z.object({
  confidence: z.number().min(0).max(1),
  field_confidence: z.record(z.string(), z.number()),
  extracted: z.object({
    bank_name: z.string().optional(),
    amount_paise: z.number().int().optional(),
    freeze_type: z.string().optional(),
    ncrp_id: z
      .string()
      .regex(/^\d{14}$/)
      .optional(),
    date_detected: z.string().optional(),
  }),
  forgery_risk: z.boolean(),
  forgery_flags: z.array(z.string()),
  mismatches: z.array(
    z.object({ field: z.string(), expected: z.string(), found: z.string() }),
  ),
  human_review_required: z.boolean(),
});

export const EscalatorSuggestionOutputSchema = z.object({
  can_escalate: z.boolean(),
  target_level: z.enum(['L1', 'L2', 'L3', 'L4']).optional(),
  blocked_reason: z.string().optional(),
  proof_gate_passed: z.boolean(),
  suggest_drafter: z.boolean(),
});

export type IntakeClassificationOutput = z.infer<typeof IntakeClassificationOutputSchema>;
export type LetterDraftOutput = z.infer<typeof LetterDraftOutputSchema>;
export type MonitorTickOutput = z.infer<typeof MonitorTickOutputSchema>;
export type VerifierResultOutput = z.infer<typeof VerifierResultOutputSchema>;
export type EscalatorSuggestionOutput = z.infer<typeof EscalatorSuggestionOutputSchema>;