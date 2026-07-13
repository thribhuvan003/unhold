import 'server-only';

import type { NextRequest } from 'next/server';
import { resolveGuestAuth } from '@/lib/auth/guest';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/api/errors';

export interface RequestAuth {
  userId: string | null;
  guestSessionId: string | null;
  actorType: 'user' | 'guest';
  actorId: string;
}

export async function resolveRequestAuth(request: NextRequest): Promise<RequestAuth | null> {
  const guest = await resolveGuestAuth(request);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return {
      userId: user.id,
      guestSessionId: guest?.guestSessionId ?? null,
      actorType: 'user',
      actorId: user.id,
    };
  }

  if (guest) {
    return {
      userId: null,
      guestSessionId: guest.guestSessionId,
      actorType: 'guest',
      actorId: guest.guestSessionId,
    };
  }

  return null;
}

export async function requireRequestAuth(request: NextRequest): Promise<RequestAuth> {
  const auth = await resolveRequestAuth(request);
  if (!auth) {
    throw new ApiError(401, 'unauthorized', 'Authentication required');
  }
  return auth;
}

export async function assertCaseAccess(
  caseId: string,
  auth: RequestAuth,
  minLevel: 'viewer' | 'editor' | 'owner' = 'viewer',
): Promise<'owner' | 'editor' | 'viewer'> {
  const admin = createAdminClient();
  const { data: caseRow, error } = await admin
    .from('cases')
    .select('id, user_id, guest_session_id')
    .eq('id', caseId)
    .maybeSingle();

  if (error || !caseRow) {
    throw new ApiError(404, 'not_found', 'Case not found');
  }

  if (auth.userId && caseRow.user_id === auth.userId) return 'owner';

  if (
    auth.guestSessionId &&
    caseRow.guest_session_id === auth.guestSessionId &&
    caseRow.user_id === null
  ) {
    if (minLevel === 'owner') {
      throw new ApiError(403, 'forbidden', 'Guest cannot perform owner-only action');
    }
    return 'owner';
  }

  if (auth.userId) {
    const { data: permission } = await admin
      .from('permissions')
      .select('permission_level, expires_at')
      .eq('case_id', caseId)
      .eq('grantee_user_id', auth.userId)
      .is('revoked_at', null)
      .maybeSingle();

    if (permission && (!permission.expires_at || new Date(permission.expires_at).getTime() > Date.now())) {
      const rank = permissionLevelRank(permission.permission_level);
      const required = permissionLevelRank(minLevel);
      if (rank >= required) return rank >= 2 ? 'editor' : 'viewer';
    }
  }

  throw new ApiError(403, 'forbidden', 'You do not have access to this case');
}

function permissionLevelRank(
  level: 'owner' | 'editor' | 'viewer' | 'parent_readonly',
): number {
  switch (level) {
    case 'owner':
      return 3;
    case 'editor':
      return 2;
    case 'viewer':
    case 'parent_readonly':
      return 1;
    default:
      return 0;
  }
}

export function serializeCase(row: Record<string, unknown>, redactIntake = false) {
  // Strip reminder PII: the reminder email + the internal send marker must never
  // leak to case viewers/collaborators via the serialized case.
  const rawIntake =
    typeof row.intake_json === 'object' && row.intake_json !== null
      ? (row.intake_json as Record<string, unknown>)
      : {};
  const {
    reminder_email: _reminderEmail,
    reminder_sent_due_at: _reminderSentDueAt,
    ...intake_json
  } = rawIntake;

  return {
    id: row.id,
    public_id: row.public_id,
    status: row.status,
    bank_id: row.bank_id,
    freeze_reason: row.freeze_reason,
    freeze_type: row.freeze_type,
    victim_role: row.victim_role,
    frozen_amount_paise: row.frozen_amount_paise,
    intake_json: redactIntake ? {} : intake_json,
    user_action_required: row.user_action_required ?? false,
    classification_confidence: row.classification_confidence ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
