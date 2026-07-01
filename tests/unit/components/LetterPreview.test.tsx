/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LetterPreview } from '@/components/letters/LetterPreview';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LetterPreview', () => {
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

  it('copies approved draft text in email-ready format', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    });

    act(() => {
      root.render(
        <LetterPreview
          subject="Request for lien review"
          body={'To,\nThe Branch Manager\n\nPlease review the lien.'}
          level="L1"
          placeholdersMissing={[]}
          approved
        />,
      );
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    await act(async () => {
      button.click();
    });

    expect(writeText).toHaveBeenCalledWith(
      'Subject: Request for lien review\n\nTo,\nThe Branch Manager\n\nPlease review the lien.',
    );
    expect(container.textContent).toContain('Copied');
  });

  it('keeps copy disabled until the draft is approved and complete', () => {
    act(() => {
      root.render(
        <LetterPreview
          subject="Request for lien review"
          body="Please review the lien."
          level="L1"
          placeholdersMissing={['ACCOUNT_LAST4']}
        />,
      );
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.textContent).toContain('Fill these before sending');
    expect(container.textContent).toContain('ACCOUNT_LAST4');
  });
});
