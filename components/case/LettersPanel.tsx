import { Link } from '@/i18n/navigation';
import { FileText, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { DraftLetterButton } from '@/components/case/DraftLetterButton';

type EscalationStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'response_received'
  | 'timeout'
  | 'skipped';

export type LetterSummary = {
  level: 'L1' | 'L2' | 'L3';
  status: EscalationStatus;
  hasDraft: boolean;
};

const STATUS_LABEL: Record<EscalationStatus, string> = {
  draft: 'Draft ready',
  pending_approval: 'Ready to review',
  approved: 'Approved — ready to send',
  sent: 'Sent',
  response_received: 'Response received',
  timeout: 'Awaiting response',
  skipped: 'Skipped',
};

const STATUS_TONE: Record<EscalationStatus, 'neutral' | 'forest' | 'success' | 'warn'> = {
  draft: 'forest',
  pending_approval: 'forest',
  approved: 'forest',
  sent: 'success',
  response_received: 'success',
  timeout: 'warn',
  skipped: 'neutral',
};

const LEVEL_DESC: Record<'L1' | 'L2' | 'L3', string> = {
  L1: 'First letter to your bank branch manager.',
  L2: 'Escalation to the nodal officer — use if the branch does not respond in 7 days.',
  L3: 'Complaint to the RBI Banking Ombudsman — final step if L1 and L2 do not work.',
};

interface LettersPanelProps {
  caseId: string;
  letters: LetterSummary[];
  guestToken?: string;
}

export function LettersPanel({ caseId, letters, guestToken }: LettersPanelProps) {
  const byLevel = new Map(letters.map((l) => [l.level, l]));
  const levels: Array<'L1' | 'L2' | 'L3'> = ['L1', 'L2', 'L3'];
  const anyDraft = letters.some((l) => l.hasDraft);

  return (
    <div className="space-y-3">
      {!anyDraft ? (
        <p className="type-caption text-ink-faint">
          Your escalation letters appear here as your case progresses. You always review and send them
          yourself — nothing is sent automatically.
        </p>
      ) : null}

      <ul className="space-y-2">
        {levels.map((level) => {
          const letter = byLevel.get(level);
          const hasDraft = letter?.hasDraft ?? false;
          const isPreparing = Boolean(letter && !hasDraft);
          return (
            <li key={level} className="u-card flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ink-faint)]" aria-hidden />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[var(--ink)]">{level} letter</span>
                    {isPreparing ? (
                      <Badge tone="forest">Preparing draft</Badge>
                    ) : letter ? (
                      <Badge tone={STATUS_TONE[letter.status]}>{STATUS_LABEL[letter.status]}</Badge>
                    ) : (
                      <Badge tone="neutral">Not drafted yet</Badge>
                    )}
                  </div>
                  <p className="type-caption text-ink-faint">{LEVEL_DESC[level]}</p>
                </div>
              </div>
              {hasDraft ? (
                <Link
                  href={`/cases/${caseId}/letters/${level}`}
                  className="u-btn u-btn-secondary inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3 text-sm"
                >
                  View &amp; copy
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : isPreparing ? (
                <p className="type-caption max-w-[14rem] text-ink-faint">
                  Draft request received. Refresh in a moment if it does not appear automatically.
                </p>
              ) : level === 'L1' ? (
                <DraftLetterButton caseId={caseId} level="L1" guestToken={guestToken} />
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="type-caption text-ink-faint">
        Letters are copy-only — you send them by email or post yourself. Once you upload proof you sent one
        (on the letter page), the next level unlocks. This keeps your case on track and builds a strong paper trail.
      </p>
    </div>
  );
}
