import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StatCard } from "@/components/metrics/StatCard";
import { getPublicStats, type PublicStats } from "@/lib/metrics/public-stats";

type Props = { params: Promise<{ locale: string }> };

// Always render fresh so the counts are live (and never cache a build-time
// empty state). The page issues four cheap COUNT queries — negligible load.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ImpactPage" });
  return { title: t("title"), description: t("intro") };
}

export default async function ImpactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ImpactPage");

  let stats: PublicStats | null = null;
  try {
    stats = await getPublicStats();
  } catch {
    stats = null;
  }

  const fmt = (n: number) => n.toLocaleString("en-IN");

  return (
    <div className="mx-auto flex max-w-[430px] flex-col gap-4 lg:max-w-3xl">
      <div className="animate-fade-up">
        <p className="type-eyebrow">{t("eyebrow")}</p>
        <h1 className="type-display-xl mt-1.5 text-[1.75rem] leading-tight">
          {t("title")}
        </h1>
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">
          {t("intro")}
        </p>
      </div>

      {!stats || stats.casesStarted === 0 ? (
        <section className="u-card animate-fade-up p-5">
          <p className="type-display text-[1.05rem]">{t("emptyTitle")}</p>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--ink-muted)]">
            {t("emptyBody")}
          </p>
          <Link
            href="/start"
            className="u-btn u-btn-primary mt-4 flex min-h-[48px] w-full text-base font-semibold"
          >
            {t("startCta")}
          </Link>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3">
            <StatCard label={t("usersLabel")} value={fmt(stats.users)} />
            <StatCard label={t("casesLabel")} value={fmt(stats.casesStarted)} />
            <StatCard
              label={t("lettersGeneratedLabel")}
              value={fmt(stats.lettersGenerated)}
            />
            <StatCard
              label={t("lettersSentLabel")}
              value={fmt(stats.lettersSent)}
            />
            <StatCard
              label={t("unfrozenLabel")}
              value={fmt(stats.unfrozenReported)}
              sub={t("unfrozenNote")}
            />
          </section>
          <p className="type-caption text-[var(--ink-faint)]">
            {t("updatedPrefix")}{" "}
            {new Date(stats.generatedAt).toLocaleString("en-IN")}
          </p>
          <Link
            href="/start"
            className="u-btn u-btn-primary mt-1 flex min-h-[48px] w-full text-base font-semibold lg:w-auto lg:self-start lg:px-6"
          >
            {t("startCta")}
          </Link>
        </>
      )}

      <p className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--ink-faint)]">
        {t("disclaimer")}
      </p>
    </div>
  );
}
