/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { brand } from "@/lib/ui/tokens";
import enMessages from "@/messages/en.json";

const mockPathname = vi.fn(() => "/");

// SiteHeader navigates via next-intl's locale-aware wrappers; mock them so the
// test controls the (locale-stripped) pathname and Link renders a plain anchor.
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mockPathname(),
  Link: ({
    href,
    locale: _locale,
    children,
    ...props
  }: {
    href: string;
    locale?: string;
    children?: React.ReactNode;
  }) => {
    void _locale;
    return (
      <a href={typeof href === "string" ? href : "#"} {...props}>
        {children}
      </a>
    );
  },
}));

function render(node: React.ReactNode) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("SiteHeader", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  it("marks brand active on home route", () => {
    const html = render(<SiteHeader />);
    expect(html).toContain("u-nav-brand-active");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(`aria-label="${brand.publicName}"`);
  });

  it("emphasizes report CTA when on home", () => {
    const html = render(<SiteHeader />);
    expect(html).toContain("u-nav-link-cta");
    expect(html).not.toMatch(/u-nav-link-active[^"]*"[^>]*>Report/);
  });

  it("marks guest nav active on guest routes", () => {
    mockPathname.mockReturnValue("/guest/report");
    const html = render(<SiteHeader />);
    expect(html).toContain("u-nav-link-active");
    expect(html).toContain("Report freeze");
    expect(html).not.toContain("u-nav-brand-active");
    expect(html).not.toContain("u-nav-link-cta");
  });

  it("marks cases nav active on cases routes", () => {
    mockPathname.mockReturnValue("/cases/abc-123");
    const html = render(<SiteHeader />);
    expect(html).toContain("u-nav-link-active");
    expect(html).toContain("My cases");
    expect(html).not.toContain("u-nav-brand-active");
  });

  it("includes responsive short labels and landmarks", () => {
    const html = render(<SiteHeader />);
    expect(html).toContain("u-skip-link");
    expect(html).toContain("Skip to content");
    expect(html).toContain('aria-label="Main"');
    expect(html).toContain("min-[380px]:hidden");
    expect(html).toContain("Report");
    expect(html).toContain("Cases");
  });
});
