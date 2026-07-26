import { describe, expect, it } from "vitest";
import { getUnfreezePath } from "@/lib/case/unfreeze-path";

describe("getUnfreezePath", () => {
  it("cyber restriction: starts with written amount, authority and reference details", () => {
    const path = getUnfreezePath("cyber_upi_chain");
    expect(path.track).toBe("cyber");
    expect(path.branchCanFix).toBe(false);
    expect(path.headline).toMatch(/confirm who ordered/i);
    expect(path.keyStep).toMatch(/authority reference in writing/i);
    expect(path.steps).toHaveLength(4);
    expect(path.steps[1].detail).toMatch(/authority/i);
    expect(path.steps[1].detail).not.toMatch(
      /guarantee|automatic|15 days|NOC/i,
    );
  });

  it("KYC hold: confirms the classification before recommending re-KYC", () => {
    const path = getUnfreezePath("kyc_expired");
    expect(path.track).toBe("branch");
    expect(path.branchCanFix).toBe(true);
    expect(path.headline).toMatch(/confirm that with your bank/i);
    expect(path.keyStep).toMatch(/confirm the reason/i);
  });

  it("court and tax freezes: branch cannot fix; routes to the right authority", () => {
    expect(getUnfreezePath("court_order").track).toBe("court");
    expect(getUnfreezePath("court_order").branchCanFix).toBe(false);
    expect(getUnfreezePath("tax_gst_attachment").track).toBe("tax");
    expect(getUnfreezePath("tax_gst_attachment").branchCanFix).toBe(false);
  });

  it("unknown reason defaults to the cautious written-authority path", () => {
    const path = getUnfreezePath(null);
    expect(path.track).toBe("cyber");
    expect(path.branchCanFix).toBe(false);
  });
});
