import { cn } from '@/lib/ui/cn';
import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  children: ReactNode;
};

export function Card({ interactive, className, children, ...props }: CardProps) {
  return (
    <div className={cn('u-card', interactive && 'u-card-interactive', className)} {...props}>
      {children}
    </div>
  );
}