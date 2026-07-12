/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { LegalPositionNote } from '@/components/legal/LegalPositionNote';
import { DISPUTED_AMOUNT_RULE, BLANKET_FREEZE_RULINGS } from '@/lib/legal/positions';
import enMessages from '@/messages/en.json';
import hiMessages from '@/messages/hi.json';

const withIntl = (node: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={enMessages}>
    {node}
  </NextIntlClientProvider>
);

const withHiIntl = (node: React.ReactNode) => (
  <NextIntlClientProvider locale="hi" messages={hiMessages}>
    {node}
  </NextIntlClientProvider>
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LegalPositionNote', () => {
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

  it('renders a cautionary position with its source and a legal-confirmation badge', () => {
    act(() => {
      root.render(withIntl(<LegalPositionNote position={DISPUTED_AMOUNT_RULE} />));
    });

    expect(container.textContent).toContain(DISPUTED_AMOUNT_RULE.claim);
    expect(container.textContent).toContain('Needs legal confirmation');
    expect(container.textContent).not.toContain('Current law');
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(DISPUTED_AMOUNT_RULE.sourceUrl);
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('flags a contested position as under Supreme Court appeal (never "settled")', () => {
    act(() => {
      root.render(withIntl(<LegalPositionNote position={BLANKET_FREEZE_RULINGS} />));
    });

    expect(container.textContent).toContain('under Supreme Court appeal');
    expect(container.textContent).not.toContain('Current law');
    // The honest note about the appeal is shown.
    expect(container.textContent).toContain('recent High Court holdings');
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(BLANKET_FREEZE_RULINGS.sourceUrl);
  });

  it('under hi renders the Hindi claim as primary with the English claim still quotable', () => {
    act(() => {
      root.render(withHiIntl(<LegalPositionNote position={DISPUTED_AMOUNT_RULE} />));
    });

    expect(container.textContent).toContain(DISPUTED_AMOUNT_RULE.claimHi as string);
    // English is the citable ammunition — it must stay visible.
    expect(container.textContent).toContain(DISPUTED_AMOUNT_RULE.claim);
    expect(container.textContent).toContain(DISPUTED_AMOUNT_RULE.noteHi as string);
    // Source link is unchanged.
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(DISPUTED_AMOUNT_RULE.sourceUrl);
  });

  it('under hi keeps the contested framing honest (Supreme Court appeal preserved)', () => {
    act(() => {
      root.render(withHiIntl(<LegalPositionNote position={BLANKET_FREEZE_RULINGS} />));
    });

    expect(container.textContent).toContain(BLANKET_FREEZE_RULINGS.claimHi as string);
    // The Hindi note must still say the matter is under Supreme Court appeal.
    expect(container.textContent).toContain('Supreme Court में अपील के अधीन');
    expect(container.textContent).toContain('तय कानून के तौर पर नहीं');
    expect(container.textContent).toContain(BLANKET_FREEZE_RULINGS.claim);
  });
});
