'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Check, Loader2, Mail, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

const STRINGS = {
  en: {
    eyebrow: 'Keep track of follow-ups',
    title: 'Follow-up reminders',
    subtitle:
      'We nudge only you on a recorded follow-up date — email and/or WhatsApp. Never your bank, police, or any authority.',
    emailTitle: 'Email',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    emailConsent: 'Email me personal case follow-up reminders. I can turn this off anytime.',
    waTitle: 'WhatsApp',
    waLabel: 'Mobile (India)',
    waPlaceholder: '10-digit mobile',
    waConsent:
      'Message me personal case follow-up reminders on WhatsApp. I can turn this off anytime.',
    waSandbox:
      'Sandbox: first message Twilio’s WhatsApp number and send the join code from your Twilio console. International trial delivery can be flaky — register a WhatsApp sender for production.',
    save: 'Save reminder settings',
    saving: 'Saving…',
    saved: 'Saved',
    testWa: 'Send test WhatsApp now',
    testingWa: 'Sending test…',
    testWaOk: '✓ Test message sent — check WhatsApp',
    testWaNeedSave: 'Save WhatsApp settings first, then test.',
    errorGeneric: 'We could not save this just now. Please try again.',
    needChannel: 'Turn on email and/or WhatsApp and fill the matching field.',
  },
  hi: {
    eyebrow: 'फॉलो-अप याद रखें',
    title: 'फॉलो-अप रिमाइंडर',
    subtitle:
      'दर्ज फॉलो-अप तारीख पर सिर्फ़ आपको ईमेल/WhatsApp — कभी बैंक, पुलिस या किसी अथॉरिटी को नहीं।',
    emailTitle: 'ईमेल',
    emailLabel: 'ईमेल पता',
    emailPlaceholder: 'you@example.com',
    emailConsent: 'मुझे व्यक्तिगत केस फॉलो-अप रिमाइंडर ईमेल करें। कभी भी बंद कर सकता/सकती हूँ।',
    waTitle: 'WhatsApp',
    waLabel: 'मोबाइल (भारत)',
    waPlaceholder: '10 अंकों का मोबाइल',
    waConsent: 'WhatsApp पर व्यक्तिगत केस फॉलो-अप रिमाइंडर भेजें। कभी भी बंद कर सकता/सकती हूँ।',
    waSandbox:
      'सैंडबॉक्स: पहले Twilio WhatsApp नंबर पर join कोड भेजें (Twilio कंसोल से)। ट्रायल में अंतरराष्ट्रीय डिलीवरी कमज़ोर हो सकती है।',
    save: 'रिमाइंडर सेटिंग सहेजें',
    saving: 'सहेजा जा रहा है…',
    saved: 'सहेजा गया',
    testWa: 'अभी टेस्ट WhatsApp भेजें',
    testingWa: 'टेस्ट भेज रहे हैं…',
    testWaOk: '✓ टेस्ट मैसेज भेजा — WhatsApp देखें',
    testWaNeedSave: 'पहले WhatsApp सेटिंग सहेजें, फिर टेस्ट करें।',
    errorGeneric: 'अभी सहेजा नहीं जा सका। कृपया दोबारा प्रयास करें।',
    needChannel: 'ईमेल और/या WhatsApp चालू करें और सही फ़ील्ड भरें।',
  },
} as const;

