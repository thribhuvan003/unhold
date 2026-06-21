import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-[#0B1F33]">Unfreeze your bank account — step by step</h1>
      <p className="max-w-2xl text-lg text-slate-700">
        Upload evidence once. Track escalation letters. No guarantee — you stay in control.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/guest/report"
          className="inline-flex min-h-[44px] items-center rounded bg-[#E67E00] px-5 font-medium text-white no-underline"
        >
          Start guest report
        </Link>
        <Link
          href="/cases/new"
          className="inline-flex min-h-[44px] items-center rounded border border-[#1F6B8A] px-5 font-medium text-[#1F6B8A] no-underline"
        >
          New case
        </Link>
      </div>
    </section>
  );
}