/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { SendByEmailCard } from '@/components/letters/SendByEmailCard';
import enMessages from '@/messages/en.json';

const withIntl = (node: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={enMessages}>
    {node}
  </NextIntlClientProvider>
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SBI_GENERAL_EMAIL = 'customercare@sbi.co.in';

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('SendByEmailCard', () => {
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

  it('defaults To: to the bank general inbox and fills the mailto link', () => {
    act(() => {
      root.render(
        withIntl(<SendByEmailCard
          subject="Request for lien review"
          body="Please review the lien."
          bankName="State Bank of India (SBI)"
          canExport
          initialEmail={SBI_GENERAL_EMAIL}
          verifiedDate="2026-07-05"
        />),
      );
    });

    expect(container.textContent).toContain(SBI_GENERAL_EMAIL);
    const mailto = container.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(mailto.getAttribute('href')).toContain(`mailto:${SBI_GENERAL_EMAIL}`);
    expect(mailto.getAttribute('href')).toContain(encodeURIComponent('Request for lien review'));
  });

  it('uses the branch email the user enters (from their passbook) over the general inbox', () => {
    act(() => {
      root.render(
        withIntl(<SendByEmailCard
          subject="Sub"
          body="Body"
          bankName="State Bank of India (SBI)"
          canExport
          initialEmail={SBI_GENERAL_EMAIL}
        />),
      );
    });

    const branchInput = container.querySelector('input[aria-label="Your branch email"]') as HTMLInputElement;
    act(() => {
      setInputValue(branchInput, 'sbi.01234@sbi.co.in');
    });

    const mailto = container.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(mailto.getAttribute('href')).toContain('mailto:sbi.01234@sbi.co.in');
    expect(container.textContent).toContain('your branch');
  });

  it('opens Gmail with the recipient pre-filled in the to: field', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);

    act(() => {
      root.render(
        withIntl(<SendByEmailCard
          subject="Request for lien review"
          body="Please review the lien."
          bankName="State Bank of India (SBI)"
          canExport
          initialEmail={SBI_GENERAL_EMAIL}
        />),
      );
    });

    const gmailButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Open in Gmail'),
    ) as HTMLButtonElement;
    await act(async () => {
      gmailButton.click();
    });

    expect(open).toHaveBeenCalledTimes(1);
    const url = open.mock.calls[0][0] as string;
    expect(url).toContain('https://mail.google.com/mail/');
    expect(url).toContain(`to=${encodeURIComponent(SBI_GENERAL_EMAIL)}`);
  });

  it('copies the letter text in email-ready format', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    act(() => {
      root.render(
        withIntl(<SendByEmailCard
          subject="Request for lien review"
          body={'To,\nThe Branch Manager\n\nPlease review the lien.'}
          bankName="State Bank of India (SBI)"
          canExport
          initialEmail={SBI_GENERAL_EMAIL}
        />),
      );
    });

    const copyButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.toLowerCase().includes('copy the letter text'),
    ) as HTMLButtonElement;
    await act(async () => {
      copyButton.click();
    });

    expect(writeText).toHaveBeenCalledWith(
      'Subject: Request for lien review\n\nTo,\nThe Branch Manager\n\nPlease review the lien.',
    );
    expect(container.textContent).toContain('✓ Copied — paste it anywhere');
  });

  it('with no email at all: no dead mailto, copy is primary, branch-email guidance shown', () => {
    act(() => {
      root.render(
        withIntl(<SendByEmailCard
          subject="Sub"
          body="Body"
          bankName="HDFC Bank"
          canExport
          portal="https://www.hdfc.bank.in/contact-us/email-id-for-nodal-officers"
        />),
      );
    });

    // No verified email → no mailto button, and the branch-email path is offered.
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.textContent).toContain('branch');
    const portalLink = container.querySelector('a[target="_blank"]') as HTMLAnchorElement;
    expect(portalLink.href).toContain('hdfc.bank.in');
    const copyButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.toLowerCase().includes('copy the letter text'),
    );
    expect(copyButton).toBeTruthy();
  });
});
