'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { LetterPreview } from '@/components/letters/LetterPreview';
import { SendByEmailCard } from '@/components/letters/SendByEmailCard';
import { MarkSentForm } from '@/components/escalations/MarkSentForm';
import { BundleButton } from '@/components/case/BundleButton';
import type { UnfreezeTrack } from '@/lib/case/unfreeze-path';

type LetterWorkspaceProps = {
  caseId: string;
  escalationId: string;
  subject: string;
  body: string;
  level: 'L1' | 'L2' | 'L3';
  placeholdersMissing: string[];
  approved: boolean;
  evidenceReady: boolean;
  sent: boolean;
  track?: UnfreezeTrack;
  bankName: string;
  initialEmail?: string;
  initialEmailNote?: string;
  verifiedDate?: string;
  verifiedSourceUrl?: string;
  portal?: string;
  /** Same proof gate the approve/mark-sent APIs enforce, checked up front. */
  bundleGateBlocked?: boolean;
  bundleGateReason?: string;
  bundleGateHref?: string;
  bundleGateLinkLabel?: string;
  /** True when missingProof includes evidence_bundle specifically. */
  needsSealedBundle?: boolean;
};

const LEVEL_NUM: Record<'L1' | 'L2' | 'L3', number> = { L1: 1, L2: 2, L3: 3 };

/**
 * Client bridge for the letter page: holds the reviewed/sent state so the
 * review gate in the preview unlocks the send card, and mark-sent flips the
 * page into its "sent — proof saved" state without a reload.
 */
export function LetterWorkspace({
  caseId,
  escalationId,
  subject,
  body,
  level,
  placeholdersMissing,
  approved,
  evidenceReady,
  sent,
  track,
  bankName,
  initialEmail,
  initialEmailNote,
  verifiedDate,
  verifiedSourceUrl,
  portal,
  bundleGateBlocked = false,
  bundleGateReason,
  bundleGateHref,
  bundleGateLinkLabel,
  needsSealedBundle = false,
}: LetterWorkspaceProps) {
  const t = useTranslations('LetterWorkspace');
  const router = useRouter();
  const [isApproved, setIsApproved] = useState(approved);
  const [justSent, setJustSent] = useState(false);
  const [bundleSealedLocal, setBundleSealedLocal] = useState(!needsSealedBundle);
  const isSent = sent || justSent;
  const n = LEVEL_NUM[level];

  const detailsReady = isApproved && placeholdersMissing.length === 0 && evidenceReady;
  // Align export with the bundle half of the proof gate — user still attaches PDF themselves.
  const canExport = detailsReady && bundleSealedLocal;
  // Local seal only clears an evidence_bundle block — never a prior-level proof block.
  const markSentBlocked =
    !isApproved || (bundleGateBlocked && !(needsSealedBundle && bundleSealedLocal));
  const markSentBlockedReason = !isApproved
    ? t('reviewFirst')
    : markSentBlocked
      ? bundleGateReason
      : undefined;

  return (
    <>
      <LetterPreview
        caseId={caseId}
        escalationId={escalationId}
        subject={subject}
        body={body}
        level={level}
        placeholdersMissing={placeholdersMissing}
        approved={isApproved}
        evidenceReady={evidenceReady}
        track={track}
        onApproved={() => setIsApproved(true)}
        gateBlocked={!isApproved && bundleGateBlocked && !bundleSealedLocal}
        gateBlockedReason={bundleGateReason}
        gateBlockedHref={bundleGateHref}
        gateBlockedLinkLabel={bundleGateLinkLabel}
      />

      {!isSent ? (
        <BundleButton
          caseId={caseId}
          compact
          onSealed={() => {
            setBundleSealedLocal(true);
            router.refresh();
          }}
        />
      ) : null}

      <SendByEmailCard
        subject={subject}
        body={body}
        bankName={bankName}
        canExport={canExport}
        showAttachReminder={canExport}
        initialEmail={initialEmail}
        initialEmailNote={initialEmailNote}
        verifiedDate={verifiedDate}
        verifiedSourceUrl={verifiedSourceUrl}
        portal={portal}
      />

      {isSent ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--success)]/22 bg-[var(--success)]/7 px-4 py-3.5">
          <p className="text-sm font-semibold text-[var(--success)]">{t('sentTitle', { n })}</p>
          <p className="mt-1 text-[0.8125rem] leading-normal text-[var(--ink-muted)]">
            {t('sentBody')}
            {level === 'L1' ? t('sentBodyL1') : ''}
            {level === 'L2' ? t('sentBodyL2') : ''}
          </p>
          <Link
            href={`/cases/${caseId}`}
            className="u-btn u-btn-ghost mt-2.5 flex min-h-[44px] w-full text-sm font-semibold"
          >
            {t('backToCase')}
          </Link>
        </section>
      ) : (
        <MarkSentForm
          caseId={caseId}
          escalationId={escalationId}
          level={level}
          proofGateBlocked={markSentBlocked}
          blockedReason={markSentBlockedReason}
          onSuccess={() => setJustSent(true)}
        />
      )}
    </>
  );
}
