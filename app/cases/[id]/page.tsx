import { EvidenceUploader } from '@/components/evidence/EvidenceUploader';
import { NoticeAnalyzer } from '@/components/intake/NoticeAnalyzer';
import type { NoticeAnalysisResult } from '@/components/intake/notice-analysis-types';
import { DocumentChecklist } from '@/components/case/DocumentChecklist';
import { getDocumentChecklist, getFreezeReasonLabel } from '@/lib/intake/document-checklist';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { LettersPanel, type LetterSummary } from '@/components/case/LettersPanel';
import { BundleButton } from '@/components/case/BundleButton';
import { NextStepsCard } from '@/components/case/NextStepsCard';
import { ActionInbox } from '@/components/case/ActionInbox';
import { CaseDetailTabs } from '@/components/case/CaseDetailTabs';
import { CaseSection } from '@/components/case/CaseSection';
import { Badge } from '@/components/ui/Badge';
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
      publicId: string | null;
      frozenAmountPaise: number | null;
      actions: Database['public']['Tables']['user_actions']['Row'][];
      events: Database['public']['Tables']['swarm_events']['Row'][];
      noticeAnalysis: NoticeAnalysisResult | null;
      freezeReason: Database['public']['Enums']['freeze_reason'] | null;
      gatheredEvidenceTypes: string[];
      letters: LetterSummary[];
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
  const [
    { data: caseRow },
    { data: actions },
    { data: events },
    { data: notice },
    { data: evidenceRows },
    { data: escalationRows },
  ] = await Promise.all([
      admin.from('cases').select('public_id, frozen_amount_paise, freeze_reason').eq('id', caseId).maybeSingle(),
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
      admin
        .from('notice_analysis')
        .select('freeze_reason, severity, confidence, plain_english, what_this_means, suggested_next, human_review_required')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin.from('evidence').select('evidence_type').eq('case_id', caseId).is('deleted_at', null),
      admin.from('escalations').select('level, status, letter_body').eq('case_id', caseId).order('level', { ascending: true }),
    ]);

  return {
    authorized: true,
    publicId: caseRow?.public_id ?? null,
    frozenAmountPaise: caseRow?.frozen_amount_paise ?? null,
    actions: actions ?? [],
    events: events ?? [],
    noticeAnalysis: notice
      ? {
          freeze_reason: notice.freeze_reason,
          severity: notice.severity,
          confidence: notice.confidence,
          plain_english: notice.plain_english,
          what_this_means: notice.what_this_means,
          suggested_next: notice.suggested_next,
          human_review_required: notice.human_review_required,
          extracted: {},
        }
      : null,
    freezeReason: caseRow?.freeze_reason ?? notice?.freeze_reason ?? null,
    gatheredEvidenceTypes: (evidenceRows ?? []).map((e) => e.evidence_type),
    letters: (escalationRows ?? [])
      .filter((e): e is typeof e & { level: 'L1' | 'L2' | 'L3' } => ['L1', 'L2', 'L3'].includes(e.level))
      .map((e) => ({ level: e.level, status: e.status, hasDraft: !!e.letter_body })),
  };
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  const data = await loadCaseDetailData(id, guestToken);

  const pendingActions = data.authorized ? data.actions.filter((a) => !a.completed_at).length : 0;
  const flaggedEvents = data.authorized
    ? data.events.filter(
        (e) => e.severity === 'human_required' || e.severity === 'warn' || e.severity === 'error',
      ).length
    : 0;

  return (
    <section className="mx-auto max-w-3xl space-y-10">
      <header className="animate-fade-up space-y-3 border-b border-[var(--border)] pb-8">
        <p className="type-eyebrow">Case workspace</p>
        <h1 className="type-display mt-1 text-3xl sm:text-4xl">
          {data.authorized && data.publicId ? (
            <span className="type-mono-data text-[1.75rem] sm:text-[2.25rem]">{data.publicId}</span>
          ) : (
            'Case detail'
          )}
        </h1>
        {data.authorized &&
        (data.frozenAmountPaise != null || data.freezeReason || data.noticeAnalysis) ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
            {data.frozenAmountPaise != null ? (
              <span className="text-[var(--ink)]">
                <MoneyDisplay amountPaise={data.frozenAmountPaise} className="font-medium" /> frozen
              </span>
            ) : null}
            {getFreezeReasonLabel(data.freezeReason) ? (
              <span className="text-[var(--ink-muted)]">{getFreezeReasonLabel(data.freezeReason)}</span>
            ) : null}
            {data.noticeAnalysis ? (
              <Badge tone={data.noticeAnalysis.severity === 'critical' ? 'error' : data.noticeAnalysis.severity === 'low' ? 'neutral' : 'warn'}>
                {data.noticeAnalysis.severity} severity
              </Badge>
            ) : null}
          </div>
        ) : null}
        <p className="type-lead max-w-prose text-[0.9375rem]">
          {data.authorized
            ? 'Upload evidence, complete actions, and review AI activity — nothing is sent to your bank automatically.'
            : 'Sign in or use your guest link to view this case.'}
        </p>
        {data.authorized ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {pendingActions > 0 ? (
              <Badge tone="warn">
                {pendingActions} action{pendingActions === 1 ? '' : 's'} pending
              </Badge>
            ) : null}
            {flaggedEvents > 0 ? (
              <Badge tone="warn">
                {flaggedEvents} AI flag{flaggedEvents === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </header>

      {!data.authorized ? (
        <div className="u-card animate-scale-in border-[var(--warn)]/25 bg-[var(--warn-muted)] px-5 py-6 text-sm text-[var(--ink)]">
          <p className="font-medium">You don&apos;t have access to this case.</p>
          <p className="mt-1 text-[var(--ink-muted)]">
            If you started this case as a guest, open it from the same browser where you created it.
          </p>
        </div>
      ) : null}

      {data.authorized ? (
        <CaseSection label="Your next step" description="Complete today's action to move your case forward.">
          <NextStepsCard
            caseId={id}
            initialActions={data.actions}
            frozenAmountPaise={data.frozenAmountPaise}
          />
          <ActionInbox actions={data.actions} />
        </CaseSection>
      ) : null}

      {data.authorized ? (
        <CaseSection
          label="Understand your freeze notice"
          description="Paste your bank's freeze notice or SMS and get a plain-English explanation. Guidance only — nothing is sent."
          stagger={2}
        >
          <NoticeAnalyzer caseId={id} guestToken={guestToken} initialAnalysis={data.noticeAnalysis} />
        </CaseSection>
      ) : null}

      {data.authorized ? (
        <CaseSection
          label="Documents to gather"
          description="Based on your freeze, here's what helps your case — and why."
          stagger={3}
        >
          <DocumentChecklist
            items={getDocumentChecklist(data.freezeReason)}
            gatheredTypes={data.gatheredEvidenceTypes}
          />
        </CaseSection>
      ) : null}

      {data.authorized ? (
        <CaseSection
          label="Your letters"
          description="Review each escalation letter, then send it yourself. Nothing is sent for you."
          stagger={4}
        >
          <LettersPanel caseId={id} letters={data.letters} guestToken={guestToken} />
        </CaseSection>
      ) : null}

      <CaseSection
        label="Evidence"
        description="Upload documents — each file is SHA-256 verified and checked automatically."
        stagger={5}
      >
        <EvidenceUploader caseId={id} guestToken={guestToken} />
        <BundleButton caseId={id} guestToken={guestToken} />
      </CaseSection>

      {data.authorized ? (
        <CaseSection
          label="Activity"
          description="Review what our AI agents have done and anything flagged for your attention."
        >
          <CaseDetailTabs events={data.events} />
        </CaseSection>
      ) : null}
    </section>
  );
}