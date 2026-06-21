import Link from 'next/link';
import { DISCLAIMER_BLOCKS } from '@/lib/constants/disclaimers';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-[#0B1F33]">Privacy policy</h1>
      <p className="mt-2 text-sm text-slate-600">
        <Link href="/legal/disclaimer" className="text-[#1F6B8A] underline">
          Legal disclaimer
        </Link>
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-800">
        <p>
          LienLiberator processes case and evidence data to help you track bank freeze matters.
          Financial case data is retained while your case is active and for three years after
          closure. Audit logs are retained for eight years.
        </p>
        <p>{DISCLAIMER_BLOCKS.F}</p>
        <p>{DISCLAIMER_BLOCKS.G}</p>
        <p>
          You may request erasure of your case within 30 days of closure via the case settings
          page. Government ID data is stored minimally and masked.
        </p>
      </section>
    </main>
  );
}