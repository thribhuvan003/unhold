import { track as vercelTrack } from '@vercel/analytics';

/**
 * Privacy-first funnel instrumentation via Vercel Web Analytics.
 *
 * Only the explicit events in `FunnelEvent` are recorded, each as a Vercel
 * custom event. No PII is ever attached — properties are restricted to a small
 * allowlist of non-identifying primitives (e.g. escalation `level`). Aggregate
 * visitor/pageview counts come from the <Analytics /> component in the root
 * layout; this helper only adds the funnel steps on top.
 *
 * Vercel's track() no-ops automatically outside production and when Web
 * Analytics is not enabled, and any failure here is swallowed — analytics must
 * never affect a user's case workflow.
 */

export type FunnelEvent =
  | 'landing_view'
  | 'case_started'
  | 'intake_completed'
  | 'letter_generated'
  | 'letter_marked_sent'
  | 'outcome_logged';

/** Non-identifying primitives only. Never pass PII here. */
type EventProps = Record<string, string | number | boolean>;

/**
 * Fire a single funnel event. Fire-and-forget; safe to call from any client
 * component.
 */
export function track(event: FunnelEvent, properties?: EventProps): void {
  try {
    vercelTrack(event, properties);
  } catch {
    // Never throw from analytics.
  }
}
