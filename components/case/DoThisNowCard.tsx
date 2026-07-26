import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { DoThisNowModel } from '@/components/case/case-stages';

type DoThisNowCardProps = {
  caseId: string;
  doNow: DoThisNowModel;
};

/** The one dark "DO THIS NOW" card — a single primary action, nothing else. */
export function DoThisNowCard({ caseId, doNow }: DoThisNowCardProps) {
  const t = useTranslations('DoThisNowCard');
  const href =
    doNow.target === 'papers'
      ? `/cases/${caseId}/papers`
      : doNow.target === 'letter'
        ? `/cases/${caseId}/letters/L1`
        : doNow.target === 'path'
          ? `#unfreeze-path`
          : doNow.target === 'authority'
            ? `#authority-actions`
            : null;

  return (
    <section data-testid="do-this-now-card" className="u-next-steps animate-fade-up p-5">
      <div className="relative z-[1]">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[var(--color-sky-light)]">
          {t('label')}
        </p>
        <p className="type-display mt-2 text-xl text-white">{doNow.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/72">{doNow.desc}</p>
        {doNow.cta && href ? (
          href.startsWith('#') ? (
            <a
              href={href}
              className="u-btn u-btn-primary mt-3.5 flex min-h-[48px] w-full text-[0.9375rem] font-semibold no-underline"
            >
              {doNow.cta}
            </a>
          ) : (
            <Link
              href={href}
              className="u-btn u-btn-primary mt-3.5 flex min-h-[48px] w-full text-[0.9375rem] font-semibold"
            >
              {doNow.cta}
            </Link>
          )
        ) : null}
        {doNow.upNext ? (
          <p className="mt-3 text-xs text-white/55">{t('upNext', { text: doNow.upNext })}</p>
        ) : null}
      </div>
    </section>
  );
}
