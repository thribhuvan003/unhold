'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import {
  PLACEHOLDER_FIELDS,
  localizePlaceholderField,
  placeholderExplanation,
  normalizePlaceholderValue,
} from '@/components/letters/placeholder-labels';

const MAX_AMOUNT_INR = 1_000_000_000; // ₹100 crore — blocks absurd values.

type Props = {
  caseId: string;
  level: 'L1' | 'L2' | 'L3';
  placeholdersMissing: string[];
  evidenceReady?: boolean;
};

/**
 * Collapsible "Complete your details" card (amber-bordered while details are
 * missing). Saves the answers to the case intake, asks the drafter to rewrite
 * the letter with them, and refreshes the page.
 */
export function LetterDetailsForm({ caseId, level, placeholdersMissing, evidenceReady }: Props) {
  const router = useRouter();
  const t = useTranslations('LetterDetailsForm');
  const locale = useLocale();
  const fillable = useMemo(
    () => placeholdersMissing.filter((k) => PLACEHOLDER_FIELDS[k]),
    [placeholdersMissing],
  );
  const informational = useMemo(
    () =>
      placeholdersMissing
        .map((k) => ({ key: k, note: placeholderExplanation(k, locale) }))
        .filter((e): e is { key: string; note: string } => !!e.note),
    [placeholdersMissing, locale],
  );

  // Open by default when details are missing — a collapsed form meant users
  // never filled it, so the letter went out generic and sending stayed locked.
  const [open, setOpen] = useState(fillable.length > 0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (fillable.length === 0 && informational.length === 0) return null;
  if (evidenceReady === false) {
    return (
      <div className="u-card border-[var(--warn)]/30 bg-[var(--warn-muted)] p-4 text-sm">
        {t('evidenceFirst')}
      </div>
    );
  }

  async function handleSave() {
    if (saving) return;
    const errs: Record<string, string> = {};
    for (const key of fillable) {
      const def = localizePlaceholderField(PLACEHOLDER_FIELDS[key], locale);
      const v = normalizePlaceholderValue(key, values[key] ?? '');
      if (v && def.pattern && !def.pattern.test(v)) {
        errs[key] = def.patternMessage ?? t('checkValue');
      }
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const intakeJson: Record<string, unknown> = {};
    let accountLast4: string | undefined;
    for (const key of fillable) {
      const def = PLACEHOLDER_FIELDS[key];
      const v = normalizePlaceholderValue(key, values[key] ?? '');
      if (!v) continue;
      if (key === 'AMOUNT_INR') {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) intakeJson[def.intakeKey] = Math.min(n, MAX_AMOUNT_INR);
      } else if (key === 'ACCOUNT_LAST4') {
        accountLast4 = v;
        intakeJson[def.intakeKey] = v;
      } else {
        intakeJson[def.intakeKey] = v;
      }
    }
    if (Object.keys(intakeJson).length === 0) {
      setError(t('fillOneField'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const patchRes = await fetch(`/api/v1/cases/${caseId}/intake`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_json: intakeJson,
          ...(accountLast4 ? { account_last4: accountLast4 } : {}),
        }),
      });
      if (!patchRes.ok) {
        const json = await patchRes.json().catch(() => ({}));
        throw new Error(json.error?.message ?? t('saveError'));
      }

      // Ask the drafter to rewrite the letter with the new details.
      const redraftRes = await fetch(`/api/v1/cases/${caseId}/escalations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });
      if (!redraftRes.ok) {
        const json = await redraftRes.json().catch(() => ({}));
        throw new Error(json.error?.message ?? t('redraftError'));
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  }

  const missingCount = fillable.length;
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <section
      data-testid="letter-details"
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-raised)] shadow-[var(--shadow-sm),var(--shadow-inset)]',
        missingCount > 0
          ? 'border-[1.5px] border-[var(--saffron)]/50'
          : 'border border-[var(--border)]',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 border-none bg-transparent px-4 py-3.5 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-[var(--ink)]">{t('completeTitle')}</span>
          <span className="mt-px block text-xs text-[var(--ink-faint)]">
            {t('rewriteHint')}{' '}
            {missingCount > 0 ? t('stillMissing', { count: missingCount }) : t('allFilled')}
          </span>
        </span>
        <span className="flex-none text-xs text-[var(--ink-faint)]">{open ? t('hide') : t('fillIn')}</span>
      </button>

      {open ? (
        <div className="flex flex-col gap-3 border-t border-[var(--surface)] px-4 py-3.5">
          {fillable.map((key) => {
            const def = localizePlaceholderField(PLACEHOLDER_FIELDS[key], locale);
            return (
              <label key={key} className="block">
                <span className="text-[0.8125rem] font-semibold text-[var(--ink)]">{def.label}</span>
                <input
                  type={def.inputType}
                  inputMode={
                    key === 'ACCOUNT_LAST4' ||
                    key === 'NCRP_ID' ||
                    key === 'USER_PHONE' ||
                    key === 'AMOUNT_INR'
                      ? 'numeric'
                      : undefined
                  }
                  maxLength={def.maxLength}
                  autoComplete={def.autoComplete}
                  min={def.inputType === 'date' ? def.min : undefined}
                  max={def.inputType === 'date' ? todayISO : undefined}
                  className="u-input mt-1.5 py-2"
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={def.placeholder}
                  aria-invalid={!!fieldErrors[key]}
                />
                {fieldErrors[key] ? (
                  <span className="mt-1 block text-xs text-[var(--error)]">{fieldErrors[key]}</span>
                ) : def.help ? (
                  <span className="mt-1 block text-xs text-[var(--ink-faint)]">{def.help}</span>
                ) : null}
              </label>
            );
          })}

          {fillable.length > 0 ? (
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
              {saving ? t('saving') : t('saveUpdate')}
            </button>
          ) : null}

          {informational.length > 0 ? (
            <div className="space-y-2">
              {informational.map(({ key, note }) => (
                <p
                  key={key}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-muted)]"
                >
                  {note}
                </p>
              ))}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="u-alert u-alert-warn">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
