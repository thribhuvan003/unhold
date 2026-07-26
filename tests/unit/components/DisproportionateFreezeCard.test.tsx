/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { DisproportionateFreezeCard } from '@/components/case/DisproportionateFreezeCard';
import enMessages from '@/messages/en.json';

const withIntl = (node: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={enMessages}>
    {node}
  </NextIntlClientProvider>
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DisproportionateFreezeCard', () => {
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
  });

  it('asks for written hold details with the amount for a total freeze', () => {
    act(() => {
      root.render(
        withIntl(<DisproportionateFreezeCard freezeType="total_freeze" frozenAmountInr="15,000" />),
      );
    });

    expect(container.textContent).toContain('a total freeze');
    expect(container.textContent).toContain('Unhold cannot tell you whether this restriction is lawful');
    expect(container.textContent).toContain('whether the amount currently held is approximately ₹15,000');
    const links = Array.from(container.querySelectorAll('a')) as HTMLAnchorElement[];
    const knowYourRights = links.find((a) => a.getAttribute('href') === '/guides/sop-2026');
    expect(knowYourRights?.textContent).toContain('official-process guide');
  });

  it('does not present a legal conclusion or external legal-source links', () => {
    act(() => {
      root.render(
        withIntl(<DisproportionateFreezeCard freezeType="total_freeze" frozenAmountInr="15,000" />),
      );
    });

    expect(container.textContent).not.toContain('Current law');
    expect(container.textContent).not.toContain('under Supreme Court appeal');
    const sourceLinks = Array.from(container.querySelectorAll('a')).filter((a) =>
      (a.getAttribute('href') ?? '').startsWith('http'),
    );
    expect(sourceLinks).toHaveLength(0);
  });

  it('renders for a debit freeze without an amount', () => {
    act(() => {
      root.render(withIntl(<DisproportionateFreezeCard freezeType="debit_freeze" frozenAmountInr={null} />));
    });

    expect(container.textContent).toContain('a debit freeze');
    expect(container.textContent).toContain('the exact amount currently held');
    expect(container.textContent).not.toContain('approx.');
  });

  it('renders null for a partial lien', () => {
    act(() => {
      root.render(
        withIntl(<DisproportionateFreezeCard freezeType="partial_lien" frozenAmountInr="15,000" />),
      );
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders null when the freeze type is unknown', () => {
    act(() => {
      root.render(withIntl(<DisproportionateFreezeCard freezeType={null} frozenAmountInr={null} />));
    });

    expect(container.firstChild).toBeNull();
  });
});
