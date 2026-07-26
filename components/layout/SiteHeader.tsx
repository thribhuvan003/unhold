"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { brand } from "@/lib/ui/tokens";
import { cn } from "@/lib/ui/cn";

const navLinks = [
  {
    href: "/start",
    key: "report",
    shortKey: "reportShort",
    emphasis: true,
    match: (path: string) =>
      path.startsWith("/guest") || path.startsWith("/start"),
  },
  {
    href: "/cases",
    key: "cases",
    shortKey: "casesShort",
    emphasis: false,
    match: (path: string) => path.startsWith("/cases"),
  },
] as const;

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const locale = useLocale();
  const t = useTranslations("SiteHeader");
  const [scrolled, setScrolled] = useState(false);
  const onHome = pathname === "/";
  const otherLocale = locale === "hi" ? "en" : "hi";

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "u-site-header transition-shadow duration-[220ms] ease-[var(--ease-out-expo)]",
        scrolled && "u-site-header-scrolled",
      )}
    >
      <a href="#main-content" className="u-skip-link">
        {t("skipToContent")}
      </a>

      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-5">
        <Link
          href="/"
          aria-label={brand.publicName}
          className={cn(
            "u-nav-brand group shrink-0",
            onHome && "u-nav-brand-active",
          )}
          aria-current={onHome ? "page" : undefined}
        >
          <span className="u-nav-mark" aria-hidden="true">
            U
          </span>
          <span className="u-nav-brand-text font-display text-[1.0625rem] font-bold tracking-[-0.02em] text-white">
            {brand.publicName}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language toggle — keeps the current page, flips en <-> hi. */}
          <Link
            href={pathname}
            locale={otherLocale}
            lang={otherLocale}
            aria-label={t("switchLanguage")}
            className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.8125rem] font-bold text-white no-underline"
          >
            {t("languageName")}
          </Link>

          {/* Mobile: the bottom tab bar owns navigation — the header shows the
              1930 cyber-helpline call pill instead (per the mobile design). */}
          <a
            href="tel:1930"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.8125rem] font-bold text-white no-underline sm:hidden"
            aria-label={t("callHelpline")}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .7-.2 1l-2.3 2.2z"
                fill="#9fd0f4"
              />
            </svg>
            1930
          </a>

          <nav aria-label="Main" className="u-nav-bar max-sm:hidden">
            {navLinks.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "u-nav-link",
                    link.emphasis && !active && "u-nav-link-cta",
                    active && "u-nav-link-active",
                  )}
                >
                  <span className="hidden min-[380px]:inline">
                    {t(`nav.${link.key}`)}
                  </span>
                  <span className="min-[380px]:hidden">
                    {t(`nav.${link.shortKey}`)}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
