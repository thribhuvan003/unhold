import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { appendSwarmEvent } from "@/lib/swarm/append-event";
import { TERMINAL_STATUSES } from "@/lib/loops/termination";
import type { Database } from "@/supabase/database.types";

type CaseRow = Database["public"]["Tables"]["cases"]["Row"];

/**
 * Transactional email via the Resend REST API (fetch — no SDK dependency).
 *
 * Env-gated: if RESEND_API_KEY or RESEND_FROM_EMAIL is unset the sender is a
 * safe no-op that returns `skipped` and never throws, so dev / preview run fine
 * without email configured and nothing is ever sent silently. The API key is
 * never logged.
 *
 * This feature ONLY ever emails the USER about their OWN case deadlines. It
 * never contacts a bank — see the no-auto-send invariant
 * (scripts/verify-no-auto-send.sh).
 */
export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { sent: true; id: string }
  | { sent: false; skipped: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    // Not configured — no-op. Do NOT log the key. Never throw.
    console.info(
      "[email] skipped: RESEND_API_KEY / RESEND_FROM_EMAIL not configured",
    );
    return { sent: false, skipped: "not_configured" };
  }

  let res: Response;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });
  } catch (err) {
    console.error("[email] resend request failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return { sent: false, skipped: "request_failed" };
  }

  if (!res.ok) {
    console.error("[email] resend send failed", {
      provider: "resend",
      status: res.status,
    });
    return { sent: false, skipped: `resend_${res.status}` };
  }

  const body = (await res.json().catch(() => ({}))) as { id?: string };
  return { sent: true, id: body.id ?? "unknown" };
}

// ---------------------------------------------------------------------------
// Deadline reminders — user-only, opt-in, env-gated, idempotent.
// ---------------------------------------------------------------------------

/** Shape we read off intake_json for the reminder gate. */
type ReminderIntake = {
  reminder_email?: unknown;
  reminder_opt_in?: unknown;
  reminder_whatsapp_e164?: unknown;
  reminder_whatsapp_opt_in?: unknown;
};

export type DeadlineReminderResult =
  | { outcome: "sent"; id: string }
  | { outcome: "skipped"; reason: string };

function readReminderIntake(
  caseRow: Pick<CaseRow, "intake_json">,
): ReminderIntake {
  return typeof caseRow.intake_json === "object" && caseRow.intake_json !== null
    ? (caseRow.intake_json as ReminderIntake)
    : {};
}

function isTerminal(status: CaseRow["status"]): boolean {
  return TERMINAL_STATUSES.includes(
    status as (typeof TERMINAL_STATUSES)[number],
  );
}

