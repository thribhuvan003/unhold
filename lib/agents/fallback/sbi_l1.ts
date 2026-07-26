/** Bank-agnostic branch grievance template (slug kept stable for drafts already stored). */
export const SBI_L1_TEMPLATE_SLUG = "branch_lien_release";
/** @deprecated alias — same as SBI_L1_TEMPLATE_SLUG */
export const L1_TEMPLATE_SLUG = SBI_L1_TEMPLATE_SLUG;

export const SBI_L1_SUBJECT =
  "Request for written restriction details and review — A/c No. XXXXXX{{ACCOUNT_LAST4}}";

export const SBI_L1_BODY = `Date: {{TODAY_DATE}}

From: {{USER_NAME}}
{{USER_ADDRESS}}
Phone: {{USER_PHONE}}

To,
The Branch Manager
{{BANK_NAME}}
{{BRANCH_CITY}} Branch

Subject: Request for written restriction details and review — A/c No. XXXXXX{{ACCOUNT_LAST4}}

Respected Sir / Madam,

I hold savings account XXXXXX{{ACCOUNT_LAST4}} at your branch. On or around {{FREEZE_DATE}}, it was placed under {{FREEZE_DESCRIPTION}}{{NCRP_REFERENCE_LINE}}. The amount currently shown as affected is approximately Rs. {{AMOUNT_INR}}.

{{SITUATION_LINE}}

Please:
1. Confirm in writing the amount, type and scope of the restriction; the authority and legal basis communicated to the bank; the FIR/NCRP reference, if any; and the authority’s official contact.
{{L1_KEY_REQUESTS}}

{{LEGAL_GROUNDING}}

I attach {{ATTACHMENTS_LINE}}. {{DECLARATION_LINE}}

Please acknowledge receipt with a stamped copy or grievance reference number.

Yours faithfully,
{{USER_NAME}}
Phone: {{USER_PHONE}}
Date: {{TODAY_DATE}}`;

export const SBI_L1_REQUIRED_PLACEHOLDERS = [
  "USER_NAME",
  "USER_ADDRESS",
  "BANK_NAME",
  "BRANCH_CITY",
  "ACCOUNT_LAST4",
  "AMOUNT_INR",
  "FREEZE_DATE",
  // NCRP_ID is intentionally NOT required: a freeze often precedes filing on
  // NCRP, and the intake calls it optional ("if you have one"). Requiring it
  // wrongly locked sending for users without a complaint number.
  "USER_PHONE",
] as const;
