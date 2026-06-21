import { EvidenceUploader } from '@/components/evidence/EvidenceUploader';
import { NextStepsCard } from '@/components/case/NextStepsCard';
import { ActionInbox } from '@/components/case/ActionInbox';
import { CaseDetailTabs } from '@/components/case/CaseDetailTabs';
import { cookies } from 'next/headers';
import { GUEST_COOKIE_NAME, verifyGuestToken } from '@/lib/auth/guest';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCaseAccess, type RequestAuth } from '@/lib/api/case-access';
import type { Database } from '@/supabase/database.types';

type PageProps = { params: Promise<{ id: string }> };

type CaseDetailData =
  | { authorized: false }
  | {
      authorized: true;
      frozenAmountPaise: number | null;
      actions: Database['public']['Tables']['user_actions']['Row'][];
      events: Database['public']['Tables']['swarm_events']['Row'][];
    };

async function loadCaseDetailData(caseId: string, guestToken: string | undefined): Promise<CaseDetailData> {
  const guestPayload = guestToken ? verifyGuestToken(guestToken) : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth: RequestAuth = {
    userId: user?.id ?? null,
    guestSessionId: guestPayload?.sub ?? null,
    actorType: user ? 'user' : 'guest',
    actorId: user?.id ?? guestPayload?.sub ?? '',
  };

  if (!auth.userId && !auth.guestSessionId) {
    return { authorized: false };
  }

  try {
    await assertCaseAccess(caseId, auth, 'viewer');
  } catch {
    return { authorized: false };
  }

  const admin = createAdminClient();
  const [{ data: caseRow }, { data: actions }, { data: events }] = await Promise.all([
    admin.from('cases').select('frozen_amount_paise').eq('id', caseId).maybeSingle(),
    admin
      .from('user_actions')
      .select('*')
      .eq('case_id', caseId)
      .order('priority', { ascending: false }),
    admin
      .from('swarm_events')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return {
    authorized: true,
    frozenAmountPaise: caseRow?.frozen_amount_paise ?? null,
    actions: actions ?? [],
    events: events ?? [],
  };
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  const data = await loadCaseDetailData(id, guestToken);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B1F33]">Case detail</h1>
      <p className="text-sm text-slate-600">Case ID: {id}</p>

      {data.authorized ? (
        <NextStepsCard
          caseId={id}
          initialActions={data.actions}
          frozenAmountPaise={data.frozenAmountPaise}
        />
      ) : null}

      <EvidenceUploader caseId={id} guestToken={guestToken} />

      {data.authorized ? (
        <>
          <ActionInbox actions={data.actions} />
          <CaseDetailTabs events={data.events} />
        </>
      ) : null}
    </section>
  );
}