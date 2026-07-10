'use client';

import { Link } from '@/i18n/navigation';

export default function CaseError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[430px] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="type-display-xl text-[1.5rem]">We hit a snag loading your case</h1>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        Your case and documents are safe — nothing was lost. This is usually a brief connection hiccup.
      </p>
      <button
        type="button"
        onClick={reset}
        className="u-btn u-btn-primary min-h-[48px] px-6 text-sm font-semibold"
      >
        Try again
      </button>
      <Link href="/my-case" className="min-h-[44px] text-sm font-medium text-[var(--ink-muted)] underline">
        Back to my case
      </Link>
    </main>
  );
}
