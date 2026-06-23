import Link from 'next/link';
import { ArrowRight, FileCheck, Shield, Upload } from 'lucide-react';
import { brand } from '@/lib/ui/tokens';

const steps = [
  {
    icon: Upload,
    title: 'Upload once',
    desc: 'Bank SMS, statements, FIR — SHA-256 verified and stored securely.',
  },
  {
    icon: FileCheck,
    title: 'AI assists, you decide',
    desc: 'Classification and letter drafts — nothing sent without your review.',
  },
  {
    icon: Shield,
    title: 'Escalate step by step',
    desc: 'L1–L3 letters, proof gates, full audit trail. No guarantees.',
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-14 sm:gap-16">
      <section className="u-hero animate-fade-up px-6 py-11 sm:px-10 sm:py-14">
        <div className="relative z-[1] max-w-2xl">
          <p className="type-eyebrow">India · bank freeze · step by step</p>
          <h1 className="type-display-xl mt-4">{brand.tagline}</h1>
          <p className="type-lead mt-5 max-w-xl">
            Upload evidence once. Track escalation letters. No guarantee — you stay in control of every step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/guest/report" className="u-btn u-btn-primary group">
              Start guest report
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