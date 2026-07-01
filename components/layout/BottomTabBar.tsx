'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, Home, FileText } from 'lucide-react';

const TABS = [
  {
    href: '/',
    label: 'Home',
    Icon: Home,
    match: (path: string) => path === '/',
  },
  {
    href: '/guest/report',
    label: 'Report',
    Icon: FileText,
    match: (path: string) => path.startsWith('/guest') || path.startsWith('/cases/new'),
  },
  {
    href: '/cases',
    label: 'Cases',
    Icon: FolderOpen,
    match: (path: string) => path.startsWith('/cases') && !path.startsWith('/cases/new'),
  },
] as const;

const ACTIVE_COLOR = '#3684c8';
const INACTIVE_COLOR = '#9aa1a9';

export function BottomTabBar() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      aria-label="Main"
      className="sm:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        background: '#fff',
        borderTop: '1px solid rgba(20,30,40,.08)',
        padding: '9px 20px 22px',
        boxShadow: '0 -2px 14px rgba(20,30,40,.05)',
      }}
    >
      {TABS.map(({ href, label, Icon, match }) => {
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
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
