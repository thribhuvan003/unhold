import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("sendSms provider redaction", () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "secret";
    process.env.TWILIO_SMS_FROM = "+15551234567";
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("does not read or log Twilio response bodies on failure", async () => {
    const text = vi.fn(async () => "sensitive provider detail");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, text }),
    );
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { sendSms } = await import("@/lib/messaging/sms");

    const result = await sendSms("+917893238850", "hello");

    expect(result).toEqual({ sent: false, skipped: "twilio_400" });
    expect(text).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("[sms] send failed", {
      provider: "twilio",
      status: 400,
    });
    errorSpy.mockRestore();
  });
});
