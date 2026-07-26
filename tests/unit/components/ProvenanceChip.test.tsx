/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProvenanceChip } from '@/components/ui/ProvenanceChip';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ProvenanceChip', () => {
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

  it('shows the verified date and a safe new-tab source link', () => {
    act(() => {
      root.render(
        <ProvenanceChip
          verifiedDate="2026-07-02"
          sourceUrl="https://sbi.bank.in/contact"
          sourceLabel="SBI official page"
        />,
      );
    });

    expect(container.textContent).toContain('Verified 2026-07-02');
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://sbi.bank.in/contact');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.textContent).toContain('SBI official page');
  });

  it('degrades to date-only when no source is given (no dead link)', () => {
    act(() => {
      root.render(<ProvenanceChip verifiedDate="2026-07-02" />);
    });

    expect(container.textContent).toContain('Verified 2026-07-02');
    expect(container.querySelector('a')).toBeNull();
  });
});
