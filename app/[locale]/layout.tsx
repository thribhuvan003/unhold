import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Noto_Sans_Devanagari,
  Red_Hat_Mono,
  Schibsted_Grotesk,
} from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { brand } from "@/lib/ui/tokens";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://www.unhold.live";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const redHatMono = Red_Hat_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

// Hindi/Devanagari glyphs — the Latin display/body fonts don't contain them, so
// without this any Hindi text renders as tofu boxes. Added as a font-family
// fallback so it kicks in per-glyph.
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  weight: ["400", "600", "700"],
  display: "swap",
});

const defaultTitle =
  "Unhold — organise a bank-account freeze case, step by step";
const defaultDescription =
  "Unhold helps people in India organise bank-account restriction facts, evidence and review-before-send letter drafts. No account required. Not a law firm; no outcome guarantee.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | Unhold",
  },
  description: defaultDescription,
  applicationName: brand.publicName,
  keywords: [
    "Unhold",
    "unhold.live",
    "bank account frozen",
    "account freeze India",
    "unfreeze bank account",
    "cyber freeze",
    "UPI freeze",
    "bank restriction guidance India",
    "I4C",
    "NCRP",
    "bank freeze letter",
    "1930 helpline",
    "खाता फ्रीज",
    "बैंक प्रतिबंध सहायता",
  ],
  authors: [{ name: "Unhold" }],
  creator: "Unhold",
  publisher: "Unhold",
  category: "finance",
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      en: siteUrl,
      hi: `${siteUrl}/hi`,
      "x-default": siteUrl,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    alternateLocale: ["hi_IN"],
    url: siteUrl,
    siteName: brand.publicName,
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add Google Search Console token here when available:
    // google: 'YOUR_GSC_TOKEN',
  },
};

/** Explicit mobile/desktop viewport — works on phones, tablets, desktop browsers. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1419" },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations("Footer");

  return (
    <html
      lang={locale}
      className={`${bricolage.variable} ${schibsted.variable} ${redHatMono.variable} ${notoDevanagari.variable}`}
    >
      <body className="u-paper-grain flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider>
          <SiteHeader />
          <main
            id="main-content"
            tabIndex={-1}
            className="u-main-skip-target mx-auto w-full max-w-5xl flex-1 px-4 py-9 pb-20 sm:px-5 sm:py-11 sm:pb-11"
          >
            {children}
          </main>
          <BottomTabBar />
          <footer className="border-t border-border bg-surface pt-9 pb-28 sm:py-9">
            <div className="mx-auto max-w-5xl px-4 text-center sm:px-5">
              <p className="mb-2 flex items-center justify-center gap-2 text-[0.78125rem] font-semibold">
                <Link
                  href="/legal/disclaimer"
                  className="text-[var(--color-sky-deep)] underline underline-offset-4 no-underline hover:underline"
                >
                  {t("legalDisclaimer")}
                </Link>
                <span aria-hidden="true" className="text-ink-faint">
                  ·
                </span>
                <Link
                  href="/legal/privacy"
                  className="text-[var(--color-sky-deep)] underline underline-offset-4 no-underline hover:underline"
                >
                  {t("privacyPolicy")}
                </Link>
              </p>
              <p className="type-caption">
                {t("notLawFirm")}{" "}
                <a
                  href="tel:1930"
                  className="type-mono-data font-medium text-sky-deep no-underline hover:underline"
                >
                  1930
                </a>
              </p>
              <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-faint">
                {t("builtFor")}
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
