import { redirect } from '@/i18n/navigation';

/** Merged into the single /start intake wizard. */
export default async function NewCasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/start', locale });
}
