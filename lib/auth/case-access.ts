import 'server-only';

import type { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api/errors';
import { resolveGuestAuth } from '@/lib/auth/guest';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type CaseAccessContext = {
  userId: string | null;
  guestSessionId: string | null;
  actorType: 'user' | 'guest';
  actorId: string;
};

/**
 * Verify caller owns the case (JWT user or guest session).
 */
export async function requireCaseAccess(
  request: NextRequest,
  caseId: string,
): Promise<CaseAccessContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const guest = await resolveGuestAuth(request);
  if (!user && !guest) {
    throw new ApiError(401, 'unauthorized', 'Authentication required');
  }

  const admin = createAdminClient();
  const { data: caseRow, error } = await admin
    .from('cases')
    .select('id, user_id, guest_session_id')
    .eq('id', caseId)
    .maybeSingle();

  if (error || !caseRow) {
    throw new ApiError(404, 'not_found', 'Case not found');
  }

  if (user && caseRow.user_id === user.id) {
    return {
      userId: user.id,
      guestSessionId: null,
      actorType: 'user',
      actorId: user.id,
    };
  }

  if (guest && caseRow.guest_session_id === guest.guestSessionId && !caseRow.user_id) {
    return {
      userId: null,
      guestSessionId: guest.guestSessionId,
      actorType: 'guest',
      actorId: guest.guestSessionId,
    };
  }

  throw new ApiError(403, 'forbidden', 'You do not have access to this case');
}
