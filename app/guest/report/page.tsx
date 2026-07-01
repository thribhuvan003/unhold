'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { GuidedIntakeForm, type GuidedIntakeResult } from '@/components/intake/GuidedIntakeForm';
import { NoticeAnalysisCard } from '@/components/intake/NoticeAnalysisCard';
import type { NoticeAnalysisResult } from '@/components/intake/notice-analysis-types';

type Phase = 'hero' | 'form';

export default function GuestReportPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('hero');

  // Hero (analyzer) state
  const [noticeText, setNoticeText] = useState('');
  const [aiConsent, setAiConsent] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<NoticeAnalysisResult | null>(null);

  // Case carried from the analyze path into the form phase (null on the skip path)
  const [caseId, setCaseId] = useState<string | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGuestCase(aiConsentAccepted: boolean): Promise<{ id: string; token: string }> {
    const sessionRes = await fetch('/api/v1/guest/sessions', { method: 'POST' });
    const sessionJson = await sessionRes.json();
    if (!sessionRes.ok) throw new Error(sessionJson.error?.message ?? 'Failed to start guest session');
    const token: string = sessionJson.device_token;

    // freeze_reason is intentionally omitted — the analyzer/intake classifier
    // determines it (via intake_json.freeze_reason_hint), never a hardcoded guess.
    const caseRes = await fetch('/api/v1/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        'X-Guest-Token': token,
      },
      body: JSON.stringify({
        bank_slug: 'state-bank-of-india',
        consent_accepted: true,
        ai_consent_accepted: aiConsentAccepted,
      }),
    });
    const caseJson = await caseRes.json();
    if (!caseRes.ok) throw new Error(caseJson.error?.message ?? 'Failed to create case');
    return { id: caseJson.id, token };
  }

  async function explainMyNotice() {
    const text = noticeText.trim();
    if (!text || !aiConsent || analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const { id, token } = await createGuestCase(true);
      setCaseId(id);
      setDeviceToken(token);

      const res = await fetch(`/api/v1/cases/${id}/notice-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Guest-Token': token },
        body: JSON.stringify({ input_kind: 'text', pasted_text: text }),
      });
      const json = await res.json();
      if (res.ok && json.analysis) {
        setAnalysis(json.analysis as NoticeAnalysisResult);
      }
      // On analysis failure we still proceed — the case exists; the user fills
      // in the form manually (advisory feature, never blocks intake).
      setPhase('form');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAnalyzing(false);
    }
  }

  async function completeIntake(result: GuidedIntakeResult) {
    setSubmitting(true);
    setError(null);
    try {
      if (caseId && deviceToken) {
        // Analyze path: case already exists — set details + carry the analyzer's
        // reason as a hint for the intake classifier (avoids the Zod/DB enum cast).
        const intakeJson: Record<string, unknown> = { ...result.intakeJson };
        if (analysis) intakeJson.freeze_reason_hint = analysis.freeze_reason;

        const res = await fetch(`/api/v1/cases/${caseId}/intake`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Guest-Token': deviceToken },
          body: JSON.stringify({
            victim_role: result.victimRole,
            frozen_amount_paise: result.frozenAmountPaise,
            intake_json: intakeJson,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? 'Failed to save your details');
        router.push(`/cases/${caseId}`);
        return;
      }

      // Skip path: no case yet — create it now (still no hardcoded freeze_reason).
      const { id, token } = await createGuestCase(result.aiConsentAccepted);
      await fetch(`/api/v1/cases/${id}/intake`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Guest-Token': token },
        body: JSON.stringify({
          victim_role: result.victimRole,
          frozen_amount_paise: result.frozenAmountPaise,
          intake_json: result.intakeJson,
        }),
      });
      router.push(`/cases/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-8">
      <header className="animate-fade-up space-y-2">
        <p className="type-eyebrow">~2 minutes · no account</p>
        <h1 className="type-display mt-1 text-3xl">
          {phase === 'hero' ? 'What does your freeze notice mean?' : 'Quick freeze report'}
        </h1>
        <p className="type-lead text-[0.9375rem]">
          {phase === 'hero'
            ? 'Paste or type the text from your bank freeze SMS/notice. After the quick report, you can upload screenshots and statements into your GRM-ready bundle.'
            : 'A few guided questions to complete your case. Data stored securely in Supabase — not localStorage.'}
        </p>
      </header>

      {phase === 'hero' ? (
        <div className="animate-fade-up stagger-1 space-y-4">
          <textarea
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            rows={6}
            placeholder="e.g. Your SBI account has been debit-frozen on NCRP/cyber cell instructions. Ref: ... Date: ..."
            className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--paper)] p-3 text-sm"
          />
          <p className="type-caption text-ink-faint">
            Have only a screenshot? Type the visible words here first. You can upload the image after your case
            workspace opens.
          </p>

          <label className="flex items-start gap-2 text-sm text-[var(--ink-muted)]">
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(e) => setAiConsent(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[var(--forest)]"
            />
            <span>
              Let AI read this notice to explain it. Your notice text may be processed by an AI provider
              outside India. Guidance only — nothing is sent to your bank.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPhase('form')}
              className="text-sm text-[var(--ink-muted)] underline underline-offset-4"
            >
              Skip — I&apos;ll fill it in myself
            </button>
            <button
              type="button"
              onClick={explainMyNotice}
              disabled={!noticeText.trim() || !aiConsent || analyzing}
              className="u-btn u-btn-primary inline-flex min-h-[44px] items-center gap-2 px-4 disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
              {analyzing ? 'Analyzing…' : 'Explain my notice'}
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-up stagger-1 space-y-6">
          {analysis ? <NoticeAnalysisCard result={analysis} /> : null}
          <GuidedIntakeForm
            onComplete={completeIntake}
            submitting={submitting}
            prefill={analysis ? { frozenAmountPaise: analysis.extracted.amount_paise } : undefined}
          />
        </div>
      )}

      {error ? (
        <p role="alert" className="u-alert u-alert-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
