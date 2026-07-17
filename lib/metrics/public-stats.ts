import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Public, aggregate-only traction counts for the /impact page.
 *
 * Every figure is a COUNT over a whole table — no row data and no per-user or
 * per-case information ever leaves this function. Read-only. Individual query
 * failures degrade to 0 rather than throwing, so one slow or blocked count can
 * never take the page down.
 *
 * Mappings (ground truth):
 *   users            -> guest_sessions (one per person who started)
 *   casesStarted     -> cases
 *   lettersGenerated -> escalations with a drafted body (letter_body IS NOT NULL)
 *   lettersSent      -> escalations marked sent (sent_at IS NOT NULL)
 *   accountsUnfrozen -> not yet counted; wired with the outcome-capture feature.
 */
export type PublicStats = {
  users: number;
  casesStarted: number;
  lettersGenerated: number;
  lettersSent: number;
  unfrozenReported: number;
  generatedAt: string;
};

export async function getPublicStats(): Promise<PublicStats> {
  const admin = createAdminClient();

  const [users, cases, generated, sent, unfrozen] = await Promise.all([
    admin.from('guest_sessions').select('*', { count: 'exact', head: true }),
    admin.from('cases').select('*', { count: 'exact', head: true }),
    admin
      .from('escalations')
      .select('*', { count: 'exact', head: true })
      .not('letter_body', 'is', null),
    admin
      .from('escalations')
      .select('*', { count: 'exact', head: true })
      .not('sent_at', 'is', null),
    // Unique per case (unique index on case_id+outcome), user-reported.
    admin
      .from('case_outcomes')
      .select('*', { count: 'exact', head: true })
      .eq('outcome', 'unfrozen'),
  ]);

  return {
    users: users.count ?? 0,
    casesStarted: cases.count ?? 0,
    lettersGenerated: generated.count ?? 0,
    lettersSent: sent.count ?? 0,
    unfrozenReported: unfrozen.count ?? 0,
    generatedAt: new Date().toISOString(),
  };
}
