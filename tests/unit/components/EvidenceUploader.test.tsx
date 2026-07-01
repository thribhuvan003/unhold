/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { EvidenceUploader } from '@/components/evidence/EvidenceUploader';

vi.mock('@/lib/evidence/sha256', () => ({
  computeSha256HexInBrowser: async () => 'a'.repeat(64),
}));

const routerRefreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('EvidenceUploader', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    routerRefreshMock.mockClear();
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

  it('renders the upload form with no pending feedback initially', () => {
    act(() => {
      root.render(<EvidenceUploader caseId="case-1" />);
    });

    expect(container.textContent).toContain('Upload evidence');
    expect(container.textContent).not.toContain('AI is checking');
  });

  it('polls swarm-events after confirm and shows a flag when the VERIFIER reports forgery risk', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/evidence/upload-url')) {
        return jsonResponse({ upload_url: 'https://storage.example/put', evidence_id: 'ev-1' });
      }
      if (init?.method === 'PUT') {
        return jsonResponse({}, 200);
      }
      if (url.includes('/confirm')) {
        return jsonResponse({ ok: true });
      }
      if (url.includes('/swarm-events')) {
        return jsonResponse({
          events: [
            {
              event_type: 'evidence.verified',
              metadata_json: {
                evidence_id: 'ev-1',
                confidence: 0.4,
                forgery_risk: true,
                forgery_flags: ['edited_amount_field'],
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
      root.render(<EvidenceUploader caseId="case-1" />);
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'sms.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file] });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await flushAsync();
    });

    expect(container.textContent).toContain('AI is checking');
    expect(routerRefreshMock).toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(container.textContent).toContain('Possible authenticity issue');
    expect(container.textContent).toContain('edited_amount_field');
    // SEC-3: mismatches are {field, expected, found} objects, not strings —
    // renders the structured fields (humane guidance copy) instead of "[object Object]".
    expect(container.textContent).toContain('amount_paise');
    expect(container.textContent).toContain('250000');
    expect(container.textContent).toContain('25000');
    expect(container.textContent).not.toContain('[object Object]');
  });

  it('shows a calm fallback message instead of going silent when polling exhausts with no match', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/evidence/upload-url')) {
        return jsonResponse({ upload_url: 'https://storage.example/put', evidence_id: 'ev-1' });
      }
      if (init?.method === 'PUT') {
        return jsonResponse({}, 200);
      }
      if (url.includes('/confirm')) {
        return jsonResponse({ ok: true });
      }
      if (url.includes('/swarm-events')) {
        return jsonResponse({ events: [] });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    act(() => {
      root.render(<EvidenceUploader caseId="case-1" />);
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'sms.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file] });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await flushAsync();
    });

    expect(container.textContent).toContain('AI is checking');

    // 20 poll attempts * 3000ms exhausts POLL_MAX_ATTEMPTS with no matching event.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20 * 3000);
    });

    expect(container.textContent).not.toContain('AI is checking');
    expect(container.textContent).toContain('Still checking this document in the background');
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as Response;
}

async function flushAsync() {
  for (let i = 0; i < 20; i += 1) {
    await Promise.resolve();
  }
}
