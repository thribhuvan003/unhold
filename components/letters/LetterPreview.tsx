'use client';

import { LETTER_DISCLAIMER } from '@/lib/constants/disclaimers';

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
    <article
      data-testid="letter-preview"
      style={{
        border: '1px solid #d1d5db',
        borderRadius: 8,
        padding: 20,
        background: '#fff',
      }}
    >
      <p
        data-testid="disclaimer-block"
        style={{
          background: '#FEF3C7',
          color: '#92400E',
          padding: '8px 12px',
          borderRadius: 6,
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        {LETTER_DISCLAIMER}
      </p>

      <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>Level {level} — copy only</p>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{subject}</h2>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 14,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {body}
      </pre>

      {placeholdersMissing.length > 0 ? (
        <p style={{ color: '#B45309', marginTop: 16, fontSize: 14 }}>
          Missing fields: {placeholdersMissing.join(', ')} — complete intake before sending.
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canExport}
        onClick={onCopy}
        style={{
          marginTop: 16,
          minHeight: 44,
          padding: '10px 20px',
          background: canExport ? '#1F6B8A' : '#9CA3AF',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: canExport ? 'pointer' : 'not-allowed',
        }}
      >
        {canExport ? 'Copy to clipboard' : 'Approve draft to enable copy'}
      </button>
    </article>
  );
}