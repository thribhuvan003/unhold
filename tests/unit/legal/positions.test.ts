import { describe, expect, it } from "vitest";
import {
  BNSS_106_VS_107,
  DISPUTED_AMOUNT_RULE,
  I4C_ROLE_BOUNDARY,
  LEGAL_POSITIONS,
} from "@/lib/legal/positions";

describe("maintained legal-position safety", () => {
  it("uses the current official I4C role boundary", () => {
    expect(I4C_ROLE_BOUNDARY.currency).toBe("current");
    expect(I4C_ROLE_BOUNDARY.asOf).toBe("2026-07-14");
    expect(I4C_ROLE_BOUNDARY.sourceUrl).toBe(
      "https://cybercrime.gov.in/UploadMedia/PublicNotice.pdf",
    );
    expect(I4C_ROLE_BOUNDARY.claim).toMatch(/does not itself investigate/i);
  });

  it("does not present disputed BNSS case law as a nationwide rule", () => {
    expect(BNSS_106_VS_107.currency).toBe("contested");
    expect(BNSS_106_VS_107.claim).toMatch(/differed/i);
    expect(BNSS_106_VS_107.claim).not.toMatch(
      /cannot by themselves|needs a Section 107 order/i,
    );
  });

  it("keeps the demo position bounded to written facts", () => {
    expect(DISPUTED_AMOUNT_RULE.claim).toMatch(/confirm in writing/i);
    expect(DISPUTED_AMOUNT_RULE.claim).toMatch(/cannot determine/i);
    expect(DISPUTED_AMOUNT_RULE.claim).not.toMatch(
      /must unfreeze|only .* can release/i,
    );
  });

  it("keeps every position dated and sourced", () => {
    for (const position of LEGAL_POSITIONS) {
      expect(position.source).toBeTruthy();
      expect(position.sourceUrl).toMatch(/^https:\/\//);
      expect(position.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
