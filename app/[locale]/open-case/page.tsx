'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';

/**
 * Recover a guest case from a new browser using public_id + recovery code.
 */
export default function OpenCasePage() {
  const t = useTranslations('OpenCasePage');
  const router = useRouter();
  const [publicId, setPublicId] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/cases/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: publicId.trim(),
          recovery_code: recoveryCode.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? t('errorGeneric'));
      }
      const caseId = json.case_id as string;
      router.push(`/cases/${caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-[430px] flex-col gap-4">
      <div className="u-card p-5">
        <p className="type-eyebrow">{t('eyebrow')}</p>
        <h1 className="type-display mt-2 text-xl">{t('title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{t('body')}</p>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--ink)]">{t('publicIdLabel')}</span>
            <input
              className="u-input mt-1.5 font-mono"
              value={publicId}
              onChange={(e) => setPublicId(e.target.value)}
              placeholder={t('publicIdPlaceholder')}
              autoComplete="off"
              required
              inputMode="text"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--ink)]">{t('recoveryLabel')}</span>
            <input
              className="u-input mt-1.5 font-mono tracking-widest"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder={t('recoveryPlaceholder')}
              autoComplete="off"
              required
              minLength={6}
              maxLength={16}
            />
          </label>
          {error ? (
            <p role="alert" className="u-alert u-alert-error">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="u-btn u-btn-primary min-h-[48px] w-full text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
      <Link href="/start" className="text-center text-sm font-semibold text-[var(--color-sky-deep)] no-underline">
        {t('startFresh')}
      </Link>
    </section>
  );
}
