import { Link } from '@/i18n/navigation';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { DraftPendingRefresh } from '@/components/letters/DraftPendingRefresh';
import { LetterDetailsForm } from '@/components/letters/LetterDetailsForm';
import { LetterWorkspace } from '@/components/letters/LetterWorkspace';
import { RequestDraft } from '@/components/letters/RequestDraft';
import { BankVisitScript } from '@/components/case/BankVisitScript';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GUEST_COOKIE_NAME, verifyGuestToken } from '@/lib/auth/guest';
import { assertCaseAccess, type RequestAuth } from '@/lib/api/case-access';
import { getBankContacts } from '@/lib/banks/official-contacts';
import { isReadable } from '@/lib/evidence/readability';
import { getDocumentChecklist } from '@/lib/intake/document-checklist';
import { getUnfreezePath } from '@/lib/case/unfreeze-path';
import { checkProofGates, type ProofGateResult } from '@/lib/escalations/proof-gates';
import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * Turn a failed proof gate into something the user can act on immediately,
 * instead of only surfacing a raw guard error after they click approve.
 */
function friendlyGateBlock(
  gate: ProofGateResult | null,
  caseId: string,
  level: string,
): { blocked: boolean; reason?: string; href?: string; linkLabel?: string } {
  if (!gate || gate.passed) return { blocked: false };
  if (gate.guard === 'evidence_not_ready') {
    return {
      blocked: true,
      reason:
        'Make your proof pack below before this letter can be approved — it seals your documents into one PDF with a tamper-evident checksum. Attach that PDF when you send.',
      href: undefined,
      linkLabel: undefined,
    };
  }
  if (gate.guard === 'has_prior_level_proof') {
    const prior = level === 'L3' ? 'L2' : 'L1';
    return {
      blocked: true,
      reason: `Upload proof that you sent Letter ${prior} before this letter can be approved.`,
      href: `/cases/${caseId}/letters/${prior}`,
      linkLabel: `Go to Letter ${prior}`,
    };
  }
  if (gate.guard === 'escalation_send_consent') {
    return {
      blocked: true,
      reason: 'This step needs your consent to send an RBI Ombudsman escalation before it can be approved.',
    };
  }
  return { blocked: true, reason: gate.blockedReason ?? 'This letter cannot be approved yet.' };
}

type PageProps = {
  params: Promise<{ locale: string; id: string; level: string }>;
};

const VALID = new Set(['L1', 'L2', 'L3']);

