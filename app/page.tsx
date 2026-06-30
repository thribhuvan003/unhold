import Link from 'next/link';
import { ArrowRight, ExternalLink, FileCheck, Landmark, Shield } from 'lucide-react';
import { brand } from '@/lib/ui/tokens';

const steps = [
  {
    icon: Landmark,
    title: '1. Start with the official path',
    desc: 'Report on cybercrime.gov.in or call 1930. Use the government GRM (wrongly frozen) or MRM (victim) process — that is primary.',
  },
  {
    icon: FileCheck,
    title: '2. Unhold preps your case',
    desc: 'AI reads your freeze notice, builds the right evidence checklist + a SHA-256 sealed bundle, and drafts GRM-ready representations.',
  },
  {
    icon: Shield,
    title: '3. You submit & track',
    desc: 'Copy-only letters, proof gates, timelines. You send everything yourself via official channels. No auto-send, no guarantees.',
  },
] as const;

const officialLinks = [
  { label: 'NCRP — cybercrime.gov.in', href: 'https://cybercrime.gov.in/' },
  { label: 'Grievance Redressal (GRM)', href: 'https://ncrp-grievanceredressal.mha.gov.in/' },
  { label: 'Money Restoration (MRM)', href: 'https://mrm-ncrp.mha.gov.in/' },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-14 sm:gap-16">
      <section className="u-hero animate-fade-up px-6 py-11 sm:px-10 sm:py-14">
        <div className="relative z-[1] max-w-2xl">
          <p className="type-eyebrow">India · cyber-fraud account freeze · official-first</p>
          <h1 className="type-display-xl mt-4">{brand.tagline}</h1>
          <p className="type-lead mt-5 max-w-xl">
            Account frozen over a cyber-fraud complaint? <strong>Start with the official process</strong> —
            file on the NCRP portal or call <strong>1930</strong>, and use the government <strong>GRM/MRM</strong> path.
            Unhold is your prep layer: it reads your freeze notice, builds the right evidence checklist and a
            SHA-256 sealed bundle, and drafts your representations — so your official submission is as strong as
            possible. You send everything yourself. No auto-send, no guarantees.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
            {officialLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="type-caption inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline"
              >
                {l.label}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/guest/report" className="u-btn u-btn-primary group">
              Prepare my GRM submission
              <ArrowRight
                className="h-4 w-4 transition-transform duration-[140ms] ease-[var(--ease-out-expo)] group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link href="/cases/new" className="u-btn u-btn-ghost">
              New case
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {steps.map((step, i) => (
          <article
            key={step.title}
            className={`group u-card u-card-interactive animate-fade-up p-5 sm:p-6 stagger-${i + 1}`}
          >
            <div className="u-icon-box u-icon-box-forest h-9 w-9 transition-transform duration-[140ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]">
              <step.icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.65} aria-hidden="true" />
            </div>
            <h2 className="type-display mt-4 text-[0.9375rem]">{step.title}</h2>
            <p className="type-caption mt-2 leading-relaxed">{step.desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
