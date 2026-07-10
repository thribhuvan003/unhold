import { cn } from '@/lib/ui/cn';
import type { HTMLAttributes, ReactNode } from 'react';

type BadgeTone = 'neutral' | 'forest' | 'success' | 'warn' | 'error' | 'terracotta';

const toneClass: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--paper)] text-[var(--ink-muted)] border border-[var(--border)]',
  forest: 'bg-[var(--forest-muted)] text-[var(--forest)]',
  success: 'bg-[var(--success-muted)] text-[var(--success)]',
  warn: 'bg-[var(--warn-muted)] text-[var(--warn)]',
  error: 'bg-[var(--error-muted)] text-[var(--error)]',
  terracotta: 'bg-[var(--terracotta-muted)] text-[var(--terracotta)]',
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn('u-badge', toneClass[tone], className)} {...props}>
      {children}
    </span>
  );
}