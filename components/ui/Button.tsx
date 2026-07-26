import { cn } from '@/lib/ui/cn';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'warn';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'u-btn-primary',
  secondary: 'u-btn-secondary',
  ghost: 'u-btn-ghost',
  warn: 'u-btn-warn',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export function Button({ variant = 'primary', className, type = 'button', children, ...props }: ButtonProps) {
  return (
    <button type={type} className={cn('u-btn', variantClass[variant], className)} {...props}>
      {children}
    </button>
  );
}