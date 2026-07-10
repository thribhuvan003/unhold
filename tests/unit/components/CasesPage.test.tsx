/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import CasesPage from '@/app/[locale]/cases/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// CasesPage uses next-intl's locale-aware Link; mock it to a plain anchor so the
// client-navigation module isn't loaded in the test environment.
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
  }) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('CasesPage (pipeline dashboard)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    act(() => {
      root = createRoot(container);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows a friendly status label, doc readiness, and an action-needed quick action', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          cases: [
            {
              id: 'case-1',
              public_id: 'LL-10001',
              status: 'evidence_building',
              user_action_required: true,
              evidence_count: 1,
            },
          ],
        }),
      })),
    );

    await act(async () => {
      root.render(<CasesPage />);
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });

    expect(container.textContent).toContain('Gathering evidence');
    expect(container.textContent).toContain('1 document uploaded');
    expect(container.textContent).toContain('more evidence will help your case');
    expect(container.textContent).toContain('Action needed');
    expect(container.textContent).toContain('Take action');
  });
});
