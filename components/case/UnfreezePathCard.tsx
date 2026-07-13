import { useTranslations } from "next-intl";
import type { UnfreezePath } from "@/lib/case/unfreeze-path";

/** Scenario-aware suggested route. The recorded reason chooses a cautious set
 * of information-gathering steps; it is never presented as a guaranteed remedy.
 * Chrome is localised, while path content arrives from getUnfreezePath(). */
export function UnfreezePathCard({ path }: { path: UnfreezePath }) {
  const t = useTranslations("UnfreezePathCard");
  return (
    <section
      id="unfreeze-path"
      data-testid="unfreeze-path"
      className="u-card scroll-mt-20 p-4"
    >
      <p className="type-eyebrow">{t("eyebrow")}</p>

      <div
        className={
          path.branchCanFix
            ? "mt-2.5 rounded-[var(--radius-md)] border border-[var(--success)]/30 bg-[var(--success)]/8 px-3.5 py-3"
            : "mt-2.5 rounded-[var(--radius-md)] border border-[var(--saffron)]/40 bg-[var(--warn-muted)] px-3.5 py-3"
        }
      >
        <p className="text-[0.84375rem] font-semibold leading-relaxed text-[var(--ink)]">
          {path.headline}
        </p>
      </div>

      <div className="mt-3">
        <p className="type-eyebrow text-ink-faint">{t("keyStepLabel")}</p>
        <p className="mt-1 text-[0.90625rem] font-bold text-[var(--ink)]">
          {path.keyStep}
        </p>
      </div>

      <ol className="mt-3.5 flex flex-col gap-3">
        {path.steps.map((step) => (
          <li key={step.n} className="flex items-start gap-3">
            <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[var(--color-sky-deep)] text-[0.8125rem] font-bold text-white">
              {step.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.875rem] font-semibold text-[var(--ink)]">
                {step.title}
              </p>
              <p className="mt-0.5 text-[0.8125rem] leading-normal text-[var(--ink-muted)]">
                {step.detail}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-faint)]">
                {step.who}
                {step.deadline ? <> · {step.deadline}</> : null}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-3 border-t border-[var(--surface)] pt-2.5 text-xs leading-relaxed text-[var(--ink-faint)]">
        {t("disclaimer")}
      </p>
    </section>
  );
}
