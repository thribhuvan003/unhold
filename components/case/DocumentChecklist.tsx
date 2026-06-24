import { CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ChecklistItem } from '@/lib/intake/document-checklist';

interface DocumentChecklistProps {
  items: ChecklistItem[];
  /** evidence_type values already uploaded for this case. */
  gatheredTypes: string[];
}

export function DocumentChecklist({ items, gatheredTypes }: DocumentChecklistProps) {
  const gathered = new Set(gatheredTypes);
  const requiredCount = items.filter((i) => i.required).length;
  const requiredDone = items.filter((i) => i.required && gathered.has(i.evidence_type)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-caption text-ink-faint">
          {requiredDone} of {requiredCount} required document{requiredCount === 1 ? '' : 's'} gathered
        </p>
        <Badge tone={requiredDone >= requiredCount ? 'success' : 'neutral'}>
          {requiredDone >= requiredCount ? 'Ready' : 'In progress'}
        </Badge>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const done = gathered.has(item.evidence_type);
          return (
            <li
              key={`${item.evidence_type}-${item.label}`}
              className="u-card flex items-start gap-3 p-4"
            >
              {done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ink-faint)]" aria-hidden />
              )}
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={done ? 'text-sm text-[var(--ink-muted)] line-through' : 'text-sm font-medium text-[var(--ink)]'}>
                    {item.label}
                  </span>
                  <Badge tone={item.required ? 'warn' : 'neutral'}>
                    {item.required ? 'Required' : 'Optional'}
                  </Badge>
                  {done ? <span className="sr-only">gathered</span> : null}
                </div>
                <p className="type-caption text-ink-faint">{item.why}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="type-caption text-ink-faint">
        Upload these in the Evidence section below — each file is checked automatically. Nothing is sent to your bank.
      </p>
    </div>
  );
}
