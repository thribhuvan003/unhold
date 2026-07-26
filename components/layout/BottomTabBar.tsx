'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { FolderOpen, HelpCircle, Home } from 'lucide-react';

const TABS = [
  {
    href: '/',
    key: 'home',
    Icon: Home,
    match: (path: string) => path === '/' || path.startsWith('/guides'),
  },
  {
    href: '/my-case',
    key: 'myCase',
    Icon: FolderOpen,
    match: (path: string) =>
      path.startsWith('/cases') ||
      path.startsWith('/start') ||
      path.startsWith('/my-case') ||
      path.startsWith('/guest'),
  },
  {
    href: '/help',
    key: 'help',
    Icon: HelpCircle,
    match: (path: string) => path.startsWith('/help'),
  },
] as const;

const ACTIVE_COLOR = 'var(--color-sky-deep)';
const INACTIVE_COLOR = '#9aa1a9';

export function BottomTabBar() {
  const pathname = usePathname() ?? '';
  const t = useTranslations('BottomNav');

  return (
    <nav
      aria-label="Main"
      className="flex sm:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: '#fff',
        borderTop: '1px solid rgba(20,30,40,.08)',
        padding: '9px 20px 22px',
        boxShadow: '0 -2px 14px rgba(20,30,40,.05)',
      }}
    >
      {TABS.map(({ href, key, Icon, match }) => {
        const active = match(pathname);
        const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color,
              textDecoration: 'none',
              minHeight: 44,
            }}
          >
            <Icon width={23} height={23} strokeWidth={active ? 2 : 1.65} aria-hidden="true" />
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                lineHeight: 1,
                color,
              }}
            >
              {t(key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
