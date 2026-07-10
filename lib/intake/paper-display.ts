import type { Database } from '@/supabase/database.types';
import { getDocumentChecklist, getFreezeReasonLabel } from '@/lib/intake/document-checklist';

type FreezeReason = Database['public']['Enums']['freeze_reason'];

/** One uploadable paper, ready to render in the checklist. */
export type PaperDocDef = {
  /** evidence_type — the upload slot key. */
  type: string;
  label: string;
  why: string;
  /** "bank calls this: …" chip (optional). */
  term?: string;
  /** grammar for the "doesn't look like {article} {kindLabel}" message. */
  article: string;
  kindLabel: string;
};

/**
 * Display metadata per evidence_type. The reason-aware checklist
 * (getDocumentChecklist) decides WHICH papers to ask for; this decides how each
 * one is shown. Only types with an entry here get an upload card.
 */
const DISPLAY: Record<string, Omit<PaperDocDef, 'why'>> = {
  freeze_sms: { type: 'freeze_sms', label: 'Freeze SMS or notice', term: 'freeze intimation', article: 'a', kindLabel: 'freeze SMS or notice' },
  bank_statement: { type: 'bank_statement', label: 'Bank statement', term: 'lien entry', article: 'a', kindLabel: 'bank statement' },
  pan_card: { type: 'pan_card', label: 'PAN card — hide the middle numbers', term: 'masked PAN', article: 'a', kindLabel: 'PAN card' },
  aadhaar_masked: { type: 'aadhaar_masked', label: 'Aadhaar — hide the middle 8 numbers', term: 'masked Aadhaar', article: 'an', kindLabel: 'Aadhaar card' },
  passbook_screenshot: { type: 'passbook_screenshot', label: 'Passbook / account details page', term: 'passbook', article: 'a', kindLabel: 'passbook page' },
  ncrp_acknowledgement: { type: 'ncrp_acknowledgement', label: 'Cybercrime complaint receipt (NCRP)', article: 'an', kindLabel: 'NCRP receipt' },
  police_fir: { type: 'police_fir', label: 'Police FIR / notice copy', article: 'a', kindLabel: 'police FIR or notice' },
  chat_screenshot: { type: 'chat_screenshot', label: 'Chat or payment screenshots', article: 'a', kindLabel: 'chat or payment screenshot' },
  court_order: { type: 'court_order', label: 'Court order / notice copy', article: 'a', kindLabel: 'court order' },
};

/** bank_statement is useful for every freeze (proves your balance + honest
 * credits) and anchors the letter-unlock gate, so it's always shown as core. */
const ALWAYS_CORE = ['freeze_sms', 'bank_statement', 'pan_card'];

export type ReasonPapers = {
  core: PaperDocDef[];
  extras: PaperDocDef[];
  /** e.g. "Cyber / UPI fraud freeze" — shown as a banner, or null when unknown. */
  reasonLabel: string | null;
};

/**
 * The core + optional papers to ask for, adapted to the freeze reason. Different
 * freezes genuinely need different papers (a KYC freeze needs Aadhaar; a court
 * freeze needs the order) — this is what makes the checklist stop being "the
 * same 3 every time".
 *
 * `locale` follows the getUnfreezePath pattern: 'hi' localizes the display
 * strings (label / why / kindLabel / reasonLabel); English stays the source of
 * truth, and an untranslated string falls back to English rather than going
 * stale. `term` (the bank's official word) intentionally stays in English —
 * that chip exists to show what the bank calls the document.
 */
export function papersForReason(reason: FreezeReason | null | undefined, locale = 'en'): ReasonPapers {
  const items = getDocumentChecklist(reason);
  const seen = new Set<string>();
  const core: PaperDocDef[] = [];
  const extras: PaperDocDef[] = [];

  const push = (evidenceType: string, why: string, required: boolean) => {
    const meta = DISPLAY[evidenceType];
    if (!meta || seen.has(evidenceType)) return;
    seen.add(evidenceType);
    const def: PaperDocDef = { ...meta, why };
    (required || ALWAYS_CORE.includes(evidenceType) ? core : extras).push(def);
  };

  for (const item of items) push(item.evidence_type, item.why, item.required);
  // Guarantee the universal core is present even if a checklist omits one.
  for (const t of ALWAYS_CORE) {
    if (!seen.has(t)) push(t, DEFAULT_WHY[t] ?? 'Helps prove your case.', true);
  }

  if (locale !== 'hi') {
    return { core, extras, reasonLabel: getFreezeReasonLabel(reason) };
  }
  const localize = (d: PaperDocDef): PaperDocDef => ({
    ...d,
    label: HI_LABEL[d.type] ?? d.label,
    kindLabel: HI_KIND[d.type] ?? d.kindLabel,
    why: HI_WHY[d.why] ?? d.why,
  });
  const enReason = getFreezeReasonLabel(reason);
  return {
    core: core.map(localize),
    extras: extras.map(localize),
    reasonLabel: reason && enReason ? (HI_REASON[reason] ?? enReason) : null,
  };
}

// ── Hindi display strings ───────────────────────────────────────────────────
// Reviewed plain Hindi (आप-form, खाता not अकाउंट, acronyms kept in Latin).
// HI_WHY is keyed by the English sentence so an English edit can never surface
// a stale Hindi translation — it falls back to English instead.

