import { cn } from '@/lib/ui/cn';

type MoneyDisplayProps = {
  amountPaise: number;
  className?: string;
};

export function MoneyDisplay({ amountPaise, className }: MoneyDisplayProps) {
  const inr = amountPaise / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(inr);

  return (
    <span className={cn('tabular-nums', className)} data-testid="money-display">
      {formatted}
    </span>
  );
}