/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { IntakeWizard, type IntakeWizardResult } from '@/components/intake/IntakeWizard';
import { ConsentScreen } from '@/components/legal/ConsentScreen';
import enMessages from '@/messages/en.json';

function withIntl(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {node}
    </NextIntlClientProvider>
  );
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('IntakeWizard', () => {
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

  function clickNext() {
    const nextButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.startsWith('Next'),
    ) as HTMLButtonElement;
    act(() => {
      nextButton.click();
    });
  }

  it('walks through all 5 questions and reports a complete intake_json + victim role', () => {
    const onComplete = vi.fn<(result: IntakeWizardResult) => void>();

    act(() => {
      root.render(withIntl(<IntakeWizard onComplete={onComplete} submitting={false} onExit={() => {}} />));
    });

    expect(container.textContent).toContain('Question 1 of 6');

    // Q1: story
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    act(() => {
      setInputValue(textarea, "Money I didn't expect landed in my account and SBI froze it.");
    });
    clickNext();

    // Q2: bank — SBI
    const bankRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find(
      (el) => el.closest('label')?.textContent?.includes('State Bank of India'),
    ) as HTMLInputElement;
    act(() => {
      bankRadio.click();
    });
    clickNext();

    // Q3: role — receiver
    const receiverRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find(
      (el) => el.closest('label')?.textContent?.includes('Money came to me'),
    ) as HTMLInputElement;
    act(() => {
      receiverRadio.click();
    });
    clickNext();

    // Q4: how it is blocked — debit freeze
    const debitRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find((el) =>
      el.closest('label')?.textContent?.includes('cannot send or take out'),
    ) as HTMLInputElement;
    act(() => {
      debitRadio.click();
    });
    expect(container.textContent).toContain('bank calls this: debit freeze');
    clickNext();

    // Q5: amount + NCRP (both are type=text now — select by placeholder)
    const amountInput = container.querySelector(
      'input[placeholder="e.g. 25000"]',
    ) as HTMLInputElement;
    act(() => {
      setInputValue(amountInput, '25000');
    });
    const ncrpInput = container.querySelector(
      'input[placeholder^="14 digits"]',
    ) as HTMLInputElement;
    act(() => {
      setInputValue(ncrpInput, '12345678901234');
    });
    clickNext();

    // Q6: who ordered the freeze — cyber
    const reasonRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find((el) =>
      el.closest('label')?.textContent?.includes('cyber / online-fraud'),
    ) as HTMLInputElement;
    act(() => {
      reasonRadio.click();
    });

    const startButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Start my case',
    ) as HTMLButtonElement;
    act(() => {
      startButton.click();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];
    expect(result.victimRole).toBe('innocent_receiver');
    expect(result.freezeReason).toBe('cyber_upi_chain');
    expect(result.frozenAmountPaise).toBe(2_500_000);
    expect(result.bankSlug).toBe('state-bank-of-india');
    expect(result.bankName).toBe('State Bank of India (SBI)');
    expect(result.freezeType).toBe('debit_freeze');
    expect(result.intakeJson).toMatchObject({
      source: 'guided_intake',
      narration: "Money I didn't expect landed in my account and SBI froze it.",
      user_role: 'receiver',
      user_role_uncertain: false,
      amount_inr: 25000,
      ncrp_id: '12345678901234',
      bank_slug_selected: 'state-bank-of-india',
      bank_name: 'State Bank of India (SBI)',
      bank_unconfirmed: false,
      freeze_type_hint: 'debit_freeze',
      freeze_type_uncertain: false,
    });
  });

  it('shows a per-step validation error instead of advancing', () => {
    act(() => {
      root.render(withIntl(<IntakeWizard onComplete={() => {}} submitting={false} onExit={() => {}} />));
    });

    clickNext();
    expect(container.textContent).toContain('Please tell us what happened first.');
    expect(container.textContent).toContain('Question 1 of 6');

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    act(() => {
      setInputValue(textarea, 'too short');
    });
    clickNext();
    expect(container.textContent).toContain('Add a little more detail — a few more words.');
  });
});

describe('ConsentScreen', () => {
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

  it('blocks Continue until the required box is checked and reports AI consent', () => {
    const onContinue = vi.fn<(aiConsentAccepted: boolean) => void>();

    act(() => {
      root.render(withIntl(<ConsentScreen onContinue={onContinue} onBack={() => {}} />));
    });

    expect(container.textContent).toContain('Before you continue');
    expect(container.textContent).toContain('does not guarantee unfreezing');

    const continueButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Continue',
    ) as HTMLButtonElement;
    act(() => {
      continueButton.click();
    });
    expect(onContinue).not.toHaveBeenCalled();

    const required = document.getElementById('consent-required') as HTMLInputElement;
    const ai = document.getElementById('consent-ai') as HTMLInputElement;
    act(() => {
      required.click();
    });
    act(() => {
      ai.click();
    });
    act(() => {
      continueButton.click();
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith(true);
  });
});
