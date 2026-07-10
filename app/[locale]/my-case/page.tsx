import { cookies } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { GUEST_COOKIE_NAME, verifyGuestToken } from '@/lib/auth/guest';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * "My case" resolver: opens the user's most recent case, or starts intake if
 * none exists yet. Keeps the bottom tab dumb — one active case per user is
 * the redesign's assumption; multi-case users still have /cases.
 */
export default async function MyCasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  const guestPayload = guestToken ? verifyGuestToken(guestToken) : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !guestPayload?.sub) redirect({ href: '/start', locale });

  const admin = createAdminClient();
  let query = admin.from('cases').select('id').order('created_at', { ascending: false }).limit(1);
  query = user
    ? query.eq('user_id', user.id)
    : query.eq('guest_session_id', guestPayload!.sub).is('user_id', null);
  const { data } = await query.maybeSingle();

  redirect({ href: data?.id ? `/cases/${data.id}` : '/start', locale });
}
