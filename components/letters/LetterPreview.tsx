'use client';

import { Copy } from 'lucide-react';
import { LETTER_DISCLAIMER } from '@/lib/constants/disclaimers';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/ui/cn';

type LetterPreviewProps = {
  subject: string;
  body: string;
  level: string;
  placeholdersMissing: string[];
  approved?: boolean;
  onCopy?: () => void;
};

export function LetterPreview({
  subject,
  body,
  level,
  placeholdersMissing,
  approved = false,
  onCopy,
}: LetterPreviewProps) {
  const canExport = approved && placeholdersMissing.length === 0;

  return (
    <article data-testid="letter-preview" className="u-letter animate-fade-up">
      <p data-testid="disclaimer-block" className="u-letter-disclaimer">
        {LETTER_DISCLAIMER}
      </p>

      <p className="type-eyebrow text-ink-faint">Level {level} — copy only</p>
      <h2 className="type-display mt-2 text-base">{subject}</h2>
      <pre className="u-letter-body mt-4">{body}</pre>

      {placeholdersMissing.length > 0 ? (
        <p className="mt-4 text-sm text-warn">
          Missing fields: {placeholdersMissing.join(', ')} — complete intake before sending.
        </p>
      ) : null}

      <Button
        type="button"
        variant={canExport ? 'secondary' : 'ghost'}
        disabled={!canExport}
        onClick={onCopy}
        className={cn('mt-5 w-full sm:w-auto', !canExport && 'opacity-50')}
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        {canExport ? 'Copy to clipboard' : 'Approve draft to enable copy'}
      </Button>
    </article>
  );
}