import {
  SBI_L1_BODY,
  SBI_L1_REQUIRED_PLACEHOLDERS,
  SBI_L1_SUBJECT,
  SBI_L1_TEMPLATE_SLUG,
} from "@/lib/agents/fallback/sbi_l1";
import {
  SBI_L2_BODY,
  SBI_L2_REQUIRED_PLACEHOLDERS,
  SBI_L2_SUBJECT,
  SBI_L2_TEMPLATE_SLUG,
} from "@/lib/agents/fallback/sbi_l2";
import {
  SBI_L3_BODY,
  SBI_L3_REQUIRED_PLACEHOLDERS,
  SBI_L3_SUBJECT,
  SBI_L3_TEMPLATE_SLUG,
} from "@/lib/agents/fallback/sbi_l3";
import type { LetterDraftOutput } from "@/lib/agents/schemas";
import { LETTER_DISCLAIMER } from "@/lib/constants/disclaimers";

export type TemplateLevel = "L1" | "L2" | "L3";

type TemplateDef = {
  slug: string;
  subject: string;
  body: string;
  required: readonly string[];
};

const TEMPLATES: Record<TemplateLevel, TemplateDef> = {
  L1: {
    slug: SBI_L1_TEMPLATE_SLUG,
    subject: SBI_L1_SUBJECT,
    body: SBI_L1_BODY,
    required: SBI_L1_REQUIRED_PLACEHOLDERS,
  },
  L2: {
    slug: SBI_L2_TEMPLATE_SLUG,
    subject: SBI_L2_SUBJECT,
    body: SBI_L2_BODY,
    required: SBI_L2_REQUIRED_PLACEHOLDERS,
  },
  L3: {
    slug: SBI_L3_TEMPLATE_SLUG,
    subject: SBI_L3_SUBJECT,
    body: SBI_L3_BODY,
    required: SBI_L3_REQUIRED_PLACEHOLDERS,
  },
};

// Plain labels for any field the user hasn't filled yet, so the letter shows a
// clean fill-in blank ("__________ (your address)") instead of a raw {{TOKEN}}
// that a stressed user might copy and send to their bank as-is.
const BLANK_LABELS: Record<string, string> = {
  USER_NAME: "your name",
  USER_ADDRESS: "your address",
  USER_PHONE: "your phone",
  BANK_NAME: "your bank",
  BRANCH_CITY: "your branch city",
  ACCOUNT_LAST4: "last 4 digits",
  FREEZE_DATE: "freeze date",
  AMOUNT_INR: "amount",
  NCRP_ID: "NCRP number, if any",
  NODAL_EMAIL: "nodal officer email",
  L1_SENT_DATE: "date you sent Letter 1",
  L2_SENT_DATE: "date you sent Letter 2",
};

function fillTemplate(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const v = values[key];
    // A missing optional complaint reference should remove its whole clause,
    // never print a blank token or block the draft.
    if (key === "NCRP_REFERENCE_LINE") return v ?? "";
    if (v) return v;
    const label = BLANK_LABELS[key];
    return label ? `__________ (${label})` : "__________";
  });
}

export function buildTemplateFallback(
  level: TemplateLevel,
  values: Record<string, string>,
  options?: { confidence?: number; proofGateBlocked?: boolean },
): LetterDraftOutput {
  const template = TEMPLATES[level];
  const placeholders_used: string[] = [];
  const placeholders_missing: string[] = [];

  for (const key of template.required) {
    if (values[key]) placeholders_used.push(key);
    else placeholders_missing.push(key);
  }

  if (options?.proofGateBlocked) {
    placeholders_missing.push(`PROOF_GATE_${level}`);
  }

  const confidence =
    options?.proofGateBlocked === true
      ? 0.2
      : (options?.confidence ??
        (placeholders_missing.length === 0 ? 0.75 : 0.55));

  return {
    subject: fillTemplate(template.subject, values),
    body: fillTemplate(template.body, values),
    level,
    template_slug: template.slug,
    placeholders_used,
    placeholders_missing,
    confidence,
    disclaimer_block: LETTER_DISCLAIMER,
    language: "en",
  };
}
