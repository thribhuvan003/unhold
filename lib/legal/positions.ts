/**
 * Core legal positions Unhold relies on, each with a source and an HONEST
 * currency tag. This is the "beats ChatGPT" substance: a general model states
 * these from a frozen, pre-2026 training cutoff and cannot flag what is now
 * contested; here every claim carries where it came from and whether it is
 * settled or under appeal.
 *
 * Sourced from docs/RESEARCH_FREEZE_DOMAIN.md (primary-source verification pass
 * 2026-07-05). RULE: no position enters this file without a source there, and a
 * claim that is contested/under appeal MUST be tagged 'contested' — never shown
 * as settled law.
 */

export type LegalCurrency = 'current' | 'contested' | 'caution';

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
  id: 'disputed_amount_only',
  claim:
    'Ask your bank to confirm in writing the amount under hold, the authority that ordered it, and the reference number. Unhold cannot determine whether a restriction is lawful in your individual case.',
  source: 'MHA parliamentary reply confirming the NCRP-CFCFRMS SOP, 24-Mar-2026',
  sourceUrl: 'https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/LS24032026/5184.pdf',
  currency: 'caution',
  asOf: '2026-07-12',
  note: 'The government confirms that an SOP exists, but the public citizen route and the facts of a particular hold must be confirmed with the bank and competent authority. Seek independent legal advice for a court challenge.',
  claimHi:
    'अपने बैंक से लिखित में रोक की रकम, रोक लगाने वाले प्राधिकरण और संदर्भ नंबर की पुष्टि माँगें। Unhold आपके व्यक्तिगत मामले में यह तय नहीं कर सकता कि रोक कानूनी है या नहीं।',
  noteHi:
    'सरकार ने SOP होने की पुष्टि की है, लेकिन नागरिक के लिए रास्ता और आपके मामले के तथ्य बैंक व सक्षम प्राधिकरण से जाँचने होंगे। अदालत के मामले के लिए स्वतंत्र कानूनी सलाह लें।',
};

/** BNSS 106 (seizure) vs 107 (Magistrate attachment) — the statutory structure. */
export const BNSS_106_VS_107: LegalPosition = {
  id: 'bnss_106_vs_107',
  claim:
    'Under BNSS Section 106 (seizure) the police cannot by themselves debit-freeze an account; a full attachment needs a Section 107 order from a Magistrate.',
  source: 'BNSS 2023, ss. 106–107 (in force from 01-Jul-2024)',
  sourceUrl:
    'https://www.scconline.com/blog/post/2025/12/01/investigating-agency-cannot-debit-freeze-account-u-s-106-bnss-bom-hc/',
  currency: 'current',
  asOf: '2026-07-05',
  claimHi:
    'BNSS (भारतीय नागरिक सुरक्षा संहिता) की धारा 106 (ज़ब्ती) के तहत पुलिस अपने आप आपके खाते पर डेबिट-फ्रीज़ नहीं लगा सकती; पूरे खाते की कुर्की के लिए मजिस्ट्रेट से धारा 107 का आदेश ज़रूरी है।',
};

/** HC rulings that blanket freezes are unlawful — real, but under SC appeal. */
export const BLANKET_FREEZE_RULINGS: LegalPosition = {
  id: 'blanket_freeze_hc',
  claim:
    'The Bombay and Delhi High Courts have held that blanket-freezing an innocent account holder’s whole account is disproportionate and unlawful.',
  source: 'Bombay HC, Kartik Chatur (20-Nov-2025); Delhi HC, Malabar Gold (16-Jan-2026)',
  sourceUrl:
    'https://www.scconline.com/blog/post/2026/02/03/del-hc-on-legality-of-bank-account-freezing-under-bnss/',
  currency: 'contested',
  asOf: '2026-07-05',
  note: 'Verified against the primary judgments, but the Supreme Court (suo motu, 01-Dec-2025) ordered both appealed and separately allowed freezing "with or without FIR" — so cite them as recent High Court holdings, not settled law.',
  claimHi:
    'Bombay और Delhi High Court ने माना है कि किसी निर्दोष खाताधारक का पूरा खाता एकमुश्त फ्रीज़ करना अनुपात से बाहर और गैर-कानूनी है।',
  noteHi:
    'ये फैसले मूल निर्णयों से सत्यापित हैं, लेकिन यह मामला अभी Supreme Court में अपील के अधीन है — Supreme Court ने (suo motu यानी स्वतः संज्ञान, 01-Dec-2025) दोनों फैसलों के खिलाफ अपील का आदेश दिया और अलग से "FIR के साथ या बिना" खाता फ्रीज़ करने की अनुमति दी। इसलिए इन्हें High Court के हाल के फैसलों के तौर पर उद्धृत करें, तय कानून के तौर पर नहीं।',
};

export const LEGAL_POSITIONS: LegalPosition[] = [
  DISPUTED_AMOUNT_RULE,
  BNSS_106_VS_107,
  BLANKET_FREEZE_RULINGS,
];

export function getLegalPosition(id: string): LegalPosition | undefined {
  return LEGAL_POSITIONS.find((p) => p.id === id);
}
