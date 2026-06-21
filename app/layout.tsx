import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Unhold',
  description: 'Unfreeze your bank account — step by step',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <header className="border-b border-slate-200 bg-[#0B1F33] text-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-white no-underline">
              Unhold
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/guest/report" className="text-white/90 hover:text-white">
                Report freeze
              </Link>
              <Link href="/cases" className="text-white/90 hover:text-white">
                My cases
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          Not a law firm. Not RBI. Cyber helpline 1930.
        </footer>
      </body>
    </html>
  );
}