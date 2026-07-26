import { describe, expect, it } from "vitest";
import { getClientRateLimitFingerprint } from "@/lib/ratelimit";

describe("getClientRateLimitFingerprint", () => {
  it("is stable, opaque, and changes for a different client IP", () => {
    const first = getClientRateLimitFingerprint(
      new Request("https://unhold.example", {
        headers: { "x-real-ip": "203.0.113.9" },
      }),
    );
    const same = getClientRateLimitFingerprint(
      new Request("https://unhold.example", {
        headers: { "x-real-ip": "203.0.113.9" },
      }),
    );
    const different = getClientRateLimitFingerprint(
      new Request("https://unhold.example", {
        headers: { "x-real-ip": "203.0.113.10" },
      }),
    );

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(same);
    expect(first).not.toBe(different);
    expect(first).not.toContain("203.0.113.9");
  });
});
