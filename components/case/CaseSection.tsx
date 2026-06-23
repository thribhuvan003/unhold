import type { ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

type CaseSectionProps = {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  stagger?: 1 | 2 | 3 | 4 | 5;
};

export function CaseSection({ label, description, children, className, stagger }: CaseSectionProps) {
  return (
    <section className={cn('u-section animate-fade-up', stagger ? `stagger-${stagger}` : undefined, className)}>
      <header className="u-section-header">
        <p className="type-eyebrow text-ink-faint">{label}</p>
        {description ? <p className="type-caption max-w-prose">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}