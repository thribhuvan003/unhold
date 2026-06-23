/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GuidedIntakeForm, type GuidedIntakeResult } from '@/components/intake/GuidedIntakeForm';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('GuidedIntakeForm', () => {
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

  it('walks through all steps and reports a complete intake_json + victim role on disclaimer accept', async () => {
    const onComplete = vi.fn<(result: GuidedIntakeResult) => void>();

    act(() => {
      root.render(<GuidedIntakeForm onComplete={onComplete} submitting={false} />);
    });

    // Step 0: narration
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    act(() => {
      setInputValue(textarea, "Money I didn't expect landed in my account and SBI froze it.");
    });
    clickNext();

    // Step 1: role — receiver
    const receiverRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find(
      (el) => el.closest('label')?.textContent?.includes("didn't expect"),
    ) as HTMLInputElement;
    act(() => {
      receiverRadio.click();
    });
    clickNext();

    // Step 2: recognizes funds — no (admits_unknown_funds = true)
    const noRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find((el) =>
      el.closest('label')?.textContent?.includes("isn't familiar"),
    ) as HTMLInputElement;
    act(() => {
      noRadio.click();
    });
    clickNext();

    // Step 3: amount
    const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    act(() => {
      setInputValue(amountInput, '25000');
    });
    clickNext();

    // Step 4: NCRP id (valid 14-digit)
    const ncrpInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    act(() => {
      setInputValue(ncrpInput, '12345678901234');
    });

    // Final step button opens the disclaimer modal
    const reviewButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Review & start my case'),
    ) as HTMLButtonElement;
    act(() => {
      reviewButton.click();
    });

    expect(container.textContent).toContain('Before you continue');

    const requiredCheckbox = document.getElementById('intake-disclaimer-accept') as HTMLInputElement;
    act(() => {
      requiredCheckbox.click();
    });

    const continueButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Continue',
    ) as HTMLButtonElement;
    await act(async () => {
      continueButton.click();
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];
    expect(result.victimRole).toBe('innocent_receiver');
    expect(result.frozenAmountPaise).toBe(2_500_000);
    expect(result.aiConsentAccepted).toBe(false);
    expect(result.intakeJson).toMatchObject({
      source: 'guided_intake',
      narration: "Money I didn't expect landed in my account and SBI froze it.",
      user_role: 'receiver',
      admits_unknown_funds: true,
      amount_inr: 25000,
      ncrp_id: '12345678901234',
    });
  });

  function clickNext() {
    const nextButton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Next') as HTMLButtonElement;
    act(() => {
      nextButton.click();
    });
  }
});
