import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { LetterPreview } from '@/components/letters/LetterPreview';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GUEST_COOKIE_NAME, verifyGuestToken } from '@/lib/auth/guest';
import { assertCaseAccess, type RequestAuth } from '@/lib/api/case-access';

type PageProps = {
  params: Promise<{ id: string; level: string }>;
};

const VALID = new Set(['L1', 'L2', 'L3']);

export default async function LetterPage({ params }: PageProps) {
  const { id, level } = await params;
  if (!VALID.has(level)) notFound();

  // Guest-aware auth, mirroring the case workspace page: a guest JWT cookie OR a
  // signed-in Supabase user. The anon client cannot read a guest's rows under RLS,
  // so we authorize the requester and then read via the admin client.
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  const guestPayload = guestToken ? verifyGuestToken(guestToken) : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth: RequestAuth = {
    userId: user?.id ?? null,
    guestSessionId: guestPayload?.sub ?? null,
    actorType: user ? 'user' : 'guest',
    actorId: user?.id ?? guestPayload?.sub ?? '',
  };

  if (!auth.userId && !auth.guestSessionId) notFound();
  try {
    await assertCaseAccess(id, auth, 'viewer');
  } catch {
    notFound();
  }

  const admin = createAdminClient();
  const { data: escalation } = await admin
    .from('escalations')
    .select('*')
    .eq('case_id', id)
    .eq('level', level as 'L1' | 'L2' | 'L3')
    .maybeSingle();

  // No escalation at this level → the letter was never requested.
  if (!escalation) notFound();

  // Escalation exists but the drafter job hasn't produced the letter body yet:
  // show a friendly "being prepared" state instead of a raw 404.
  if (!escalation.letter_body || !escalation.letter_subject) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Your {level} letter is being prepared</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85 }}>
          We&apos;re drafting your {level} letter now. This usually takes a few moments. Refresh
          this page shortly to review and copy it.
        </p>
        <div style={{ marginTop: 20, display: 'flex', gap: 16 }}>
          <Link href={`/cases/${id}/letters/${level}`} style={{ fontSize: 14, fontWeight: 600 }}>
            ↻ Refresh
          </Link>
          <Link href={`/cases/${id}`} style={{ fontSize: 14, opacity: 0.8 }}>
            ← Back to your case
          </Link>
        </div>
      </main>
    );
  }

  const metadata = (escalation.metadata_json ?? {}) as {
    placeholders_missing?: string[];
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>{level} letter draft</h1>
      <LetterPreview
        subject={escalation.letter_subject}
        body={escalation.letter_body}
        level={level}
        placeholdersMissing={metadata.placeholders_missing ?? []}
        approved={escalation.status === 'approved' || escalation.approved_at != null}
      />
      <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
        Copy-only — you must send this letter yourself via email or post.
      </p>
    </main>
  );
}
