/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextStepsCard } from '@/components/case/NextStepsCard';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: vi.fn(),
  }),
}));
import type { Database } from '@/supabase/database.types';

type UserAction = Database['public']['Tables']['user_actions']['Row'];

function makeAction(overrides: Partial<UserAction>): UserAction {
  return {
    id: 'ua-1',
    case_id: 'case-1',
    action_type: 'upload_evidence',
    title: 'Upload NCRP acknowledgement',
    description: 'Required for classification',
    title_hi: null,
    priority: 90,
    due_at: null,
    completed_at: null,
    dismissed_at: null,
    escalation_id: null,
    evidence_id: null,
    metadata_json: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('NextStepsCard', () => {
  it('renders primary action as today\'s action', () => {
    const html = renderToStaticMarkup(
      <NextStepsCard
        caseId="case-1"
        initialActions={[
          makeAction({ id: 'low', title: 'Low priority', priority: 10 }),
          makeAction({ id: 'high', title: 'Upload bank SMS', priority: 85 }),
        ]}
      />,
    );

    expect(html).toContain('data-testid="next-steps-card"');
    expect(html).toMatch(/Today.*s action/);
    expect(html).toContain('Upload bank SMS');
    expect(html).not.toContain('Low priority');
  });

  it('shows empty state when no open actions', () => {
    const html = renderToStaticMarkup(
      <NextStepsCard
        caseId="case-1"
        initialActions={[makeAction({ completed_at: new Date().toISOString() })]}
      />,
    );

    expect(html).toContain('No pending actions');
  });

  it('uses 44px minimum touch target on action button', () => {
    const html = renderToStaticMarkup(
      <NextStepsCard caseId="case-1" initialActions={[makeAction({})]} />,
    );

    expect(html).toContain('min-height:44');
    expect(html).toContain('min-width:44');
  });
});