import { getDocumentChecklist } from '@/lib/intake/document-checklist';
import type { Database } from '@/supabase/database.types';

type FreezeReason = Database['public']['Enums']['freeze_reason'];

/**
 * Same evidence bar as the letter page: min(2, required checklist types) readable.
 * Keeps dashboard / papers / ladder unlock aligned with draft eligibility.
 */
export function isLetterEvidenceReady(
  freezeReason: FreezeReason | null | undefined,
  hasReadableType: (evidenceType: string) => boolean,
): boolean {
  const required = getDocumentChecklist(freezeReason)
    .filter((item) => item.required)
    .map((item) => item.evidence_type as string);
  const need = Math.min(2, required.length || 2);
  const types = required.length > 0 ? required : ['freeze_sms', 'bank_statement'];
  return types.filter(hasReadableType).length >= need;
}
