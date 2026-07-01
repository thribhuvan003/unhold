import type { Metadata } from 'next';
import { Bricolage_Grotesque, Red_Hat_Mono, Schibsted_Grotesk } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { brand } from '@/lib/ui/tokens';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const schibsted = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const redHatMono = Red_Hat_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: brand.publicName,
  description: brand.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${bricolage.variable} ${schibsted.variable} ${redHatMono.variable}`}
    >
      <body className="u-paper-grain flex min-h-screen flex-col antialiased">
        <SiteHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="u-main-skip-target mx-auto w-full max-w-5xl flex-1 px-4 py-9 pb-20 sm:px-5 sm:py-11 sm:pb-11"
        >
          {children}
        </main>
        <BottomTabBar />
        <footer className="border-t border-border bg-surface py-9">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-5">
            <p className="type-caption">
              Not a law firm. Not RBI. Cyber helpline{' '}
              <a href="tel:1930" className="type-mono-data font-medium text-sky-deep no-underline hover:underline">
                1930
              </a>
            </p>
            <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-ink-faint">
              Built for people navigating bank freezes — you stay in control.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}