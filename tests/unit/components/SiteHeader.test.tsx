/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { brand } from '@/lib/ui/tokens';

const mockPathname = vi.fn(() => '/');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('SiteHeader', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/');
  });

  it('marks brand active on home route', () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    expect(html).toContain('u-nav-brand-active');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(`aria-label="${brand.publicName}"`);
  });

  it('emphasizes report CTA when on home', () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    expect(html).toContain('u-nav-link-cta');
    expect(html).not.toMatch(/u-nav-link-active[^"]*"[^>]*>Report/);
  });

  it('marks guest nav active on guest routes', () => {
    mockPathname.mockReturnValue('/guest/report');
    const html = renderToStaticMarkup(<SiteHeader />);
    expect(html).toContain('u-nav-link-active');
    expect(html).toContain('Report freeze');
    expect(html).not.toContain('u-nav-brand-active');
    expect(html).not.toContain('u-nav-link-cta');
  });

  it('marks cases nav active on cases routes', () => {
    mockPathname.mockReturnValue('/cases/abc-123');
    const html = renderToStaticMarkup(<SiteHeader />);
    expect(html).toContain('u-nav-link-active');
    expect(html).toContain('My cases');
    expect(html).not.toContain('u-nav-brand-active');
  });

  it('includes responsive short labels and landmarks', () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    expect(html).toContain('u-skip-link');
    expect(html).toContain('Skip to content');
    expect(html).toContain('aria-label="Main"');
    expect(html).toContain('min-[380px]:hidden');
    expect(html).toContain('Report');
    expect(html).toContain('Cases');
  });
});