export default async function LetterPage({ params }: PageProps) {
  const { locale, id, level } = await params;
  if (!VALID.has(level)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('LetterPage');

  // Guest-aware auth, mirroring the case workspace page: a guest JWT cookie OR a
  // signed-in Supabase user. The anon client cannot read a guest's rows under RLS,
  // so we authorize the requester and then read via the admin client.
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value;
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

  if (!auth.userId && !auth.guestSessionId) notFound();
  try {
    await assertCaseAccess(id, auth, 'viewer');
  } catch {
    notFound();
  }

  const admin = createAdminClient();
  const { data: escalation } = await admin
    .from('escalations')
    .select('*')
    .eq('case_id', id)
    .eq('level', level as 'L1' | 'L2' | 'L3')
    .maybeSingle();

  // Resolve the case's bank so we can suggest an official recipient contact.
  // The user's guided-intake choice wins; the cases.bank_id row may be a
  // provisional slug (bank_unconfirmed) that must never surface as a contact.
  const { data: caseRow } = await admin
    .from('cases')
    .select('bank_id, intake_json, freeze_reason, frozen_amount_paise, ncrp_id')
    .eq('id', id)
    .maybeSingle();

  // Evidence gate for letter: require a readable freeze notice/SMS + bank
  // statement. "Readable" = sealed AND the vision check didn't reject it (a
  // blank photo is sealed but unreadable, so it must not unlock the letter).
  const { data: evidence } = await admin
    .from('evidence')
    .select('evidence_type, sha256_verified_at, vision_confidence, forgery_flag')
    .eq('case_id', id)
    .is('deleted_at', null);

  const hasFreezeNotice = evidence?.some(
    (e) =>
      ['freeze_sms', 'freeze_notice', 'bank_notice'].includes(e.evidence_type) &&
      e.sha256_verified_at &&
      isReadable(e.vision_confidence, e.forgery_flag),
  );
  const hasBankStatement = evidence?.some(
    (e) =>
      e.evidence_type === 'bank_statement' &&
      e.sha256_verified_at &&
      isReadable(e.vision_confidence, e.forgery_flag),
  );
  // Unlock the letter on the papers THIS freeze reason actually requires, not a
  // hardcoded freeze-notice + bank-statement — a KYC or nomination freeze never
  // lists a bank statement, which permanently locked those users out of their
  // own letter. Rule: at least 2 of the reason's required docs are readable
  // (or all required, if the reason lists fewer than 2).
  const readableType = (t: string) =>
    t === 'freeze_sms'
      ? hasFreezeNotice
      : (evidence ?? []).some(
          (e) =>
            e.evidence_type === t &&
            e.sha256_verified_at &&
            isReadable(e.vision_confidence, e.forgery_flag),
        );
  const requiredTypes = getDocumentChecklist(caseRow?.freeze_reason ?? null)
    .filter((c) => c.required)
    .map((c) => c.evidence_type as string);
  const evidenceReady =
    requiredTypes.filter(readableType).length >= Math.min(2, requiredTypes.length);
  const track = getUnfreezePath(caseRow?.freeze_reason ?? null).track;
  const intake = (caseRow?.intake_json ?? {}) as Record<string, unknown>;
  let bankSlug: string | null =
    typeof intake.bank_slug_selected === 'string' ? intake.bank_slug_selected : null;
  if (!bankSlug && intake.bank_unconfirmed !== true && caseRow?.bank_id) {
    const { data: bankRow } = await admin
      .from('banks')
      .select('slug')
      .eq('id', caseRow.bank_id)
      .maybeSingle();
    bankSlug = bankRow?.slug ?? null;
  }
  // Recipient email from official sources only — never an invented address. The
  // send card leads with the user's own BRANCH email (from their passbook); this
  // is the bank's verified general complaint inbox as a fallback, plus the
  // official complaint page for banks that publish no email.
  const bank = bankSlug ? getBankContacts(bankSlug) : null;
  const levelContact = level === 'L1' ? undefined : bank?.contacts.find((c) => c.level === level && c.email);
  const generalContact = bank?.contacts.find((c) => c.level === 'general' && c.email);
  const initialContact = levelContact ?? generalContact;
  const initialEmail = initialContact?.email ?? undefined;
  const initialEmailNote = initialContact?.notes ?? undefined;
  const verifiedDate = initialContact?.verified_date;
  const verifiedSourceUrl = initialContact?.source_url;
  const portal =
    bank?.contacts.find((c) => c.level === level && c.portal)?.portal ??
    bank?.contacts.find((c) => c.portal)?.portal ??
    'https://ncrp-grievanceredressal.mha.gov.in/';

  // No escalation yet (opened straight from "Open my letter"): ask the
  // drafter for it, then auto-refresh. Never a 404 dead end — but only once
  // the evidence gate is satisfied, so the letter has real facts to use.
  if (!escalation && evidenceReady) {
    return (
      <div className="mx-auto max-w-[430px] px-1 py-2">
        <RequestDraft caseId={id} level={level as 'L1' | 'L2' | 'L3'} guestToken={guestToken} />
      </div>
    );
  }

  // Escalation exists but the drafter job hasn't produced the letter body yet:
  // auto-refreshing "being prepared" state instead of a manual-refresh dead end.
  if (escalation && (!escalation.letter_body || !escalation.letter_subject)) {
    return (
      <div className="mx-auto max-w-[430px] px-1 py-2">
        <DraftPendingRefresh caseId={id} level={level} />
      </div>
    );
  }

  const metadata = (escalation?.metadata_json ?? {}) as {
    placeholders_missing?: string[];
  };
  const placeholdersMissing = metadata.placeholders_missing ?? [];
  const sent = escalation?.status === 'sent' || escalation?.sent_at != null;
  const alreadyApproved = escalation?.status === 'approved' || escalation?.approved_at != null;

  // Pre-emptively check the same proof gate the approve/mark-sent APIs enforce,
  // so a blocked letter explains why and links to the fix instead of only
  // failing after the user clicks through. Checked for BOTH the pre-approval
  // (approve button) and approved-but-not-sent (mark-sent button) windows —
  // the mark-sent API re-evaluates the gate, so skipping it after approval
  // would reopen the silent-failure this whole flow exists to prevent.
  // Best-effort: a transient DB error must degrade (no banner), never crash the
  // page — the approve/mark-sent APIs remain the enforcing source of truth.
  let gate: ProofGateResult | null = null;
  if (escalation && !sent) {
    try {
      gate = await checkProofGates(id, level as 'L1' | 'L2' | 'L3');
    } catch {
      gate = null;
    }
  }
  const gateBlock = friendlyGateBlock(gate, id, level);
  const needsSealedBundle = Boolean(gate?.missingProof?.includes('evidence_bundle'));

  return (
    <div className="mx-auto flex max-w-[430px] flex-col gap-3.5">
      <Link
        href={`/cases/${id}`}
        className="min-h-[44px] self-start pt-2.5 text-sm font-medium text-[var(--ink-muted)] no-underline"
      >
        {t('backToCase')}
      </Link>

      <div className="animate-fade-up">
        <h1 className="type-display-xl text-[1.625rem]">
          {t.has(`levelTitle.${level}`) ? t(`levelTitle.${level}`) : t('fallbackTitle')}
        </h1>
        <p className="mt-2 text-[0.90625rem] leading-relaxed text-[var(--ink-muted)]">
          {t.rich('youSendIt', {
            strong: (chunks) => <strong className="text-[var(--ink)]">{chunks}</strong>,
          })}{' '}
          <span className="inline-block rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[0.6875rem] text-[var(--ink-muted)]">
            {t(`levelChip.${level}`)}
          </span>
        </p>
      </div>

      {!evidenceReady || !escalation ? (
        <div className="u-card border-[var(--warn)]/30 bg-[var(--warn-muted)] p-4 text-sm text-[var(--ink)]">
          <p className="font-semibold">{t('papersFirstTitle')}</p>
          <p className="mt-1 text-[var(--ink-muted)]">{t('papersFirstBody')}</p>
          <Link href={`/cases/${id}/papers`} className="mt-2 inline-block font-medium underline">
            {t('addPapersCta')}
          </Link>
        </div>
      ) : (
        <>
          {placeholdersMissing.length > 0 ? (
            <LetterDetailsForm
              caseId={id}
              level={level as 'L1' | 'L2' | 'L3'}
              placeholdersMissing={placeholdersMissing}
              evidenceReady={evidenceReady}
            />
          ) : null}

          <p
            lang={locale}
            className="rounded-[var(--radius-md)] border border-[var(--color-sky)]/30 bg-[var(--color-sky-mist)] px-3.5 py-3 text-[0.84375rem] leading-relaxed text-[var(--ink)]"
          >
            {t(`summary.${track}`)}
          </p>

          <LetterWorkspace
            caseId={id}
            escalationId={escalation.id}
            subject={escalation.letter_subject ?? ''}
            body={escalation.letter_body ?? ''}
            level={level as 'L1' | 'L2' | 'L3'}
            placeholdersMissing={placeholdersMissing}
            approved={alreadyApproved}
            evidenceReady={evidenceReady}
            sent={sent}
            track={track}
            bundleGateBlocked={gateBlock.blocked}
            bundleGateReason={gateBlock.reason}
            bundleGateHref={gateBlock.href}
            bundleGateLinkLabel={gateBlock.linkLabel}
            needsSealedBundle={needsSealedBundle}
            bankName={bank?.bank_name ?? 'Your bank'}
            initialEmail={initialEmail}
            initialEmailNote={initialEmailNote}
            verifiedDate={verifiedDate}
            verifiedSourceUrl={verifiedSourceUrl}
            portal={portal}
            guestToken={guestToken}
          />

          {/* Tea-vendor / branch-visit path — strongest for L1 (print + stamp). */}
          {level === 'L1' ? (
            <BankVisitScript
              ncrpId={
                (typeof caseRow?.ncrp_id === 'string' && caseRow.ncrp_id) ||
                (typeof intake.ncrp_id === 'string' ? intake.ncrp_id : null)
              }
              amountInr={
                caseRow?.frozen_amount_paise != null
                  ? String(Math.round(caseRow.frozen_amount_paise / 100))
                  : typeof intake.amount_inr === 'number'
                    ? String(intake.amount_inr)
                    : null
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
}