export function DeadlineRemindersCard({
  caseId,
  initialEmail = '',
  initialEmailOptIn = false,
  initialWhatsapp = '',
  initialWhatsappOptIn = false,
}: {
  caseId: string;
  initialEmail?: string;
  initialEmailOptIn?: boolean;
  initialWhatsapp?: string;
  initialWhatsappOptIn?: boolean;
}) {
  const locale = useLocale();
  const t = locale === 'hi' ? STRINGS.hi : STRINGS.en;
  const whatsappEnabled = process.env.NEXT_PUBLIC_ENABLE_WHATSAPP_REMINDERS === 'true';

  const [email, setEmail] = useState(initialEmail);
  const [emailOptIn, setEmailOptIn] = useState(initialEmailOptIn);
  const [whatsapp, setWhatsapp] = useState(
    initialWhatsapp.replace(/^\+91/, '').replace(/\D/g, '').slice(-10) || '',
  );
  const [waOptIn, setWaOptIn] = useState(initialWhatsappOptIn);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (saving) return;
    if (emailOptIn && !email.trim()) {
      setError(t.needChannel);
      return;
    }
    if (waOptIn && whatsapp.replace(/\D/g, '').length < 10) {
      setError(t.needChannel);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/reminder-optin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          opt_in: emailOptIn,
          whatsapp: whatsapp.trim(),
          whatsapp_opt_in: waOptIn,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? t.errorGeneric);
      }
      setSaved(true);
      setTestOk(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWhatsApp() {
    if (testing) return;
    if (!saved || !waOptIn) {
      setError(t.testWaNeedSave);
      return;
    }
    setTesting(true);
    setError(null);
    setTestOk(false);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/whatsapp-test`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error?.message ?? t.errorGeneric);
      }
      setTestOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setTesting(false);
    }
  }

  return (
    <section data-testid="deadline-reminders" className="u-card overflow-hidden p-0">
      <div className="border-b border-[var(--border)] bg-[var(--color-sky-mist)]/50 px-4 py-3.5">
        <p className="type-eyebrow text-[var(--color-sky-deep)]">{t.eyebrow}</p>
        <p className="mt-1 text-[0.9375rem] font-semibold text-[var(--ink)]">{t.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">{t.subtitle}</p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Email channel */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={emailOptIn}
              onChange={(e) => {
                setEmailOptIn(e.target.checked);
                setSaved(false);
              }}
              className="mt-1 h-4 w-4 accent-[var(--forest)]"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[0.84375rem] font-semibold text-[var(--ink)]">
                <Mail className="h-3.5 w-3.5 text-[var(--color-sky-deep)]" aria-hidden="true" />
                {t.emailTitle}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">{t.emailConsent}</span>
            </span>
          </label>
          {emailOptIn ? (
            <label className="mt-3 block">
              <span className="text-xs font-semibold text-[var(--ink)]">{t.emailLabel}</span>
              <input
                type="email"
                inputMode="email"
                maxLength={254}
                autoComplete="email"
                className="u-input mt-1.5"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSaved(false);
                }}
                placeholder={t.emailPlaceholder}
              />
            </label>
          ) : null}
        </div>

        {/* Keep WhatsApp hidden until a verified production sender is configured. */}
        {whatsappEnabled ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={waOptIn}
              onChange={(e) => {
                setWaOptIn(e.target.checked);
                setSaved(false);
              }}
              className="mt-1 h-4 w-4 accent-[var(--forest)]"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[0.84375rem] font-semibold text-[var(--ink)]">
                <MessageCircle className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden="true" />
                {t.waTitle}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">{t.waConsent}</span>
            </span>
          </label>
          {waOptIn ? (
            <>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-[var(--ink)]">{t.waLabel}</span>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ink-faint)]">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel-national"
                    className="u-input pl-12 font-mono tracking-wide"
                    value={whatsapp}
                    onChange={(e) => {
                      setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setSaved(false);
                    }}
                    placeholder={t.waPlaceholder}
                  />
                </div>
              </label>
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-[var(--ink-faint)]">
                {t.waSandbox}
              </p>
            </>
          ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="u-alert u-alert-error">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'u-btn flex min-h-[48px] w-full items-center justify-center gap-2 text-sm font-semibold',
            saved ? 'u-btn-ghost' : 'u-btn-primary',
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t.saving}
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
              {t.saved}
            </>
          ) : (
            t.save
          )}
        </button>

        {whatsappEnabled && waOptIn ? (
          <button
            type="button"
            onClick={handleTestWhatsApp}
            disabled={testing || !saved}
            className="u-btn u-btn-secondary flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t.testingWa}
              </>
            ) : testOk ? (
              <>
                <Check className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
                {t.testWaOk}
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {t.testWa}
              </>
            )}
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** @deprecated use DeadlineRemindersCard */
export { DeadlineRemindersCard as EmailReminderOptIn };
