import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildTemplateFallback } from "@/lib/agents/fallback/index";
import { buildCaseAwareLines } from "@/lib/agents/drafter/runner";
import { getUnfreezePath } from "@/lib/case/unfreeze-path";
import { UnfreezePathCard } from "@/components/case/UnfreezePathCard";
import { DisproportionateFreezeCard } from "@/components/case/DisproportionateFreezeCard";
import { LetterPreview } from "@/components/letters/LetterPreview";
import { LegalPositionNote } from "@/components/legal/LegalPositionNote";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { DISPUTED_AMOUNT_RULE } from "@/lib/legal/positions";

export const metadata: Metadata = {
  title: "See a worked example — Unhold",
  description:
    "A sample frozen-account case, worked end to end — the real letter, the honest unfreeze path, and the sourced law. No account or documents needed.",
};

// A realistic sample case so anyone — a curious visitor, a reviewer — can see
// exactly what Unhold produces without having a freeze or any documents.
const SAMPLE = {
  TODAY_DATE: "2026-07-06",
  USER_NAME: "Asha Rao",
  USER_ADDRESS: "4 Residency Road, Bengaluru 560025",
  USER_PHONE: "9876500000",
  BANK_NAME: "State Bank of India",
  BRANCH_CITY: "Bengaluru",
  ACCOUNT_LAST4: "4417",
  AMOUNT_INR: "1800",
  FREEZE_DATE: "2026-06-20",
  NCRP_ID: "30912345678901",
};

type Props = { params: Promise<{ locale: string }> };

export default async function DemoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DemoPage");
  const proofSteps = t.raw("proofSteps") as Array<{
    label: string;
    text: string;
  }>;
  const caseLines = buildCaseAwareLines(
    { user_role: "receiver", freeze_type_hint: "total_freeze" },
    SAMPLE.AMOUNT_INR,
    "cyber_upi_chain",
    SAMPLE.NCRP_ID,
  );
  const letter = buildTemplateFallback("L1", { ...SAMPLE, ...caseLines });
  const path = getUnfreezePath("cyber_upi_chain", locale);

  return (
    <div className="mx-auto flex max-w-[430px] flex-col gap-4">
      {/* Lead with the killer insight in plain words, not a caveat — all three
          comprehension reviewers (HRs + a normal user) said the value was buried
          under a legal briefing. State it first; let the cards below be the proof. */}
      <div className="animate-fade-up">
        <p className="type-eyebrow">{t("eyebrow")}</p>
        <h1 className="type-display-xl mt-1.5 text-[1.625rem] leading-tight">
          {t("title")}
        </h1>
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">
          {t("intro")}
        </p>
        <p className="mt-3 rounded-[var(--radius-md)] border border-[var(--saffron)]/35 bg-[var(--warn-muted)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-muted)]">
          {t("sampleNote")}
        </p>
      </div>

      <section
        className="u-card animate-fade-up p-4"
        aria-labelledby="worked-proof-title"
      >
        <h2 id="worked-proof-title" className="type-eyebrow">
          {t("proofTitle")}
        </h2>
        <ol className="mt-3 space-y-3">
          {proofSteps.map((step, index) => (
            <li key={step.label} className="flex gap-3">
              <span className="type-mono-data flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--color-sky-mist)] text-xs font-bold text-[var(--color-sky-deep)]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="type-eyebrow text-[var(--color-sky-deep)]">
                  {step.label}
                </p>
                <p className="mt-0.5 text-[0.8125rem] leading-normal text-[var(--ink-muted)]">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 1. The differentiator: who can actually unfreeze this */}
      <UnfreezePathCard path={path} />

      {/* 2. The actual, scenario-aware letter */}
      <div className="animate-fade-up">
        <h2 className="type-display text-[1.3125rem]">{t("letterTitle")}</h2>
        <p className="mt-1.5 text-[0.8125rem] leading-normal text-[var(--ink-muted)]">
          {t("letterDesc")}
        </p>
      </div>
      <LetterPreview
        subject={letter.subject}
        body={letter.body}
        level="L1"
        placeholdersMissing={[]}
        approved
        evidenceReady
        track={path.track}
        factSummary={t("letterFactNote")}
      />

      {/* 3. Legal context follows the usable output. */}
      <DisproportionateFreezeCard
        freezeType="total_freeze"
        frozenAmountInr="1,800"
      />

      <section className="u-card p-4">
        <p className="type-eyebrow">{t("sourcesTitle")}</p>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--ink-muted)]">
          {t("sourcesDesc")}
        </p>
        <div className="mt-2.5">
          <ProvenanceChip
            verifiedDate="2026-07-02"
            sourceUrl="https://sbi.bank.in/web/customer-care/addresses-and-helpline-nos-of-grievances-redressal-cell"
            sourceLabel={t("sourceLabel")}
          />
        </div>
        <div className="mt-3">
          <LegalPositionNote position={DISPUTED_AMOUNT_RULE} />
        </div>
      </section>

      <section className="u-hero animate-fade-up px-5 py-6">
        <div className="relative z-[1]">
          <p className="type-display text-[1.25rem] text-[var(--ink)]">
            {t("ctaTitle")}
          </p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">
            {t("ctaBody")}
          </p>
          <Link
            href="/start"
            className="u-btn u-btn-primary mt-4 flex min-h-[52px] w-full text-base font-semibold"
          >
            {t("startCta")}
          </Link>
          <Link
            href="/"
            className="u-btn u-btn-ghost mt-2.5 flex min-h-[44px] w-full text-sm font-medium"
          >
            {t("backHome")}
          </Link>
        </div>
      </section>
    </div>
  );
}
