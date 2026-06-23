/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { SwarmLogPanel } from '@/components/case/SwarmLogPanel';
import type { Database } from '@/supabase/database.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type SwarmEvent = Database['public']['Tables']['swarm_events']['Row'];

function makeEvent(overrides: Partial<SwarmEvent>): SwarmEvent {
  return {
    id: 'evt-1',
    case_id: 'case-1',
    agent_role: 'VERIFIER',
    event_type: 'evidence.verified',
    severity: 'info',
    message: 'Evidence verified (confidence 0.90)',
    message_hi: null,
    automated: true,
    job_id: null,
    langfuse_trace_id: null,
    metadata_json: {},
    created_at: '2026-06-23T10:00:00.000Z',
    ...overrides,
  };
}

describe('SwarmLogPanel', () => {
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

  it('shows a friendly empty state with no events', () => {
    act(() => {
      root.render(<SwarmLogPanel events={[]} />);
    });
    expect(container.textContent).toContain('No AI activity yet.');
  });

  it('renders a human-readable agent label and the AI Activity heading', () => {
    act(() => {
      root.render(<SwarmLogPanel events={[makeEvent({})]} />);
    });
    expect(container.textContent).toContain('AI Activity');
    expect(container.textContent).toContain('Document check');
    expect(container.textContent).toContain('Evidence verified (confidence 0.90)');
  });

  it('flags human_required events with an attention badge', () => {
    act(() => {
      root.render(<SwarmLogPanel events={[makeEvent({ severity: 'human_required' })]} />);
    });
    expect(container.textContent).toContain('Needs your attention');
  });

  it('filters to flagged-only items when the checkbox is toggled', () => {
    act(() => {
      root.render(
        <SwarmLogPanel
          events={[
            makeEvent({ id: 'clean', severity: 'info', message: 'All good' }),
            makeEvent({ id: 'flagged', severity: 'warn', message: 'Mismatch found' }),
          ]}
        />,
      );
    });

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    act(() => {
      checkbox.click();
    });

    expect(container.textContent).not.toContain('All good');
    expect(container.textContent).toContain('Mismatch found');
  });
});
