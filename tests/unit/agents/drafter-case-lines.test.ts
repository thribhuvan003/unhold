import { describe, expect, it } from "vitest";
import {
  buildCaseAwareLines,
  isDraftOverwritable,
} from "@/lib/agents/drafter/runner";
import { buildTemplateFallback } from "@/lib/agents/fallback/index";

describe("isDraftOverwritable — never clobber an approved/sent letter", () => {
  it("allows (re)writing only pre-approval drafts", () => {
    expect(isDraftOverwritable(null)).toBe(true);
    expect(isDraftOverwritable(undefined)).toBe(true);
    expect(isDraftOverwritable("draft")).toBe(true);
    expect(isDraftOverwritable("pending_approval")).toBe(true);
  });

  it("protects a letter the user has already acted on (root of the mark-sent bug)", () => {
    // A late/duplicate re-draft must not revert these back to pending_approval.
    for (const status of [
      "approved",
      "sent",
      "response_received",
      "timeout",
    ] as const) {
      expect(isDraftOverwritable(status), status).toBe(false);
    }
  });
});

describe("buildCaseAwareLines — freeze-reason-aware, factual grounding", () => {
  it("requests written facts without asserting a legal outcome for a cyber/police freeze", () => {
    const lines = buildCaseAwareLines({}, "25000", "cyber_upi_chain");
    expect(lines.LEGAL_GROUNDING).toMatch(/written freeze details/i);
    expect(lines.LEGAL_GROUNDING).not.toMatch(/BNSS|Section 107/i);
    expect(lines.DECLARATION_LINE).toMatch(
      /accurate to the best of my knowledge/i,
    );
    expect(lines.DECLARATION_LINE).not.toMatch(
      /no knowledge of any fraud|innocent/i,
    );
  });

  it("does not assert police/BNSS framing for a KYC hold the branch can fix", () => {
    const lines = buildCaseAwareLines({}, "25000", "kyc_expired");
    expect(lines.LEGAL_GROUNDING).not.toMatch(/BNSS|GRM/i);
    expect(lines.DECLARATION_LINE).not.toMatch(/fraud/i);
  });

  it("does not argue the freeze is unlawful when a court itself ordered it", () => {
    const lines = buildCaseAwareLines({}, "25000", "court_order");
    expect(lines.LEGAL_GROUNDING).toMatch(/court/i);
    expect(lines.LEGAL_GROUNDING).not.toMatch(
      /unlawful|disproportionate|arbitrary/i,
    );
    expect(lines.DECLARATION_LINE).not.toMatch(/fraud/i);
  });

  it("points to the tax/GST officer, not BNSS, for a tax attachment", () => {
    const lines = buildCaseAwareLines(
      {},
      "25000",
      "tax_gst_attachment" as never,
    );
    expect(lines.LEGAL_GROUNDING).toMatch(/tax|GST/i);
    expect(lines.LEGAL_GROUNDING).not.toMatch(/BNSS/);
  });

  it("produces genuinely different legal grounding for different freeze reasons", () => {
    const cyber = buildCaseAwareLines({}, "25000", "cyber_upi_chain");
    const kyc = buildCaseAwareLines({}, "25000", "kyc_expired");
    const court = buildCaseAwareLines({}, "25000", "court_order");
    expect(cyber.LEGAL_GROUNDING).not.toBe(kyc.LEGAL_GROUNDING);
    expect(cyber.LEGAL_GROUNDING).not.toBe(court.LEGAL_GROUNDING);
    expect(kyc.LEGAL_GROUNDING).not.toBe(court.LEGAL_GROUNDING);
  });

  it("asks for the held amount on the cyber track without a sub-₹50k promise", () => {
    const cyber = buildCaseAwareLines({}, "10000", "cyber_upi_chain");
    const court = buildCaseAwareLines({}, "10000", "court_order");
    expect(cyber.AMOUNT_RULE_LINE).toMatch(/amount currently held/i);
    expect(court.AMOUNT_RULE_LINE).not.toMatch(/MHA SOP/);
  });

  it("defaults to factual cyber-track wording when freeze reason is unknown/unset", () => {
    const lines = buildCaseAwareLines({}, "25000", null);
    expect(lines.LEGAL_GROUNDING).toMatch(/written freeze details/i);
  });

  it("never asks the branch to RELEASE funds it cannot lift (court/tax)", () => {
    // Regression: the letter used to say "Release the undisputed balance" while
    // also saying the branch cannot lift a court freeze — self-contradictory.
    const court = buildCaseAwareLines({}, "25000", "court_order");
    expect(court.L1_KEY_REQUESTS).not.toMatch(/release/i);
    expect(court.L1_KEY_REQUESTS).toMatch(/court order details/i);

    const tax = buildCaseAwareLines({}, "25000", "tax_gst_attachment" as never);
    expect(tax.L1_KEY_REQUESTS).not.toMatch(/release/i);
    expect(tax.L1_KEY_REQUESTS).toMatch(/tax\/GST notice/i);

    // Cyber: request facts and the next authority; never an asserted release outcome.
    const cyber = buildCaseAwareLines({}, "25000", "cyber_upi_chain");
    expect(cyber.L1_KEY_REQUESTS).not.toMatch(
      /release the undisputed balance/i,
    );
    expect(cyber.L1_KEY_REQUESTS).toMatch(
      /confirm whether the amount currently held/i,
    );
    expect(cyber.L1_KEY_REQUESTS).toMatch(/investigating authority/i);
    expect(cyber.L1_KEY_REQUESTS).toMatch(/formal grievance/i);
  });

  it('only claims "proof of legitimate funds" on the cyber track', () => {
    expect(
      buildCaseAwareLines({}, "25000", "cyber_upi_chain").ATTACHMENTS_LINE,
    ).toMatch(/proof of legitimate funds/i);
    expect(
      buildCaseAwareLines({}, "25000", "kyc_expired").ATTACHMENTS_LINE,
    ).not.toMatch(/proof of legitimate funds/i);
    expect(
      buildCaseAwareLines({}, "25000", "court_order").ATTACHMENTS_LINE,
    ).not.toMatch(/proof of legitimate funds/i);
  });

  it("changes the factual description and situation without inventing facts", () => {
    const total = buildCaseAwareLines(
      { freeze_type_hint: "total_freeze", user_role: "receiver" },
      "1800",
      "cyber_upi_chain",
    );
    const lien = buildCaseAwareLines(
      { freeze_type_hint: "partial_lien", user_role: "sender" },
      "1800",
      "cyber_upi_chain",
    );
    expect(total.FREEZE_DESCRIPTION).toMatch(/total freeze/i);
    expect(lien.FREEZE_DESCRIPTION).toMatch(/part of my balance/i);
    expect(total.SITUATION_LINE).toMatch(/did not expect was credited/i);
    expect(lien.SITUATION_LINE).toMatch(/made a payment/i);
    expect(total.SITUATION_LINE).not.toBe(lien.SITUATION_LINE);
  });

  it("renders an NCRP clause only when the user supplied a reference", () => {
    expect(
      buildCaseAwareLines({}, "1800", "cyber_upi_chain").NCRP_REFERENCE_LINE,
    ).toBe("");
    expect(
      buildCaseAwareLines({}, "1800", "cyber_upi_chain", "30912345678901")
        .NCRP_REFERENCE_LINE,
    ).toBe(" (NCRP reference 30912345678901)");
  });

  it("keeps missing facts visible as review gates but never makes NCRP mandatory", () => {
    const draft = buildTemplateFallback("L1", {
      TODAY_DATE: "2026-07-06",
      USER_NAME: "Asha Rao",
      ACCOUNT_LAST4: "4417",
      AMOUNT_INR: "1800",
      FREEZE_DATE: "2026-06-20",
      USER_PHONE: "9876500000",
      ...buildCaseAwareLines(
        { freeze_type_hint: "total_freeze", user_role: "receiver" },
        "1800",
        "cyber_upi_chain",
      ),
    });
    expect(draft.placeholders_missing).toEqual(
      expect.arrayContaining(["USER_ADDRESS", "BANK_NAME", "BRANCH_CITY"]),
    );
    expect(draft.placeholders_missing).not.toContain("NCRP_ID");
    expect(draft.body).not.toContain("NCRP reference __________");
    expect(draft.body).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
  });

  it("produces distinct escalation outputs from the same verified facts", () => {
    const values = {
      TODAY_DATE: "2026-07-06",
      USER_NAME: "Asha Rao",
      USER_ADDRESS: "Bengaluru",
      USER_PHONE: "9876500000",
      BANK_NAME: "State Bank of India",
      BRANCH_CITY: "Bengaluru",
      ACCOUNT_LAST4: "4417",
      AMOUNT_INR: "1800",
      FREEZE_DATE: "2026-06-20",
      NODAL_EMAIL: "nodal@example.invalid",
      L1_SENT_DATE: "2026-06-21",
      L2_SENT_DATE: "2026-07-01",
      ...buildCaseAwareLines(
        { freeze_type_hint: "total_freeze", user_role: "receiver" },
        "1800",
        "cyber_upi_chain",
        "30912345678901",
      ),
    };
    const drafts = (["L1", "L2", "L3"] as const).map((level) =>
      buildTemplateFallback(level, values),
    );
    expect(new Set(drafts.map((draft) => draft.template_slug)).size).toBe(3);
    expect(drafts[0].body).toMatch(/Branch Manager/);
    expect(drafts[1].body).toMatch(/Nodal Officer/);
    expect(drafts[2].body).toMatch(/RBI Banking Ombudsman|RBI CMS/);
    expect(
      drafts.every((draft) => draft.placeholders_missing.length === 0),
    ).toBe(true);
  });
});
