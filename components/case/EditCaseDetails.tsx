'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { normalizePlaceholderValue } from '@/components/letters/placeholder-labels';

type Reason = 'cyber_upi_chain' | 'court_order' | 'tax_gst_attachment' | 'kyc_expired' | '';
type FreezeType = 'total_freeze' | 'partial_lien' | 'debit_freeze' | '';
type Role = 'sender' | 'receiver';

// Mirrors the intake wizard's option maps — the same facts, editable after the
// fact. Values map to translation keys under EditCaseDetails.<group>Options.
const REASON_OPTS: [Reason, string][] = [
  ['cyber_upi_chain', 'cyber'],
  ['court_order', 'court'],
  ['tax_gst_attachment', 'tax'],
  ['kyc_expired', 'kyc'],
  ['', 'unsure'],
];
const FREEZE_TYPE_OPTS: [FreezeType, string][] = [
  ['total_freeze', 'total'],
  ['partial_lien', 'lien'],
  ['debit_freeze', 'debit'],
  ['', 'unsure'],
];
const ROLE_OPTS: [Role, string][] = [
  ['sender', 'sender'],
  ['receiver', 'receiver'],
];

export type EditCaseInitial = {
  freezeReason: Reason;
  freezeType: FreezeType;
  userRole: Role;
  amountInr: string;
  bankName: string;
  userName: string;
  userAddress: string;
  userPhone: string;
};

const MAX_AMOUNT_INR = 1_000_000_000;

/**
 * "Edit your case details" — the durable edit surface for the case-defining
 * facts (reason / bank / role / freeze type / amount / contact). These were
 * previously settable ONLY once in intake, trapping anyone who picked "not sure"
 * or the wrong option. Reuses PATCH /api/v1/cases/[id]/intake.
 */
export function EditCaseDetails({
  caseId,
  initial,
  hasCommittedLetter,
}: {
  caseId: string;
  initial: EditCaseInitial;
  hasCommittedLetter: boolean;
}) {
  const t = useTranslations('EditCaseDetails');
  const router = useRouter();
  const [v, setV] = useState<EditCaseInitial>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof EditCaseInitial>(k: K, val: EditCaseInitial[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setSaved(false);
  };

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const phone = normalizePlaceholderValue('USER_PHONE', v.userPhone);
      const amount = Math.min(Number(normalizePlaceholderValue('AMOUNT_INR', v.amountInr)), MAX_AMOUNT_INR);

      const body: Record<string, unknown> = {
        victim_role: v.userRole === 'sender' ? 'victim' : 'innocent_receiver',
        intake_json: {
          user_role: v.userRole,
          bank_name: v.bankName.trim() || undefined,
          user_name: v.userName.trim() || undefined,
          user_address: v.userAddress.trim() || undefined,
          user_phone: phone || undefined,
          amount_inr: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        },
      };
      if (v.freezeReason) body.freeze_reason = v.freezeReason;
      if (v.freezeType) body.freeze_type = v.freezeType;
      if (Number.isFinite(amount) && amount > 0) body.frozen_amount_paise = Math.round(amount * 100);

      const res = await fetch(`/api/v1/cases/${caseId}/intake`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? t('saveError'));
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="u-card group overflow-hidden">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[0.84375rem] font-semibold text-[var(--ink)]">
            {t('summaryTitle')}
          </span>
          <span className="mt-px block text-xs text-[var(--ink-muted)]">{t('summarySub')}</span>
        </span>
        <span className="inline-flex flex-none items-center gap-1 text-xs text-[var(--ink-muted)]">
          <span className="group-open:hidden">{t('edit')}</span>
          <span className="hidden group-open:inline">{t('hide')}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>

      <div className="flex flex-col gap-3 border-t border-[var(--surface)] px-4 py-4">
        <Field label={t('reasonLabel')}>
          <select
            className="u-input"
            value={v.freezeReason}
            onChange={(e) => set('freezeReason', e.target.value as Reason)}
          >
            {REASON_OPTS.map(([val, key]) => (
              <option key={val || 'unsure'} value={val}>
                {t(`reasonOptions.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('freezeTypeLabel')}>
          <select
            className="u-input"
            value={v.freezeType}
            onChange={(e) => set('freezeType', e.target.value as FreezeType)}
          >
            {FREEZE_TYPE_OPTS.map(([val, key]) => (
              <option key={val || 'unsure'} value={val}>
                {t(`freezeTypeOptions.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('roleLabel')}>
          <select
            className="u-input"
            value={v.userRole}
            onChange={(e) => set('userRole', e.target.value as Role)}
          >
            {ROLE_OPTS.map(([val, key]) => (
              <option key={val} value={val}>
                {t(`roleOptions.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('amountLabel')}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={13}
            className="u-input"
            value={v.amountInr}
            onChange={(e) => set('amountInr', e.target.value.replace(/[^\d]/g, ''))}
            placeholder={t('amountPlaceholder')}
          />
        </Field>

        <Field label={t('bankLabel')}>
          <input
            type="text"
            maxLength={80}
            className="u-input"
            value={v.bankName}
            onChange={(e) => set('bankName', e.target.value)}
            placeholder={t('bankPlaceholder')}
          />
        </Field>

        <Field label={t('nameLabel')}>
          <input
            type="text"
            maxLength={120}
            autoComplete="name"
            className="u-input"
            value={v.userName}
            onChange={(e) => set('userName', e.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </Field>

        <Field label={t('addressLabel')}>
          <input
            type="text"
            maxLength={160}
            autoComplete="street-address"
            className="u-input"
            value={v.userAddress}
            onChange={(e) => set('userAddress', e.target.value)}
          />
        </Field>

        <Field label={t('phoneLabel')}>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={16}
            autoComplete="tel"
            className="u-input"
            value={v.userPhone}
            onChange={(e) => set('userPhone', e.target.value)}
            placeholder={t('phonePlaceholder')}
          />
        </Field>

        {hasCommittedLetter ? (
          <p className="rounded-[var(--radius-md)] border border-[var(--saffron)]/35 bg-[var(--warn-muted)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-muted)]">
            {t('committedNote')}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="u-btn u-btn-primary flex min-h-[44px] w-full gap-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          {saving ? t('saving') : saved ? t('saved') : t('saveChanges')}
        </button>

        {error ? (
          <p role="alert" className="u-alert u-alert-warn">
            {error}
          </p>
        ) : null}
      </div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[0.8125rem] font-semibold text-[var(--ink)]">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