function buildReminderEmail(dueAt: string): {
  subject: string;
  text: string;
  html: string;
} {
  const dueLabel = new Date(dueAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const subject = "Reminder: an action on your frozen-account case is due";
  const text = [
    "Hello,",
    "",
    `A step in your account-unfreeze case was due on ${dueLabel} and still needs your attention.`,
    "Open your Unhold case to see the exact next action and keep your case moving.",
    "",
    "This is a personal reminder about your own case. Unhold never contacts your bank",
    "or anyone else on your behalf — nothing is sent without your explicit approval.",
    "",
    "If you have already handled this, you can ignore this email.",
    "",
    "— Unhold",
  ].join("\n");
  const html = `<p>Hello,</p>
<p>A step in your account-unfreeze case was due on <strong>${dueLabel}</strong> and still needs your attention. Open your Unhold case to see the exact next action and keep your case moving.</p>
<p>This is a personal reminder about your own case. Unhold never contacts your bank or anyone else on your behalf — nothing is sent without your explicit approval.</p>
<p>If you have already handled this, you can ignore this email.</p>
<p>— Unhold</p>`;
  return { subject, text, html };
}

/**
 * Send ONE deadline reminder for a case, if and only if:
 *  - the user opted in on email and/or WhatsApp (DPDP consent), AND
 *  - the case is not terminal, AND
 *  - a user-action deadline has lapsed, AND
 *  - we win the atomic claim for *this* deadline (idempotent, race-safe).
 *
 * Channels: email (Resend) and/or WhatsApp (Twilio). Never contacts banks.
 * If all configured channels fail, the claim is released for retry.
 */
export async function sendDeadlineReminderForCase(
  caseRow: Pick<
    CaseRow,
    "id" | "status" | "intake_json" | "next_user_action_due_at" | "public_id"
  >,
): Promise<DeadlineReminderResult> {
  if (isTerminal(caseRow.status)) {
    return { outcome: "skipped", reason: "terminal" };
  }

  const intake = readReminderIntake(caseRow);
  const email =
    typeof intake.reminder_email === "string"
      ? intake.reminder_email.trim()
      : "";
  const emailOptIn = intake.reminder_opt_in === true && Boolean(email);
  const wa =
    typeof intake.reminder_whatsapp_e164 === "string"
      ? intake.reminder_whatsapp_e164.trim()
      : "";
  const waOptIn = intake.reminder_whatsapp_opt_in === true && Boolean(wa);

  if (!emailOptIn && !waOptIn) {
    return { outcome: "skipped", reason: "not_opted_in" };
  }

  const dueAt = caseRow.next_user_action_due_at;
  if (!dueAt || new Date(dueAt).getTime() > Date.now()) {
    return { outcome: "skipped", reason: "not_due" };
  }

  const supabase = createAdminClient();

  // Atomically claim the right to send this deadline's reminder. Wins exactly
  // once across the cron batch and the case-tick hook — the single source of
  // truth for "already sent". Single-key jsonb_set only; never clobbers intake.
  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_reminder_send",
    {
      p_case_id: caseRow.id,
      p_due: dueAt,
    },
  );

  if (claimError) {
    // Fail closed: if we could not durably claim, do NOT send. Surface it so a
    // possible missed reminder is observable.
    console.error("[email] reminder claim failed", {
      case_id: caseRow.id,
      error: claimError.message,
    });
    return { outcome: "skipped", reason: "claim_failed" };
  }
  if (claimed !== true) {
    return { outcome: "skipped", reason: "already_sent" };
  }

  const channels: string[] = [];
  let lastId = "none";
  let anySent = false;

  if (emailOptIn) {
    const { subject, text, html } = buildReminderEmail(dueAt);
    const result = await sendEmail({ to: email, subject, text, html });
    if (result.sent) {
      anySent = true;
      channels.push("email");
      lastId = result.id;
    }
  }

  if (waOptIn) {
    const { sendWhatsApp, buildDeadlineWhatsAppBody } = await import(
      "@/lib/messaging/whatsapp"
    );
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    const caseUrl = appUrl ? `${appUrl}/cases/${caseRow.id}` : undefined;
    const body = buildDeadlineWhatsAppBody({ dueAt, caseUrl });
    const result = await sendWhatsApp({ toE164: wa, body });
    if (result.sent) {
      anySent = true;
      channels.push("whatsapp");
      lastId = result.sid;
    }
  }

  if (!anySent) {
    // Not configured / transient failure — release the claim so a later run
    // retries this exact deadline.
    const { error: releaseError } = await supabase.rpc(
      "release_reminder_send",
      {
        p_case_id: caseRow.id,
        p_due: dueAt,
      },
    );
    if (releaseError) {
      console.error("[email] reminder claim release failed", {
        case_id: caseRow.id,
        error: releaseError.message,
      });
    }
    return { outcome: "skipped", reason: "channel_send_failed" };
  }

  await appendSwarmEvent({
    case_id: caseRow.id,
    agent_role: "HUMAN_OPS",
    event_type: "deadline_reminder_sent",
    severity: "info",
    message: `Sent the user a deadline reminder (${channels.join("+")}) for their own case.`,
    automated: true,
    metadata: { due_at: dueAt, channels },
  });

  return { outcome: "sent", id: lastId };
}

/**
 * Daily batch driver — called by the reminders cron. Emails opted-in users
 * whose case action deadline has lapsed. Idempotent per deadline.
 */
export async function runEmailDeadlineReminderBatch(options?: {
  limit?: number;
}): Promise<{
  sent: number;
  skipped: number;
}> {
  const supabase = createAdminClient();
  const limit = options?.limit ?? 100;
  const now = new Date().toISOString();

  // Fetch due non-terminal cases; channel opt-in is evaluated in JS so email
  // OR WhatsApp opt-in both qualify (JSON or-filters are brittle on PostgREST).
  const { data: cases } = await supabase
    .from("cases")
    .select("id, status, intake_json, next_user_action_due_at, public_id")
    .lte("next_user_action_due_at", now)
    .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`)
    .eq("swarm_paused", false)
    .order("next_user_action_due_at", { ascending: true })
    .limit(Math.max(limit * 3, 50));

  let sent = 0;
  let skipped = 0;
  let considered = 0;
  for (const row of cases ?? []) {
    if (considered >= limit) break;
    const intake =
      typeof row.intake_json === "object" && row.intake_json !== null
        ? (row.intake_json as ReminderIntake)
        : {};
    const emailOk =
      intake.reminder_opt_in === true &&
      typeof intake.reminder_email === "string" &&
      intake.reminder_email.trim().length > 0;
    const waOk =
      intake.reminder_whatsapp_opt_in === true &&
      typeof intake.reminder_whatsapp_e164 === "string" &&
      intake.reminder_whatsapp_e164.trim().length > 0;
    if (!emailOk && !waOk) {
      skipped += 1;
      continue;
    }
    considered += 1;
    const result = await sendDeadlineReminderForCase(
      row as Pick<
        CaseRow,
        | "id"
        | "status"
        | "intake_json"
        | "next_user_action_due_at"
        | "public_id"
      >,
    );
    if (result.outcome === "sent") sent += 1;
    else skipped += 1;
  }

  return { sent, skipped };
}
