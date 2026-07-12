import { z } from 'zod';
import { ACCEPTED_EVIDENCE_MIME } from '@/lib/evidence/accepted-mime';

/** ₹100 crore in paise — an absurd upper bound that still blocks 1e21 garbage. */
const MAX_AMOUNT_PAISE = 100_000_000_000;

export const caseStatusSchema = z.enum([
  'new',
  'intake_scoping',
  'monitoring',
  'evidence_building',
  'escalation',
  'awaiting_response',
  'verified',
  'resolved',
  'stalled',
  'retried',
  'human_escalation',
  'closed',
  'public_pressure',
]);

export const freezeReasonSchema = z.enum([
  'cyber_upi_chain',
  'suspected_mule',
  'kyc_expired',
  'tax_gst_attachment',
  'court_order',
  'police_notice_bnss106',
  'bank_str',
  'cheque_dishonour',
  'death_nomination_dispute',
]);

export const freezeTypeSchema = z.enum([
  'debit_freeze',
  'credit_freeze',
  'total_freeze',
  'partial_lien',
]);

export const victimRoleSchema = z.enum(['victim', 'innocent_receiver']);

export const evidenceTypeSchema = z.enum([
  'freeze_sms',
  'bank_statement',
  'passbook_screenshot',
  'ncrp_acknowledgement',
  'police_fir',
  'pan_card',
  'aadhaar_masked',
  'chat_screenshot',
  'letter_sent_proof',
  'bank_release_letter',
  'court_order',
  'other',
]);

export const transitionEventSchema = z.enum([
  'evidence.submitted',
  'intake.classified',
  'checklist.complete',
  'user.abandon',
  'inactive_30d',
  'bundle.ready',
  'user.mark_sent',
  'response.received',
  'user.confirm_unfreeze',
  'response.timeout',
  'inactive_45d',
  'resolution.confirmed',
  'user.opt_in_stats',
  'bundle.delivered',
  'user.reopen',
  'new.strategy',
  'low_confidence',
  'cost_cap',
  'user.request',
  'ops.handoff',
]);

export const createCaseSchema = z.object({
  bank_slug: z.string().min(1),
  consent_accepted: z.literal(true),
  ai_consent_accepted: z.boolean().optional().default(false),
  freeze_reason: freezeReasonSchema.optional(),
  freeze_type: freezeTypeSchema.optional(),
  victim_role: victimRoleSchema.optional(),
  frozen_amount_paise: z.number().int().nonnegative().max(MAX_AMOUNT_PAISE).optional(),
  account_last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  state_code: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  district: z.string().max(100).optional(),
  narration_codes: z.array(z.string()).optional(),
  intake_json: z.record(z.unknown()).optional(),
});

export const patchIntakeSchema = z.object({
  freeze_reason: freezeReasonSchema.optional(),
  freeze_type: freezeTypeSchema.optional(),
  victim_role: victimRoleSchema.optional(),
  frozen_amount_paise: z.number().int().nonnegative().max(MAX_AMOUNT_PAISE).optional(),
  account_last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  state_code: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  district: z.string().max(100).optional(),
  narration_codes: z.array(z.string()).optional(),
  intake_json: z.record(z.unknown()).optional(),
  ncrp_id: z
    .string()
    .regex(/^(?!(\d)\1{13})\d{14}$/)
    .optional(),
});

export const claimCaseSchema = z.object({
  guest_token: z.string().min(1).optional(),
});

export const recoverCaseSchema = z.object({
  public_id: z.string().min(3).max(32),
  recovery_code: z.string().min(6).max(16),
});

export const evidenceUploadUrlSchema = z.object({
  evidence_type: evidenceTypeSchema,
  filename: z.string().min(1).max(255),
  mime_type: z.enum(ACCEPTED_EVIDENCE_MIME),
  file_size_bytes: z.number().int().positive().max(25 * 1024 * 1024),
});

export const evidenceConfirmSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const transitionRequestSchema = z.object({
  event: transitionEventSchema,
  payload: z.record(z.unknown()).optional(),
});

export const guestSessionResponseSchema = z.object({
  expires_at: z.string().datetime(),
});

export const caseResponseSchema = z.object({
  id: z.string().uuid(),
  public_id: z.string().regex(/^LL-\d+$/),
  status: caseStatusSchema,
  bank_id: z.string().uuid().nullable(),
  freeze_reason: freezeReasonSchema.nullable(),
  freeze_type: freezeTypeSchema.nullable(),
  victim_role: victimRoleSchema.nullable(),
  frozen_amount_paise: z.number().int().nullable(),
  intake_json: z.record(z.unknown()),
  user_action_required: z.boolean(),
  classification_confidence: z.number().min(0).max(1).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    guard: z.string().optional(),
    request_id: z.string(),
    doc_url: z.string().optional(),
  }),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type PatchIntakeInput = z.infer<typeof patchIntakeSchema>;
export type TransitionRequest = z.infer<typeof transitionRequestSchema>;
