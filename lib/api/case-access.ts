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
  const guest = resolveGuestAuth(request);
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
): Promise<void> {
  const admin = createAdminClient();
  const { data: caseRow, error } = await admin
    .from('cases')
    .select('id, user_id, guest_session_id')
    .eq('id', caseId)
    .maybeSingle();

  if (error || !caseRow) {
    throw new ApiError(404, 'not_found', 'Case not found');
  }

  if (auth.userId && caseRow.user_id === auth.userId) return;

  if (
    auth.guestSessionId &&
    caseRow.guest_session_id === auth.guestSessionId &&
    caseRow.user_id === null
  ) {
    if (minLevel === 'owner') {
      throw new ApiError(403, 'forbidden', 'Guest cannot perform owner-only action');
    }
    return;
  }

  if (auth.userId) {
    const { data: permission } = await admin
      .from('permissions')
      .select('permission_level')
      .eq('case_id', caseId)
      .eq('grantee_user_id', auth.userId)
      .is('revoked_at', null)
      .maybeSingle();

    if (permission) {
      const rank = permissionLevelRank(permission.permission_level);
      const required = permissionLevelRank(minLevel);
      if (rank >= required) return;
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

export function serializeCase(row: Record<string, unknown>) {
  return {
    id: row.id,
    public_id: row.public_id,
    status: row.status,
    bank_id: row.bank_id,
    freeze_reason: row.freeze_reason,
    freeze_type: row.freeze_type,
    victim_role: row.victim_role,
    frozen_amount_paise: row.frozen_amount_paise,
    intake_json: row.intake_json ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}