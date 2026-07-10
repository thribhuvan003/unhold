import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { JsonLd } from '@/components/seo/JsonLd';

type Props = { params: Promise<{ locale: string }> };

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://www.unhold.live';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isHi = locale === 'hi';
  const title = isHi
    ? 'Unhold — बैंक खाता फ्रीज? पैकेज बनाएं और अनफ्रीज़ रास्ता देखें'
    : 'Unhold — bank account frozen? Build your freeze package & unfreeze path';
  const description = isHi
    ? 'साइबर शिकायत या UPI क्रेडिट के बाद खाता फ्रीज? Unhold कागजात, सील्ड प्रूफ पैक और पत्र तैयार करता है। मुफ़्त — आप खुद भेजते हैं। हेल्पलाइन 1930।'
    : 'Bank account frozen after a cyber complaint or UPI credit? Unhold prepares papers, a sealed proof pack, and letters. Free — you send everything. Helpline 1930.';
  const path = isHi ? '/hi' : '/';
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `${siteUrl}${path === '/' ? '' : path}`,
      languages: {
        en: siteUrl,
        hi: `${siteUrl}/hi`,
        'x-default': siteUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${path === '/' ? '' : path}`,
      locale: isHi ? 'hi_IN' : 'en_IN',
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('HomePage');
  const steps = t.raw('steps') as { title: string; desc: string }[];
  const stories = t.raw('stories') as { who: string; line: string }[];
  const otherLocale = locale === 'hi' ? 'en' : 'hi';
  const isHi = locale === 'hi';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Unhold',
      alternateName: ['unhold.live', 'Unhold bank freeze'],
      url: siteUrl,
      inLanguage: ['en-IN', 'hi-IN'],
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/start`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Unhold',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      url: siteUrl,
      description:
        'Free tool to prepare an Indian bank-account freeze grievance package: papers, sealed proof pack, and letters you send yourself.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: isHi ? 'बैंक अकाउंट फ्रीज होने पर क्या करें?' : 'What should I do if my bank account is frozen?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: isHi
              ? '1930 पर कॉल करें, फ्रीज SMS/स्टेटमेंट/PAN इकट्ठा करें, और Unhold से शिकायत पत्र + प्रूफ पैक तैयार करें। अनफ्रीज़ बैंक/पुलिस तय करती है — हम कुछ नहीं भेजते।'
              : 'Call 1930, gather freeze SMS/statement/PAN, and use Unhold to prepare your grievance letter and proof pack. Only the bank or police can unfreeze — we never send on your behalf.',
          },
        },
        {
          '@type': 'Question',
          name: isHi ? 'Unhold क्या है?' : 'What is Unhold?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: isHi
              ? 'Unhold (unhold.live) भारत में बैंक खाता फ्रीज के लिए मुफ़्त पैकेज टूल है — पत्र, प्रूफ पैक, डेडलाइन। आप खुद भेजते हैं।'
              : 'Unhold (unhold.live) is a free package tool for Indian bank freezes — letters, proof pack, deadlines. You send everything yourself.',
          },
        },
        {
          '@type': 'Question',
          name: isHi
            ? 'क्या पूरा खाता फ्रीज कानूनी है?'
            : 'Can the whole account stay frozen for a small disputed amount?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: isHi
              ? '2026 MHA/I4C SOP के अनुसार लियन आमतौर पर विवादित रकम पर होना चाहिए। गाइड देखें: /guides/sop-2026'
              : 'Under the 2026 MHA/I4C SOP framing, the lien should generally track the disputed amount. See our plain guide at /guides/sop-2026.',
          },
        },
      ],
    },
  ];

  return (
    <div className="mx-auto flex max-w-[430px] flex-col gap-4">
      <JsonLd data={jsonLd} />
      <section className="u-hero animate-fade-up px-5 py-6">
        <div className="relative z-[1]">
          <p className="type-eyebrow">{t('eyebrow')}</p>
          <h1 className="type-display-xl mt-2.5 text-[1.8125rem] leading-[1.06]">{t('title')}</h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">
            {t.rich('intro', {
              strong: (chunks) => <strong className="text-[var(--ink)]">{chunks}</strong>,
            })}
          </p>
          <Link
            href="/start"
            className="u-btn u-btn-primary mt-4 flex min-h-[52px] w-full text-base font-semibold"
          >
            {t('startCta')}
          </Link>
          <Link
            href="/my-case"
            className="u-btn u-btn-ghost mt-2.5 flex min-h-[44px] w-full text-sm font-medium"
          >
            {t('openCaseCta')}
          </Link>
          <Link
            href="/open-case"
            className="mt-2 block min-h-[40px] text-center text-[0.8125rem] font-semibold text-[var(--ink-muted)] no-underline"
          >
            {t('recoverCta')}
          </Link>
          <Link
            href="/"
            locale={otherLocale}
            lang={otherLocale}
            className="mt-3 block min-h-[44px] text-center text-sm font-semibold text-[var(--color-sky-deep)] no-underline"
          >
            {t('otherLangCta')}
          </Link>
        </div>
      </section>

      {/* The one loud block on the page: a reviewer/judge/curious visitor has no
          case or papers — this is the only thing they can click. Solid brand blue
          so it can't be scrolled past, placed in the first viewport. */}
      <Link
        href="/demo"
        className="animate-fade-up stagger-1 flex w-full items-center gap-3.5 rounded-[var(--radius-lg)] bg-[var(--color-sky-deep)] px-4 py-4 text-left no-underline shadow-[0_10px_28px_-12px_rgba(19,78,140,0.55)]"
      >
        <span
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/15 text-base text-white"
          aria-hidden="true"
        >
          ▶
        </span>
        <span className="flex-1">
          <span className="block text-[0.9375rem] font-bold text-white">{t('demoTitle')}</span>
          <span className="mt-0.5 block text-[0.8125rem] leading-normal text-white/80">
            {t('demoDesc')}
          </span>
        </span>
        <span className="flex-none text-lg text-white/90" aria-hidden="true">
          →
        </span>
      </Link>

      <section className="u-card animate-fade-up stagger-1 px-4 py-4">
        <p className="type-eyebrow">{t('howItWorksLabel')}</p>
        <div className="mt-3 flex flex-col gap-2.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[var(--color-sky-mist)] text-[0.8125rem] font-bold text-[var(--color-sky-deep)]">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">{step.title}</p>
                <p className="mt-px text-[0.78125rem] leading-normal text-[var(--ink-faint)]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="u-card animate-fade-up stagger-1 px-4 py-4">
        <p className="type-eyebrow">{t('storiesLabel')}</p>
        <div className="mt-3 flex flex-col gap-2.5">
          {stories.map((s) => (
            <div
              key={s.who}
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            >
              <p className="text-[0.8125rem] font-bold text-[var(--ink)]">{s.who}</p>
              <p className="mt-1 text-[0.78125rem] leading-relaxed text-[var(--ink-muted)]">{s.line}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[0.6875rem] leading-relaxed text-[var(--ink-faint)]">{t('storiesFoot')}</p>
      </section>

      <section className="animate-fade-up stagger-2 rounded-[var(--radius-lg)] border border-[var(--saffron)]/35 bg-[var(--warn-muted)] px-4 py-3.5">
        <p className="text-[0.8125rem] leading-relaxed text-[var(--ink)]">
          {t.rich('goodToKnow', {
            strong: (chunks) => <strong>{chunks}</strong>,
            helpline: (chunks) => (
              <a href="tel:1930" className="font-bold text-[var(--color-sky-deep)] no-underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>

      {/* The law is our edge, but it's a "learn more", not a competing action —
          a one-line link, not a full card. */}
      <Link
        href="/guides/sop-2026"
        className="animate-fade-up stagger-3 block px-1 text-[0.8125rem] font-semibold text-[var(--color-sky-deep)] no-underline"
      >
        {t('rightsLink')}
      </Link>
    </div>
  );
}
