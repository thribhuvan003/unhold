'use client';

import { useId, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { NoticeAnalysisCard } from '@/components/intake/NoticeAnalysisCard';
import type { NoticeAnalysisResult } from '@/components/intake/notice-analysis-types';

interface NoticeAnalyzerProps {
  caseId: string;
  guestToken?: string;
  initialAnalysis?: NoticeAnalysisResult | null;
}

type Phase = 'idle' | 'analyzing' | 'done' | 'unavailable' | 'error';

export function NoticeAnalyzer({ caseId, guestToken, initialAnalysis = null }: NoticeAnalyzerProps) {
  const textareaId = useId();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>(initialAnalysis ? 'done' : 'idle');
  const [result, setResult] = useState<NoticeAnalysisResult | null>(initialAnalysis);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    const notice = text.trim();
    if (!notice || phase === 'analyzing') return;
    setPhase('analyzing');
    setError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/notice-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestToken ? { 'X-Guest-Token': guestToken } : {}),
        },
        body: JSON.stringify({ input_kind: 'text', pasted_text: notice }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Could not analyze the notice');
      }
      if (!json.analysis) {
        setPhase('unavailable');
        return;
      }
      setResult(json.analysis as NoticeAnalysisResult);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor={textareaId} className="type-caption block">
          Paste the text of your freeze notice or bank SMS
        </label>
        <textarea
          id={textareaId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="e.g. Your account has been debit-frozen on the instruction of… NCRP ref…"
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--paper)] p-3 text-sm"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="type-caption text-ink-faint">
            Guidance only. Nothing is sent to your bank — you stay in control.
          </p>
          <button
            type="button"
            onClick={analyze}
            disabled={!text.trim() || phase === 'analyzing'}
            className="u-btn u-btn-primary inline-flex min-h-[44px] items-center gap-2 px-4 disabled:opacity-50"
          >
            {phase === 'analyzing' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {phase === 'analyzing' ? 'Analyzing…' : 'Explain my notice'}
          </button>
        </div>
      </div>

      {phase === 'error' ? (
        <p role="alert" className="u-alert u-alert-error">
          {error}
        </p>
      ) : null}

      {phase === 'unavailable' ? (
        <p className="u-alert u-alert-warn">
          We couldn&apos;t analyze this automatically. You can still continue and fill in your details manually.
        </p>
      ) : null}

      {phase === 'done' && result ? <NoticeAnalysisCard result={result} /> : null}
    </div>
  );
}
