'use client';

import type { Database } from '@/supabase/database.types';

type UserAction = Database['public']['Tables']['user_actions']['Row'];

type ActionInboxProps = {
  actions: UserAction[];
};

export function ActionInbox({ actions }: ActionInboxProps) {
  const open = actions
    .filter((a) => !a.completed_at && !a.dismissed_at)
    .sort((a, b) => b.priority - a.priority);

  return (
    <section data-testid="action-inbox" style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>Action inbox</h3>
      {open.length === 0 ? (
        <p style={{ opacity: 0.7, fontSize: 14 }}>All caught up.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {open.map((action) => (
            <li
              key={action.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid #e5e7eb',
                minHeight: 44,
              }}
            >
              <strong>{action.title}</strong>
              {action.description ? (
                <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.75 }}>{action.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}