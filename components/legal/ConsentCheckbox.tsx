'use client';

import { cn } from '@/lib/ui/cn';

type ConsentCheckboxProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  disabled?: boolean;
};

export function ConsentCheckbox({
  id,
  label,
  checked,
  onChange,
  required = true,
  disabled = false,
}: ConsentCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3.5 transition-all duration-200',
        checked
          ? 'border-[var(--forest)]/40 bg-[var(--forest-muted)]'
          : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        disabled={disabled}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--forest)]"
        aria-required={required}
      />
      <span className="text-sm leading-relaxed text-[var(--ink)]">
        {label}
        {!required ? (
          <span className="ml-2 inline-block rounded-full border border-[var(--border)] bg-[var(--paper)] px-2 py-0.5 align-middle text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Optional
          </span>
        ) : null}
      </span>
    </label>
  );
}