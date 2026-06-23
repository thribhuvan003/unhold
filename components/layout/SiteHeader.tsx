'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { brand } from '@/lib/ui/tokens';
import { cn } from '@/lib/ui/cn';

const navLinks = [
  {
    href: '/guest/report',
    label: 'Report freeze',
    shortLabel: 'Report',
    emphasis: true,
    match: (path: string) => path.startsWith('/guest'),
  },
  {
    href: '/cases',
    label: 'My cases',
    shortLabel: 'Cases',
    emphasis: false,
    match: (path: string) => path.startsWith('/cases'),
  },
] as const;

export function SiteHeader() {
  const pathname = usePathname() ?? '';
  const [scrolled, setScrolled] = useState(false);
  const onHome = pathname === '/';

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn('u-site-header transition-shadow duration-[220ms] ease-[var(--ease-out-expo)]', scrolled && 'u-site-header-scrolled')}
    >
      <a href="#main-content" className="u-skip-link">
        Skip to content
      </a>

      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-5">
        <Link
          href="/"
          aria-label={brand.publicName}
          className={cn('u-nav-brand group shrink-0', onHome && 'u-nav-brand-active')}
          aria-current={onHome ? 'page' : undefined}
        >
          <span className="u-nav-mark" aria-hidden="true">
            U
          </span>
          <span className="u-nav-brand-text font-display text-[1.0625rem] font-bold tracking-[-0.02em] text-white">
            {brand.publicName}
          </span>
        </Link>

        <nav aria-label="Main" className="u-nav-bar">
          {navLinks.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'u-nav-link',
                  link.emphasis && !active && 'u-nav-link-cta',
                  active && 'u-nav-link-active',
                )}
              >
                <span className="hidden min-[380px]:inline">{link.label}</span>
                <span className="min-[380px]:hidden">{link.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}