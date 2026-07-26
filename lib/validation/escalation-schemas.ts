import { z } from 'zod';

export const MarkSentBodySchema = z.object({
  proof_evidence_id: z.string().uuid(),
  sent_at: z.string().datetime().optional(),
});

export const ApproveEscalationBodySchema = z.object({
  consent_acknowledged: z.boolean().optional(),
});

export type MarkSentBody = z.infer<typeof MarkSentBodySchema>;
export type ApproveEscalationBody = z.infer<typeof ApproveEscalationBodySchema>;