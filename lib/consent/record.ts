import 'server-only';

import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { DISCLAIMER_BLOCKS, DISCLAIMER_VERSION } from '@/lib/constants/disclaimers';
import type { Database, Json } from '@/supabase/database.types';

export type ConsentType = Database['public']['Enums']['consent_type'];

const CONSENT_TEXT_BY_TYPE: Partial<Record<ConsentType, string>> = {
  terms_privacy: `${DISCLAIMER_BLOCKS.B} ${DISCLAIMER_BLOCKS.F}`,
  case_data_processing: DISCLAIMER_BLOCKS.B,
  evidence_upload: DISCLAIMER_BLOCKS.G,
  ai_ocr_processing: DISCLAIMER_BLOCKS.F,
  cross_border_ai: DISCLAIMER_BLOCKS.F,
  escalation_send: `I consent to LienLiberator preparing RBI CMS escalation materials. ${DISCLAIMER_BLOCKS.C}`,
  public_stats_opt_in: DISCLAIMER_BLOCKS.E,
  whatsapp_sms_reminders: 'I consent to receive case reminders via WhatsApp or SMS.',
  fee_agreement: DISCLAIMER_BLOCKS.D,
};

export function consentTextFor(type: ConsentType): string {
  return CONSENT_TEXT_BY_TYPE[type] ?? DISCLAIMER_BLOCKS.B;
}

export function hashConsentText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export type RecordConsentInput = {
  consent_type: ConsentType;
  granted: boolean;
  user_id?: string | null;
  guest_session_id?: string | null;
  case_id?: string | null;
  ip_hash?: string | null;
  user_agent_hash?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Append-only consent_records insert — never UPDATE/DELETE.
 */
export async function recordConsent(input: RecordConsentInput): Promise<string> {
  if (!input.user_id && !input.guest_session_id) {
    throw new Error('consent_subject_required');
  }

  const text = consentTextFor(input.consent_type);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('consent_records')
    .insert({
      user_id: input.user_id ?? null,
      guest_session_id: input.guest_session_id ?? null,
      case_id: input.case_id ?? null,
      consent_type: input.consent_type,
      granted: input.granted,
      consent_text_version: DISCLAIMER_VERSION,
      consent_text_hash: hashConsentText(text),
      ip_hash: input.ip_hash ?? null,
      user_agent_hash: input.user_agent_hash ?? null,
      metadata_json: (input.metadata ?? {}) as import('@/supabase/database.types').Json,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`record_consent_failed: ${error?.message ?? 'unknown'}`);
  }

  return data.id;
}

export async function hasGrantedConsent(
  caseId: string,
  consentType: ConsentType,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('consent_records')
    .select('granted')
    .eq('case_id', caseId)
    .eq('consent_type', consentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.granted === true;
}

/** public_stats defaults OFF — must be explicit opt-in */
export async function isPublicStatsOptedIn(caseId: string): Promise<boolean> {
  return hasGrantedConsent(caseId, 'public_stats_opt_in');
}