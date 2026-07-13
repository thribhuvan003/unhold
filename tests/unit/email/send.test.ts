import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/swarm/append-event", () => ({
  appendSwarmEvent: vi.fn().mockResolvedValue("event-id"),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { appendSwarmEvent } from "@/lib/swarm/append-event";
import { sendEmail, sendDeadlineReminderForCase } from "@/lib/email/send";

const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

/**
 * Fake admin client whose rpc() arbitrates the atomic claim. `claim` is the
 * boolean the DB would return for claim_reminder_send (true = we won).
 */
function mockAdmin(opts?: {
  claim?: boolean;
  claimError?: { message: string };
  releaseError?: { message: string };
}) {
  const rpc = vi.fn((fn: string) => {
    if (fn === "claim_reminder_send") {
      return Promise.resolve({
        data: opts?.claim ?? true,
        error: opts?.claimError ?? null,
      });
    }
    if (fn === "release_reminder_send") {
      return Promise.resolve({ data: null, error: opts?.releaseError ?? null });
    }
    return Promise.resolve({ data: null, error: null });
  });
  return { client: { rpc } as never, rpc };
}

function okFetch(id = "email-123") {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id }),
    text: async () => "",
  });
}

const baseCase = {
  id: "case-1",
  public_id: "LL-10001",
  status: "monitoring" as const,
  next_user_action_due_at: PAST,
  intake_json: { reminder_email: "user@example.com", reminder_opt_in: true },
};

describe("sendEmail (env gate)", () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("no-ops (never throws) when RESEND_API_KEY is unset", async () => {
    process.env.RESEND_FROM_EMAIL = "noreply@unhold.app";
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({ to: "a@b.com", subject: "s", text: "t" });

    expect(result).toEqual({ sent: false, skipped: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no-ops when RESEND_FROM_EMAIL is unset", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({ to: "a@b.com", subject: "s", text: "t" });

    expect(result).toEqual({ sent: false, skipped: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends via Resend when both env vars are set (key never in URL)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "noreply@unhold.app";
    const fetchMock = okFetch("id-999");
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({ to: "a@b.com", subject: "s", text: "t" });

    expect(result).toEqual({ sent: true, id: "id-999" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-key",
    );
  });

  it("does not read or log provider response bodies on failure", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "noreply@unhold.app";
    const text = vi.fn(async () => "sensitive provider detail");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, text }),
    );
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await sendEmail({ to: "a@b.com", subject: "s", text: "t" });

    expect(result).toEqual({ sent: false, skipped: "resend_400" });
    expect(text).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("[email] resend send failed", {
      provider: "resend",
      status: 400,
    });
    errorSpy.mockRestore();
  });
});

describe("sendDeadlineReminderForCase (opt-in gate + atomic claim)", () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "noreply@unhold.app";
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("skips (no claim, no send) when the user has NOT opted in", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { client, rpc } = mockAdmin();
    vi.mocked(createAdminClient).mockReturnValue(client);

    const result = await sendDeadlineReminderForCase({
      ...baseCase,
      intake_json: {
        reminder_email: "user@example.com",
        reminder_opt_in: false,
      },
    });

    expect(result).toEqual({ outcome: "skipped", reason: "not_opted_in" });
    expect(rpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips when no email on file even if opt_in is true", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { client, rpc } = mockAdmin();
    vi.mocked(createAdminClient).mockReturnValue(client);

    const result = await sendDeadlineReminderForCase({
      ...baseCase,
      intake_json: { reminder_opt_in: true },
    });

    expect(result).toEqual({ outcome: "skipped", reason: "not_opted_in" });
    expect(rpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips when the deadline has not lapsed yet", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { client, rpc } = mockAdmin();
    vi.mocked(createAdminClient).mockReturnValue(client);

    const result = await sendDeadlineReminderForCase({
      ...baseCase,
      next_user_action_due_at: FUTURE,
    });

    expect(result).toEqual({ outcome: "skipped", reason: "not_due" });
    expect(rpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("claim WINS once: sends exactly one reminder and records a swarm event", async () => {
    const fetchMock = okFetch("sent-1");
    vi.stubGlobal("fetch", fetchMock);
    const { client, rpc } = mockAdmin({ claim: true });
    vi.mocked(createAdminClient).mockReturnValue(client);

    const result = await sendDeadlineReminderForCase(baseCase);

    expect(result).toEqual({ outcome: "sent", id: "sent-1" });
    expect(rpc).toHaveBeenCalledWith("claim_reminder_send", {
      p_case_id: "case-1",
      p_due: PAST,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    // Won the claim → never releases it.
    expect(rpc).not.toHaveBeenCalledWith(
      "release_reminder_send",
      expect.anything(),
    );
    expect(appendSwarmEvent).toHaveBeenCalledOnce();
  });

  it("claim LOST: a second caller does not send (idempotent, race-safe)", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { client } = mockAdmin({ claim: false });
    vi.mocked(createAdminClient).mockReturnValue(client);

    const result = await sendDeadlineReminderForCase(baseCase);

    expect(result).toEqual({ outcome: "skipped", reason: "already_sent" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(appendSwarmEvent).not.toHaveBeenCalled();
  });

  it("fails closed when the claim errors (never sends without a durable claim)", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { client } = mockAdmin({ claimError: { message: "db down" } });
    vi.mocked(createAdminClient).mockReturnValue(client);

    const result = await sendDeadlineReminderForCase(baseCase);

    expect(result).toEqual({ outcome: "skipped", reason: "claim_failed" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(appendSwarmEvent).not.toHaveBeenCalled();
  });

  it("RELEASES the claim when the send fails, so a later run retries", async () => {
    delete process.env.RESEND_API_KEY; // send becomes a not_configured no-op
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { client, rpc } = mockAdmin({ claim: true });
    vi.mocked(createAdminClient).mockReturnValue(client);

    const result = await sendDeadlineReminderForCase(baseCase);

    expect(result).toEqual({
      outcome: "skipped",
      reason: "channel_send_failed",
    });
    expect(rpc).toHaveBeenCalledWith("claim_reminder_send", {
      p_case_id: "case-1",
      p_due: PAST,
    });
    expect(rpc).toHaveBeenCalledWith("release_reminder_send", {
      p_case_id: "case-1",
      p_due: PAST,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(appendSwarmEvent).not.toHaveBeenCalled();
  });
});
