/**
 * Core legal positions Unhold relies on, each with a source and an HONEST
 * currency tag. This is the "beats ChatGPT" substance: a general model states
 * these from a frozen, pre-2026 training cutoff and cannot flag what is now
 * contested; here every claim carries where it came from and whether it is
 * settled or under appeal.
 *
 * Sourced from current primary material where available (latest review
 * 2026-07-14). RULE: no position enters this file without a source, and a
 * claim that is contested/under appeal MUST be tagged 'contested' — never shown
 * as settled law.
 */

export type LegalCurrency = "current" | "contested" | "caution";

export type LegalPosition = {
  id: string;
  /** The user-facing claim, in plain language. */
  claim: string;
  /** Human-readable source label (statute / SOP / court + date). */
  source: string;
  /** Link to an authoritative page for the source. */
  sourceUrl: string;
  /** 'current' = settled/in force; 'contested' = under active appeal, do not present as settled. */
  currency: LegalCurrency;
  /** As-of date for the currency judgement (ISO). */
  asOf: string;
  /** Optional nuance shown alongside the badge (e.g. the appeal status). */
  note?: string;
  /**
   * Reviewed Hindi rendering of `claim` — an explanation of the SAME claim,
   * never a new one. The English `claim` stays the citable text.
   */
  claimHi?: string;
  /** Reviewed Hindi rendering of `note`, with the same honesty about currency. */
  noteHi?: string;
};

/** A bounded, official-source-backed user action; never a legal conclusion. */
export const DISPUTED_AMOUNT_RULE: LegalPosition = {
  id: "disputed_amount_only",
  claim:
    "Ask your bank to confirm in writing the amount under hold, the authority that ordered it, and the reference number. Unhold cannot determine whether a restriction is lawful in your individual case.",
  source:
    "I4C/MHA public notice on who decides a bank restriction, reviewed 14-Jul-2026",
  sourceUrl: "https://cybercrime.gov.in/UploadMedia/PublicNotice.pdf",
  currency: "caution",
  asOf: "2026-07-14",
  note: "I4C states that it manages NCRP infrastructure and does not itself lien-mark or freeze accounts. The decision may come from the relevant investigating officer or from the bank under applicable rules, so the written record must be checked before choosing a route.",
  claimHi:
    "अपने बैंक से लिखित में रोक की रकम, रोक लगाने वाले प्राधिकरण और संदर्भ नंबर की पुष्टि माँगें। Unhold आपके व्यक्तिगत मामले में यह तय नहीं कर सकता कि रोक कानूनी है या नहीं।",
  noteHi:
    "I4C के अनुसार वह NCRP का तकनीकी ढाँचा चलाता है, लेकिन खाता फ्रीज़ करने का फैसला खुद नहीं करता। फैसला संबंधित जाँच अधिकारी या लागू नियमों के तहत बैंक से आ सकता है, इसलिए सही रास्ता चुनने से पहले लिखित रिकॉर्ड जाँचें।",
};

/** The current official role boundary prevents a common routing error. */
export const I4C_ROLE_BOUNDARY: LegalPosition = {
  id: "i4c_role_boundary",
  claim:
    "I4C operates the NCRP technical infrastructure; it does not itself investigate a complaint or decide to freeze a bank account.",
  source: "I4C/MHA public notice, reviewed 14-Jul-2026",
  sourceUrl: "https://cybercrime.gov.in/UploadMedia/PublicNotice.pdf",
  currency: "current",
  asOf: "2026-07-14",
  note: "The notice says investigation is handled by the relevant State/UT law-enforcement agency, while a restriction decision may be taken by the investigating officer or by bank officials under applicable RBI rules.",
  claimHi:
    "I4C NCRP का तकनीकी ढाँचा चलाता है; वह खुद शिकायत की जाँच या बैंक खाता फ्रीज़ करने का फैसला नहीं करता।",
  noteHi:
    "नोटिस के अनुसार जाँच संबंधित राज्य/केंद्रशासित प्रदेश की कानून-प्रवर्तन एजेंसी करती है; रोक का फैसला जाँच अधिकारी या लागू RBI नियमों के तहत बैंक अधिकारी ले सकते हैं।",
};

/** BNSS 106 (seizure) vs 107 (Magistrate attachment) — the statutory structure. */
export const BNSS_106_VS_107: LegalPosition = {
  id: "bnss_106_vs_107",
  claim:
    "Recent court decisions have differed on how BNSS Sections 106 and 107 apply to bank-account restrictions; Unhold does not treat one decision as a nationwide rule.",
  source: "BNSS 2023, ss. 106–107 and recent High Court decisions",
  sourceUrl:
    "https://www.scconline.com/blog/post/2025/12/01/investigating-agency-cannot-debit-freeze-account-u-s-106-bnss-bom-hc/",
  currency: "contested",
  asOf: "2026-07-14",
  note: "A qualified lawyer must check the exact order, jurisdiction, facts, later appellate history, and current law before relying on a particular judgment.",
  claimHi:
    "हाल के न्यायालयी फैसलों में BNSS धारा 106 और 107 को बैंक खाते की रोक पर लागू करने को लेकर अलग-अलग विचार हैं; Unhold किसी एक फैसले को पूरे भारत का तय नियम नहीं मानता।",
  noteHi:
    "किसी फैसले पर भरोसा करने से पहले योग्य वकील को आदेश, क्षेत्राधिकार, तथ्य, आगे की अपील और मौजूदा कानून जाँचना चाहिए।",
};

/** HC rulings that blanket freezes are unlawful — real, but under SC appeal. */
export const BLANKET_FREEZE_RULINGS: LegalPosition = {
  id: "blanket_freeze_hc",
  claim:
    "Recent Bombay and Delhi High Court decisions questioned blanket restrictions in their particular cases; they do not let Unhold decide another restriction’s lawfulness.",
  source:
    "Bombay HC, Kartik Chatur (20-Nov-2025); Delhi HC, Malabar Gold (16-Jan-2026)",
  sourceUrl:
    "https://www.scconline.com/blog/post/2026/02/03/del-hc-on-legality-of-bank-account-freezing-under-bnss/",
  currency: "contested",
  asOf: "2026-07-14",
  note: 'Verified against the primary judgments, but the Supreme Court (suo motu, 01-Dec-2025) ordered both appealed and separately allowed freezing "with or without FIR" — so cite them as recent High Court holdings, not settled law.',
  claimHi:
    "हाल के Bombay और Delhi High Court फैसलों ने अपने-अपने मामलों में पूरे खाते पर रोक पर सवाल उठाया; इनसे Unhold किसी दूसरे मामले की रोक को कानूनी या गैर-कानूनी तय नहीं कर सकता।",
  noteHi:
    'ये फैसले मूल निर्णयों से सत्यापित हैं, लेकिन यह मामला अभी Supreme Court में अपील के अधीन है — Supreme Court ने (suo motu यानी स्वतः संज्ञान, 01-Dec-2025) दोनों फैसलों के खिलाफ अपील का आदेश दिया और अलग से "FIR के साथ या बिना" खाता फ्रीज़ करने की अनुमति दी। इसलिए इन्हें High Court के हाल के फैसलों के तौर पर उद्धृत करें, तय कानून के तौर पर नहीं।',
};

export const LEGAL_POSITIONS: LegalPosition[] = [
  DISPUTED_AMOUNT_RULE,
  I4C_ROLE_BOUNDARY,
  BNSS_106_VS_107,
  BLANKET_FREEZE_RULINGS,
];

export function getLegalPosition(id: string): LegalPosition | undefined {
  return LEGAL_POSITIONS.find((p) => p.id === id);
}
