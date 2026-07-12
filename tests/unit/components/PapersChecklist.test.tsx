/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { PapersChecklist } from '@/components/evidence/PapersChecklist';
import enMessages from '@/messages/en.json';

const withIntl = (node: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={enMessages}>
    {node}
  </NextIntlClientProvider>
);

let currentSha = 'a'.repeat(64);
vi.mock('@/lib/evidence/sha256', () => ({
  computeSha256HexInBrowser: async () => currentSha,
}));

const routerRefreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PapersChecklist', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    routerRefreshMock.mockClear();
    currentSha = 'a'.repeat(64);
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function uploadTo(label: string) {
    const input = container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
    const file = new File(['fake-bytes'], 'sms.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    return act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      for (let i = 0; i < 20; i += 1) await Promise.resolve();
    });
  }

  it('shows the 3 core papers with progress, marking a readable upload as checked', () => {
    act(() => {
      root.render(
        withIntl(<PapersChecklist
          caseId="case-1"
          initialDocs={{ freeze_sms: { confidence: 0.91, forgery: false, mismatches: [], humanReview: false } }}
        />),
      );
    });

    expect(container.textContent).toContain('1 of 3 added');
    expect(container.textContent).toContain('Freeze SMS or notice');
    expect(container.textContent).toContain('bank calls this: freeze intimation');
    expect(container.textContent).toContain('✓ Checked');
    expect(container.textContent).toContain('No issues found automatically (91% confidence');
  });

  it('does NOT count a blank/unreadable document as added, and asks for a clearer photo', () => {
    act(() => {
      root.render(
        withIntl(<PapersChecklist
          caseId="case-1"
          initialDocs={{ freeze_sms: { confidence: 0.12, forgery: false, mismatches: [], humanReview: false } }}
        />),
      );
    });

    // Low confidence → not "checked", not counted, prompts a replacement.
    expect(container.textContent).toContain('0 of 3 added');
    expect(container.textContent).not.toContain('✓ Checked');
    expect(container.textContent).toContain("couldn't read this clearly");
    expect(container.textContent).toContain('Replace photo');
  });

  it('rejects an irrelevant file even when the model over-reports confidence (client mirrors server cap)', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/evidence/upload-url')) {
        return jsonResponse({ upload_url: 'https://storage.example/put', evidence_id: 'ev-1' });
      }
      if (init?.method === 'PUT') return jsonResponse({}, 200);
      if (url.includes('/confirm')) return jsonResponse({ ok: true });
      if (url.includes('/notice-analysis')) return jsonResponse({ ok: true });
      if (url.includes('/swarm-events')) {
        return jsonResponse({
          events: [
            {
              event_type: 'evidence.verified',
              metadata_json: {
                evidence_id: 'ev-1',
                confidence: 0.9, // model contradicts itself: high confidence but not relevant
                forgery_risk: false,
                mismatches: [],
                relevant: false,
                document_kind: 'unrelated',
              },
            },
          ],
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    act(() => {
      root.render(withIntl(<PapersChecklist caseId="case-1" initialDocs={{}} />));
    });

    await uploadTo('Add photo — Freeze SMS or notice');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    // Not counted, not "Checked" — shown as the wrong document.
    expect(container.textContent).toContain('0 of 3 added');
    expect(container.textContent).not.toContain('✓ Checked');
    expect(container.textContent).toContain("doesn't look like");
    expect(container.textContent).toContain('Replace photo');
  });

  it('rejects the same file being used for a second document (cross-slot dedup)', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/evidence/upload-url')) {
        return jsonResponse({ upload_url: 'https://storage.example/put', evidence_id: 'ev-1' });
      }
      if (init?.method === 'PUT') return jsonResponse({}, 200);
      if (url.includes('/confirm')) return jsonResponse({ ok: true });
      if (url.includes('/notice-analysis')) return jsonResponse({ ok: true });
      if (url.includes('/swarm-events')) {
        return jsonResponse({
          events: [
            {
              event_type: 'evidence.verified',
              metadata_json: { evidence_id: 'ev-1', confidence: 0.9, forgery_risk: false, mismatches: [] },
            },
          ],
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    act(() => {
      root.render(withIntl(<PapersChecklist caseId="case-1" initialDocs={{}} />));
    });

    // First upload of file (sha "aaaa…") as the freeze notice succeeds.
    await uploadTo('Add photo — Freeze SMS or notice');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(container.textContent).toContain('✓ Checked');

    // The SAME file (same sha) added as the bank statement is rejected.
    await uploadTo('Add photo — Bank statement');
    expect(container.textContent).toContain('same file you added as "Freeze SMS or notice"');
    expect(container.textContent).toContain('1 of 3 added');
  });

  it('runs the real upload flow, polls the verifier, and never shows raw flag codes', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/evidence/upload-url')) {
        return jsonResponse({ upload_url: 'https://storage.example/put', evidence_id: 'ev-1' });
      }
      if (init?.method === 'PUT') return jsonResponse({}, 200);
      if (url.includes('/confirm')) return jsonResponse({ ok: true });
      if (url.includes('/notice-analysis')) return jsonResponse({ ok: true });
      if (url.includes('/swarm-events')) {
        return jsonResponse({
          events: [
            {
              event_type: 'evidence.verified',
              metadata_json: {
                evidence_id: 'ev-1',
                confidence: 0.8,
                forgery_risk: false,
                mismatches: [{ field: 'amount_paise', expected: '25000', found: '250000' }],
                human_review_required: true,
              },
            },
          ],
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    act(() => {
      root.render(withIntl(<PapersChecklist caseId="case-1" initialDocs={{}} />));
    });

    await uploadTo('Add photo — Freeze SMS or notice');
    expect(container.textContent).toContain('AI is checking this document for you');
    expect(routerRefreshMock).toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Structured mismatch fields render as guidance, never "[object Object]".
    expect(container.textContent).toContain('worth a quick check');
    expect(container.textContent).toContain('amount_paise');
    expect(container.textContent).toContain('250000');
    expect(container.textContent).not.toContain('[object Object]');
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/notice-analysis'))).toBe(true);
  });

  it('falls back calmly when polling exhausts without a verifier event', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/evidence/upload-url')) {
        return jsonResponse({ upload_url: 'https://storage.example/put', evidence_id: 'ev-1' });
      }
      if (init?.method === 'PUT') return jsonResponse({}, 200);
      if (url.includes('/confirm')) return jsonResponse({ ok: true });
      if (url.includes('/notice-analysis')) return jsonResponse({ ok: true });
      if (url.includes('/swarm-events')) return jsonResponse({ events: [] });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    act(() => {
      root.render(withIntl(<PapersChecklist caseId="case-1" initialDocs={{}} />));
    });

    await uploadTo('Add photo — Bank statement');
    expect(container.textContent).toContain('AI is checking this document for you');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20 * 3000);
    });

    expect(container.textContent).not.toContain('AI is checking this document for you');
    expect(container.textContent).toContain('review the original carefully before you use it');
    expect(container.textContent).toContain('1 of 3 added');
  });

  it('marks extras as added without the checking chip', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/evidence/upload-url')) {
        return jsonResponse({ upload_url: 'https://storage.example/put', evidence_id: 'ev-2' });
      }
      if (init?.method === 'PUT') return jsonResponse({}, 200);
      if (url.includes('/confirm')) return jsonResponse({ ok: true });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    act(() => {
      root.render(withIntl(<PapersChecklist caseId="case-1" initialDocs={{}} />));
    });

    await uploadTo('Add — Police FIR copy');

    expect(container.textContent).toContain('✓ Added');
    expect(container.textContent).toContain('0 of 3 added · 1 extra');
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as Response;
}
