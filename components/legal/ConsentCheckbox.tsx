'use client';

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
      className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        disabled={disabled}
        className="mt-1 h-5 w-5 shrink-0 accent-[#1F6B8A]"
        aria-required={required}
      />
      <span className="text-sm leading-relaxed text-[#0B1F33]">{label}</span>
    </label>
  );
}