const HI_LABEL: Record<string, string> = {
  freeze_sms: 'फ्रीज़ का SMS या नोटिस',
  bank_statement: 'बैंक स्टेटमेंट',
  pan_card: 'PAN कार्ड — बीच के अंक छिपा लें',
  aadhaar_masked: 'आधार — बीच के 8 अंक छिपा लें',
  passbook_screenshot: 'पासबुक / खाते के विवरण वाला पेज',
  ncrp_acknowledgement: 'साइबर क्राइम शिकायत रसीद (NCRP)',
  police_fir: 'पुलिस FIR / नोटिस की कॉपी',
  chat_screenshot: 'चैट या पेमेंट के स्क्रीनशॉट',
  court_order: 'अदालत के आदेश / नोटिस की कॉपी',
};

const HI_KIND: Record<string, string> = {
  freeze_sms: 'फ्रीज़ SMS या नोटिस',
  bank_statement: 'बैंक स्टेटमेंट',
  pan_card: 'PAN कार्ड',
  aadhaar_masked: 'आधार कार्ड',
  passbook_screenshot: 'पासबुक पेज',
  ncrp_acknowledgement: 'NCRP रसीद',
  police_fir: 'पुलिस FIR या नोटिस',
  chat_screenshot: 'चैट या पेमेंट स्क्रीनशॉट',
  court_order: 'अदालती आदेश',
};

const HI_WHY: Record<string, string> = {
  'Shows the date and exact wording of the freeze — the starting point for any letter.':
    'दिखाता है कि फ्रीज़ कब और किन शब्दों में हुआ — किसी भी पत्र की शुरुआत यहीं से होती है।',
  'Proves the amount held and where the funds came from.':
    'साबित करता है कि कितनी रकम रोकी गई और पैसा कहाँ से आया।',
  'Confirms your identity to the bank. Upload a masked copy.':
    'बैंक को आपकी पहचान की पुष्टि करता है। बीच के अंक छिपाकर अपलोड करें।',
  'If you filed on cybercrime.gov.in, this links your case to the investigation.':
    'अगर आपने cybercrime.gov.in पर शिकायत की है, तो यह आपके केस को जाँच से जोड़ती है।',
  'Helps show the incoming payment was unsolicited or legitimate.':
    'यह दिखाने में मदद करता है कि आया हुआ पैसा बिना माँगे आया था या सही था।',
  'Counters the suspicion that your account was used to move fraud funds.':
    'इस शक का जवाब देता है कि आपके खाते से धोखाधड़ी का पैसा भेजा गया।',
  'KYC freezes usually lift once identity/address documents are re-verified.':
    'पहचान/पते के दस्तावेज़ दोबारा जाँचते ही KYC फ्रीज़ आमतौर पर हट जाता है।',
  'Helps the branch match your re-KYC to the account.':
    'शाखा को आपकी re-KYC खाते से मिलाने में मदद करता है।',
  'The attachment usually references a tax demand — the order shows what is required.':
    'कुर्की में आमतौर पर टैक्स की माँग का हवाला होता है — आदेश बताता है कि क्या चाहिए।',
  'The bank acts on the order — you need its details to respond correctly.':
    'बैंक आदेश पर ही काम करता है — सही जवाब देने के लिए आपको उसका विवरण चाहिए।',
  'BNSS 106 freezes stem from a police request — the notice shows what they need.':
    'BNSS 106 फ्रीज़ पुलिस के अनुरोध से होता है — नोटिस बताता है कि उन्हें क्या चाहिए।',
  'A suspicious-transaction-report freeze lifts when the activity is explained.':
    'संदिग्ध-लेनदेन रिपोर्ट वाला फ्रीज़ लेनदेन समझा देने पर हट जाता है।',
  'Helps the branch tie the hold to the specific cheque.':
    'शाखा को रोक उस खास चेक से जोड़ने में मदद करता है।',
  'Releasing funds in a nomination dispute needs proof of entitlement.':
    'नामांकन विवाद में पैसा छोड़ने के लिए हक़ का सबूत चाहिए।',
  'Shows when and how the bank froze it — the starting point for any letter.':
    'दिखाता है कि बैंक ने कब और कैसे फ्रीज़ किया — किसी भी पत्र की शुरुआत यहीं से।',
  'Shows the blocked amount and that your money came in honestly.':
    'रोकी गई रकम दिखाता है और यह भी कि आपका पैसा ईमानदारी से आया।',
  'Proves who you are to the bank.': 'बैंक को साबित करता है कि आप कौन हैं।',
  'Helps prove your case.': 'आपका केस साबित करने में मदद करता है।',
};

const HI_REASON: Record<string, string> = {
  cyber_upi_chain: 'साइबर / UPI धोखाधड़ी फ्रीज़',
  suspected_mule: 'खाते के दुरुपयोग का शक (आप पर आरोप नहीं)',
  kyc_expired: 'KYC / सत्यापन फ्रीज़',
  tax_gst_attachment: 'टैक्स / GST कुर्की',
  court_order: 'अदालत का आदेश',
  police_notice_bnss106: 'पुलिस नोटिस (BNSS 106)',
  bank_str: 'बैंक का संदिग्ध-लेनदेन फ्रीज़',
  cheque_dishonour: 'चेक बाउंस',
  death_nomination_dispute: 'नामांकन / उत्तराधिकार रोक',
};

const DEFAULT_WHY: Record<string, string> = {
  freeze_sms: 'Shows when and how the bank froze it — the starting point for any letter.',
  bank_statement: 'Shows the blocked amount and that your money came in honestly.',
  pan_card: 'Proves who you are to the bank.',
};
