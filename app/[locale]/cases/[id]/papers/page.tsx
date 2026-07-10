import { Link } from '@/i18n/navigation';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PapersChecklist, type PaperVerification } from '@/components/evidence/PapersChecklist';
import { NoticeAnalysisCard } from '@/components/intake/NoticeAnalysisCard';
import type { NoticeAnalysisResult } from '@/components/intake/notice-analysis-types';
import { BundleButton } from '@/components/case/BundleButton';
import { GUEST_COOKIE_NAME, verifyGuestToken } from '@/lib/auth/guest';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCaseAccess, type RequestAuth } from '@/lib/api/case-access';
import { isReadable } from '@/lib/evidence/readability';
import { papersForReason, type PaperDocDef } from '@/lib/intake/paper-display';
import type { Database } from '@/supabase/database.types';

type PageProps = { params: Promise<{ locale: string; id: string }> };
type FreezeReason = Database['public']['Enums']['freeze_reason'];

type PapersData =
  | { authorized: false }
  | {
      authorized: true;
      initialDocs: Partial<Record<string, PaperVerification>>;
      initialShas: Partial<Record<string, string>>;
      coreDocs: PaperDocDef[];
      extraDocs: PaperDocDef[];
      reasonLabel: string | null;
      letterUnlocked: boolean;
      noticeAnalysis: NoticeAnalysisResult | null;
    };

async function loadPapersData(caseId: string, guestToken: string | undefined, locale: string): Promise<PapersData> {
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

  if (!auth.userId && !auth.guestSessionId) return { authorized: false };
  try {
    await assertCaseAccess(caseId, auth, 'viewer');
  } catch {
    return { authorized: false };
  }

  const admin = createAdminClient();
  const [{ data: caseRow }, { data: evidenceRows }, { data: events }, { data: notice }] = await Promise.all([
    admin.from('cases').select('freeze_reason').eq('id', caseId).maybeSingle(),
    admin
      .from('evidence')
      .select('id, evidence_type, created_at, sha256, vision_confidence, forgery_flag')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .not('sha256_verified_at', 'is', null)
      .order('created_at', { ascending: false }),
    admin
      .from('swarm_events')
      .select('event_type, metadata_json')
      .eq('case_id', caseId)
      .eq('event_type', 'evidence.verified')
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('notice_analysis')
      .select(
        'freeze_reason, severity, confidence, plain_english, what_this_means, suggested_next, human_review_required',
      )
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Mismatches only live in the verifier's swarm event; confidence + forgery are
  // authoritative on the evidence row. Key mismatches by evidence_id.
  const mismatchesByEvidenceId = new Map<string, Array<{ field: string; expected: string; found: string }>>();
  for (const event of events ?? []) {
    const m = (event.metadata_json ?? {}) as Record<string, unknown>;
    if (typeof m.evidence_id !== 'string' || mismatchesByEvidenceId.has(m.evidence_id)) continue;
    const mismatches = Array.isArray(m.mismatches)
      ? (m.mismatches as Array<{ field: string; expected: string; found: string }>).filter(
          (v) => typeof v === 'object' && v !== null && typeof v.field === 'string',
        )
      : [];
    mismatchesByEvidenceId.set(m.evidence_id, mismatches);
  }

  // The papers to ask for, adapted to the freeze reason (classified at case
  // creation). Falls back to notice-analysis reason, then the generic default.
  const freezeReason = (caseRow?.freeze_reason ?? notice?.freeze_reason ?? null) as FreezeReason | null;
  const { core: coreDocs, extras: extraDocs, reasonLabel } = papersForReason(freezeReason, locale);
  const allowedTypes = new Set([...coreDocs, ...extraDocs].map((d) => d.type));

  // Newest verified evidence row per type wins.
  const initialDocs: Partial<Record<string, PaperVerification>> = {};
  const initialShas: Partial<Record<string, string>> = {};
  const readableByType: Partial<Record<string, boolean>> = {};
  for (const row of evidenceRows ?? []) {
    const type = row.evidence_type as string;
    if (!allowedTypes.has(type) || type in initialDocs) continue;
    initialDocs[type] = {
      confidence: row.vision_confidence,
      forgery: row.forgery_flag,
      mismatches: mismatchesByEvidenceId.get(row.id) ?? [],
      humanReview: false,
    };
    initialShas[type] = row.sha256;
    readableByType[type] = isReadable(row.vision_confidence, row.forgery_flag);
  }

  return {
    authorized: true,
    initialDocs,
    initialShas,
    coreDocs,
    extraDocs,
    reasonLabel,
    // Mirrors the letter page's evidence gate: a readable notice + statement unlock it.
    letterUnlocked: !!readableByType.freeze_sms && !!readableByType.bank_statement,
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
  };
}

export default async function PapersPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('PapersPage');
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  const data = await loadPapersData(id, guestToken, locale);

  if (!data.authorized) {
    return (
      <section className="mx-auto flex max-w-[430px] flex-col gap-4">
        <div className="u-card animate-scale-in border-[var(--warn)]/25 bg-[var(--warn-muted)] px-5 py-6 text-sm text-[var(--ink)]">
          <p className="font-medium">{t('accessDeniedTitle')}</p>
          <p className="mt-1 text-[var(--ink-muted)]">{t('accessDeniedBody')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-[430px] flex-col gap-3.5">
      <Link
        href={`/cases/${id}`}
        className="min-h-[44px] self-start pt-2.5 text-sm font-medium text-[var(--ink-muted)] no-underline"
      >
        ← My case
      </Link>
      <div className="animate-fade-up">
        <h1 className="type-display-xl text-[1.625rem]">Add your papers</h1>
        <p className="mt-2 text-[0.90625rem] leading-relaxed text-[var(--ink-muted)]">
          Each paper makes your case stronger. A clear phone photo is fine (JPEG, PNG or PDF, up to
          25MB). Never upload passwords, OTPs, UPI PINs or full Aadhaar.
        </p>
      </div>

      <PapersChecklist
        caseId={id}
        guestToken={guestToken}
        initialDocs={data.initialDocs}
        initialShas={data.initialShas}
        coreDocs={data.coreDocs}
        extraDocs={data.extraDocs}
        reasonLabel={data.reasonLabel}
      />

      {data.noticeAnalysis ? <NoticeAnalysisCard result={data.noticeAnalysis} /> : null}

      {data.letterUnlocked ? (
        <>
          <BundleButton caseId={id} guestToken={guestToken} />
          <section className="rounded-[var(--radius-lg)] border border-[var(--success)]/22 bg-[var(--success)]/7 p-4">
            <p className="text-sm font-semibold text-[var(--ink)]">
              Good work — your first letter is ready.
            </p>
            <Link
              href={`/cases/${id}/letters/L1`}
              className="u-btn u-btn-primary mt-2.5 flex min-h-[48px] w-full text-[0.9375rem] font-semibold"
            >
              Read my letter →
            </Link>
          </section>
        </>
      ) : null}
    </section>
  );
}
