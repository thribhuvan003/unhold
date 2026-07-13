import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { computeCaseStages } from '@/components/case/case-stages';
import { DoThisNowCard } from '@/components/case/DoThisNowCard';
import { UnfreezePathCard } from '@/components/case/UnfreezePathCard';
import { getUnfreezePath } from '@/lib/case/unfreeze-path';
import { StageChecklist } from '@/components/case/StageChecklist';
import { LettersLadderCard } from '@/components/case/LettersLadderCard';
import { WhatHappensNextCard } from '@/components/case/WhatHappensNextCard';
import { DisproportionateFreezeCard } from '@/components/case/DisproportionateFreezeCard';
import { EditCaseDetails, type EditCaseInitial } from '@/components/case/EditCaseDetails';
import { DeadlineRemindersCard } from '@/components/case/DeadlineRemindersCard';
import { SaveCaseCard } from '@/components/case/SaveCaseCard';
import { AuthorityActionsCard } from '@/components/case/AuthorityActionsCard';
import { PackageStatusCard } from '@/components/case/PackageStatusCard';
import {
  CourtTaxActionsCard,
  isCourtOrTaxTrack,
} from '@/components/case/CourtTaxActionsCard';
import type { LetterSummary } from '@/components/case/LettersPanel';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { cn } from '@/lib/ui/cn';
import { GUEST_COOKIE_NAME, resolveGuestToken } from '@/lib/auth/guest';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCaseAccess, type RequestAuth } from '@/lib/api/case-access';
import { isReadable } from '@/lib/evidence/readability';
import { Link } from '@/i18n/navigation';
import type { Database } from '@/supabase/database.types';

type PageProps = { params: Promise<{ locale: string; id: string }> };

type CaseDetailData =
  | { authorized: false }
  | {
      authorized: true;
      publicId: string | null;
      frozenAmountPaise: number | null;
      freezeType: string | null;
      freezeReason: Database['public']['Enums']['freeze_reason'] | null;
      hasFreezeNotice: boolean;
      hasBankStatement: boolean;
      hasPan: boolean;
      letters: LetterSummary[];
      l1Sent: boolean;
      hasCommittedLetter: boolean;
      edit: EditCaseInitial;
      reminderEmail: string;
      reminderOptIn: boolean;
      reminderWhatsapp: string;
      reminderWhatsappOptIn: boolean;
      accountLast4: string;
      ncrpId: string;
      freezeDate: string;
      hasSealedBundle: boolean;
      microUpiPattern: boolean;
    };

