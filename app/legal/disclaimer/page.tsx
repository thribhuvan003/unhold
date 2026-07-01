import Link from 'next/link';
import { DISCLAIMER_BLOCKS } from '@/lib/constants/disclaimers';

const BLOCK_HEADINGS: Record<string, string> = {
  A: 'Not a law firm or bank',
  B: 'No guaranteed outcome',
  C: 'Drafts only',
  D: 'Fees',
  E: 'Bank rankings',
  F: 'How AI is used',
  G: 'What to upload',
  H: 'Human review',
};

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-[#0B1F33]">Legal disclaimer</h1>
      <p className="mt-2 text-sm text-slate-600">
        <Link href="/legal/privacy" className="text-[#1F6B8A] underline">
          Privacy policy
        </Link>
      </p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-slate-800">
        {(Object.entries(DISCLAIMER_BLOCKS) as [string, string][]).map(([id, text]) => (
          <article key={id}>
            <h2 className="font-semibold text-[#0B1F33]">
              {BLOCK_HEADINGS[id] ?? `Section ${id}`}
            </h2>
            <p className="mt-2">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