async function loadCaseDetailData(caseId: string, guestToken: string | undefined): Promise<CaseDetailData> {
  const guest = await resolveGuestToken(guestToken);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth: RequestAuth = {
    userId: user?.id ?? null,
    guestSessionId: guest?.guestSessionId ?? null,
    actorType: user ? 'user' : 'guest',
    actorId: user?.id ?? guest?.guestSessionId ?? '',
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
    { data: evidenceRows },
    { data: escalationRows },
    { data: bundleLog },
  ] = await Promise.all([
    admin
      .from('cases')
      .select(
        'public_id, frozen_amount_paise, freeze_type, freeze_reason, intake_json, account_last4, ncrp_id, frozen_since',
      )
      .eq('id', caseId)
      .maybeSingle(),
    admin
      .from('evidence')
      .select('evidence_type, sha256_verified_at, vision_confidence, forgery_flag')
      .eq('case_id', caseId)
      .is('deleted_at', null),
    admin
      .from('escalations')
      .select('level, status, letter_body, sent_at')
      .eq('case_id', caseId)
      .order('level', { ascending: true }),
    // Same signal proof-gates use — sealed pack is the product moat, not a side button.
    admin
      .from('action_logs')
      .select('id')
      .eq('case_id', caseId)
      .eq('action', 'evidence.bundle_generated')
      .limit(1)
      .maybeSingle(),
  ]);

  const intake = (caseRow?.intake_json ?? {}) as Record<string, unknown>;
  // A sealed file that the vision check couldn't read (e.g. a blank photo) must
  // not count as a real paper — mirror the papers page and letter gate.
  const gatheredTypes = new Set(
    (evidenceRows ?? [])
      .filter((e) => e.sha256_verified_at && isReadable(e.vision_confidence, e.forgery_flag))
      .map((e) => e.evidence_type as string),
  );

  return {
    authorized: true,
    publicId: caseRow?.public_id ?? null,
    frozenAmountPaise: caseRow?.frozen_amount_paise ?? null,
    freezeType:
      caseRow?.freeze_type ??
      (typeof intake.freeze_type_hint === 'string' ? intake.freeze_type_hint : null),
    freezeReason: caseRow?.freeze_reason ?? null,
    hasFreezeNotice: gatheredTypes.has('freeze_sms'),
    hasBankStatement: gatheredTypes.has('bank_statement'),
    hasPan: gatheredTypes.has('pan_card'),
    letters: (escalationRows ?? [])
      .filter((e): e is typeof e & { level: 'L1' | 'L2' | 'L3' } => ['L1', 'L2', 'L3'].includes(e.level))
      .map((e) => ({ level: e.level, status: e.status, hasDraft: !!e.letter_body })),
    l1Sent: (escalationRows ?? []).some(
      (e) => e.level === 'L1' && (!!e.sent_at || ['sent', 'response_received', 'timeout'].includes(e.status)),
    ),
    hasCommittedLetter: (escalationRows ?? []).some((e) =>
      (['approved', 'sent', 'response_received'] as string[]).includes(e.status),
    ),
    edit: {
      freezeReason: (caseRow?.freeze_reason ?? '') as EditCaseInitial['freezeReason'],
      freezeType: (caseRow?.freeze_type ??
        (typeof intake.freeze_type_hint === 'string' ? intake.freeze_type_hint : '')) as EditCaseInitial['freezeType'],
      userRole: intake.user_role === 'sender' ? 'sender' : 'receiver',
      amountInr:
        caseRow?.frozen_amount_paise != null
          ? String(Math.round(caseRow.frozen_amount_paise / 100))
          : typeof intake.amount_inr === 'number'
            ? String(intake.amount_inr)
            : '',
      bankName: typeof intake.bank_name === 'string' ? intake.bank_name : '',
      userName: typeof intake.user_name === 'string' ? intake.user_name : '',
      userAddress: typeof intake.user_address === 'string' ? intake.user_address : '',
      userPhone: typeof intake.user_phone === 'string' ? intake.user_phone : '',
    },
    reminderEmail: typeof intake.reminder_email === 'string' ? intake.reminder_email : '',
    reminderOptIn: intake.reminder_opt_in === true,
    reminderWhatsapp:
      typeof intake.reminder_whatsapp_e164 === 'string' ? intake.reminder_whatsapp_e164 : '',
    reminderWhatsappOptIn: intake.reminder_whatsapp_opt_in === true,
    accountLast4:
      (typeof caseRow?.account_last4 === 'string' && caseRow.account_last4) ||
      (typeof intake.account_last4 === 'string' ? intake.account_last4 : ''),
    ncrpId:
      (typeof caseRow?.ncrp_id === 'string' && caseRow.ncrp_id) ||
      (typeof intake.ncrp_id === 'string' ? intake.ncrp_id : ''),
    freezeDate:
      (typeof caseRow?.frozen_since === 'string' && caseRow.frozen_since
        ? new Date(caseRow.frozen_since).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '') ||
      (typeof intake.freeze_date === 'string' ? intake.freeze_date : ''),
    hasSealedBundle: Boolean(bundleLog),
    microUpiPattern:
      intake.micro_upi_pattern === true ||
      (typeof intake.amount_inr === 'number' && intake.amount_inr > 0 && intake.amount_inr <= 5000) ||
      (caseRow?.frozen_amount_paise != null &&
        caseRow.frozen_amount_paise > 0 &&
        caseRow.frozen_amount_paise <= 5000_00),
  };
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('CaseWorkspace');
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  const data = await loadCaseDetailData(id, guestToken);

  if (!data.authorized) {
    return (
      <section className="mx-auto flex max-w-[430px] flex-col gap-4">
        <div className="u-card animate-scale-in border-[var(--warn)]/25 bg-[var(--warn-muted)] px-5 py-6 text-sm text-[var(--ink)]">
          <p className="font-medium">{t('accessDeniedTitle')}</p>
          <p className="mt-1 text-[var(--ink-muted)]">{t('accessDeniedBody')}</p>
          <Link
            href="/open-case"
            className="mt-3 inline-flex min-h-[44px] items-center font-semibold text-[var(--color-sky-deep)] no-underline"
          >
            {t('accessDeniedRecover')}
          </Link>
        </div>
      </section>
    );
  }

  const path = getUnfreezePath(data.freezeReason, locale);
  const model = computeCaseStages(
    {
      track: path.track,
      hasFreezeNotice: data.hasFreezeNotice,
      hasBankStatement: data.hasBankStatement,
      hasPan: data.hasPan,
      l1Drafted: data.letters.some((l) => l.level === 'L1' && l.hasDraft),
      l1Sent: data.l1Sent,
    },
    locale,
  );

  const dotState = (i: number): 'done' | 'current' | 'todo' => {
    const stage = model.stages[i];
    if (stage?.state === 'done') return 'done';
    if (i === model.current) return 'current';
    return 'todo';
  };

  return (
    <section className="mx-auto flex max-w-[430px] flex-col gap-4">
      <header className="animate-fade-up">
        <p className="type-eyebrow">
          {t('eyebrow')}
          {data.publicId ? (
            <>
              {' '}
              · <span className="type-mono-data normal-case tracking-normal">{data.publicId}</span>
            </>
          ) : null}
        </p>
        <h1 className="type-display-xl mt-2 text-3xl">
          {data.frozenAmountPaise != null && data.frozenAmountPaise > 0 ? (
            <>
              <MoneyDisplay amountPaise={data.frozenAmountPaise} /> {t('frozenSuffix')}
            </>
          ) : (
            t('frozenFallback')
          )}
        </h1>
        {data.publicId ? (
          <div className="mt-2">
            <SaveCaseCard caseId={id} publicId={data.publicId} compact />
          </div>
        ) : null}
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {model.stages.map((stage, i) => (
            <div
              key={stage.title}
              className={cn(
                'h-1.5 flex-1 rounded',
                dotState(i) === 'done'
                  ? 'bg-[var(--success)]'
                  : dotState(i) === 'current'
                    ? 'border border-[var(--color-sky-deep)] bg-[var(--color-sky)]'
                    : 'bg-[#dcdad3]',
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-[0.84375rem] font-semibold text-[var(--ink-muted)]">
          {t('stepOf', { num: model.stageNum, title: model.stageTitle })}
        </p>
      </header>

      <UnfreezePathCard path={path} />

      <DoThisNowCard caseId={id} doNow={model.doNow} />

      {/* Package > letters — product is sealed pack + path, not L1–L3 cosplay. */}
      <PackageStatusCard
        track={path.track}
        hasFreezeNotice={data.hasFreezeNotice}
        hasBankStatement={data.hasBankStatement}
        hasSealedBundle={data.hasSealedBundle}
        l1Drafted={data.letters.some((l) => l.level === 'L1' && l.hasDraft)}
        l1Sent={data.l1Sent}
      />

      <StageChecklist caseId={id} stages={model.stages} />

      {/* Track-specific authority: cyber → IO/GRM; court/tax → officer/court (not bank ladder). */}
      {path.track === 'cyber' ? (
        <AuthorityActionsCard
          l1Sent={data.l1Sent}
          fields={{
            userName: data.edit.userName,
            userAddress: data.edit.userAddress,
            userPhone: data.edit.userPhone,
            bankName: data.edit.bankName,
            accountLast4: data.accountLast4,
            amountInr:
              data.frozenAmountPaise != null
                ? Math.round(data.frozenAmountPaise / 100).toLocaleString('en-IN')
                : data.edit.amountInr,
            freezeDate: data.freezeDate,
            ncrpId: data.ncrpId,
            policeStation: '',
          }}
        />
      ) : null}
      {isCourtOrTaxTrack(path.track) ? (
        <CourtTaxActionsCard track={path.track} l1Sent={data.l1Sent} />
      ) : null}

      {/* Micro-UPI / disproportionate freeze — SOP 2026 disputed-amount-only lever. */}
      <DisproportionateFreezeCard
        freezeType={data.freezeType}
        frozenAmountInr={
          data.frozenAmountPaise != null
            ? Math.round(data.frozenAmountPaise / 100).toLocaleString('en-IN')
            : null
        }
      />
      {data.microUpiPattern ? (
        <p
          data-testid="micro-upi-note"
          className="rounded-[var(--radius-md)] border border-[var(--saffron)]/35 bg-[var(--warn-muted)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--ink)]"
        >
          {t('microUpiNote')}
        </p>
      ) : null}

      <LettersLadderCard
        caseId={id}
        letters={data.letters}
        letterUnlocked={model.letterUnlocked}
        l1Sent={data.l1Sent}
      />

      {data.l1Sent ? <WhatHappensNextCard /> : null}

      {/* Deadline nudges — SOP clocks 7d / 15d / 30d / 90d; email + WhatsApp, user only. */}
      <DeadlineRemindersCard
        caseId={id}
        initialEmail={data.reminderEmail}
        initialEmailOptIn={data.reminderOptIn}
        initialWhatsapp={data.reminderWhatsapp}
        initialWhatsappOptIn={data.reminderWhatsappOptIn}
      />

      <EditCaseDetails caseId={id} initial={data.edit} hasCommittedLetter={data.hasCommittedLetter} />

    </section>
  );
}
