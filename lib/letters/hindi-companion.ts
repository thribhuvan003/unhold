import type { UnfreezeTrack } from '@/lib/case/unfreeze-path';

/**
 * Reviewed Hindi companion for the letter. The authoritative letter the user
 * SENDS stays in English (it is the legal document). This is a faithful,
 * plain-Hindi explanation of what that English letter actually asks for, so a
 * Hindi-only reader understands what they are sending. It adds no new legal
 * claim — it mirrors the asks already in the English letter, per freeze track.
 *
 * Always rendered in Hindi regardless of the UI locale (shown on both /en and
 * /hi), visually secondary to the English letter.
 */
export type HindiLetterCompanion = {
  /** One-line intro, in plain Hindi. */
  intro: string;
  /** The concrete asks of the letter, each a short Hindi sentence. */
  asks: string[];
};

const CYBER: HindiLetterCompanion = {
  intro:
    'यह पत्र आपकी बैंक शाखा से कहता है कि आपके खाते पर लगी रोक में से केवल विवादित रकम पर ही लियन (रोक) रखे और बाकी पूरी रकम तुरंत जारी करे।',
  asks: [
    'फ्रीज़ का पूरा विवरण लिखित में दें — किस साइबर सेल/पुलिस थाने ने आदेश दिया, FIR/NCRP नंबर, रोकी गई रकम, और यह लियन (तय रकम पर रोक) है या पूरा खाता फ्रीज़।',
    'केवल विवादित रकम पर रोक रखें और बाकी बिना-विवाद वाली रकम तुरंत जारी करें (2026 MHA/I4C SOP और हाल के हाई कोर्ट के रुख के अनुसार)।',
    'आपकी शिकायत को बैंक के शिकायत-निवारण तंत्र (GRM) में दर्ज करें और लिखित पावती व शिकायत संदर्भ संख्या दें।',
    'यह याद रखें: विवादित रकम खुद बैंक नहीं छोड़ सकता — उसके लिए आपको उस जाँच अधिकारी/साइबर सेल से NOC (अनापत्ति) लेनी होगी, जिसने रोक लगवाई।',
  ],
};

const BRANCH: HindiLetterCompanion = {
  intro:
    'यह पत्र आपकी बैंक शाखा से कहता है कि ज़रूरी दस्तावेज़ मिलने पर आपका खाता फिर से चालू कर दे। यह रोक शाखा खुद हटा सकती है।',
  asks: [
    'बताएं कि खाता चालू करने के लिए कौन-से दस्तावेज़ (KYC/पहचान/पता) चाहिए।',
    'दस्तावेज़ जमा होने पर बिना देरी के रोक हटाकर खाता फिर से चालू करें।',
    'लिखित पावती और एक शिकायत संदर्भ संख्या दें, ताकि आगे फ़ॉलो-अप हो सके।',
  ],
};

const COURT: HindiLetterCompanion = {
  intro:
    'यह पत्र आपकी बैंक शाखा से अदालत के उस आदेश का विवरण माँगता है जिसके तहत खाता कुर्क/फ्रीज़ हुआ है। यह रोक शाखा खुद नहीं हटा सकती — केवल संबंधित अदालत हटा सकती है।',
  asks: [
    'उस अदालत का नाम, केस नंबर और वह आदेश दें जिसके तहत खाते पर रोक लगी।',
    'रोक का सही स्वरूप बताएं — पूरा खाता या केवल एक तय रकम।',
    'लिखित पावती दें, ताकि आप वकील के ज़रिए सही अदालत में राहत के लिए आवेदन कर सकें।',
  ],
};

const TAX: HindiLetterCompanion = {
  intro:
    'यह पत्र आपकी बैंक शाखा से उस कर/GST नोटिस का विवरण माँगता है जिसके तहत खाता कुर्क हुआ है। यह रोक शाखा खुद नहीं हटा सकती — इसे वही कर अधिकारी हटाएगा जिसने कुर्की की।',
  asks: [
    'वह नोटिस/आदेश और यह बताएं कि किस कर या GST कार्यालय ने इसे जारी किया।',
    'कुर्क की गई रकम और रोक का स्वरूप लिखित में स्पष्ट करें।',
    'लिखित पावती दें, ताकि आप संबंधित कर/GST अधिकारी के सामने मामला उठा सकें।',
  ],
};

const BY_TRACK: Record<UnfreezeTrack, HindiLetterCompanion> = {
  cyber: CYBER,
  branch: BRANCH,
  court: COURT,
  tax: TAX,
};

export function getHindiLetterCompanion(track: UnfreezeTrack): HindiLetterCompanion {
  return BY_TRACK[track] ?? CYBER;
}

/** The fixed Hindi label that frames the companion (shown in both locales). */
export const HINDI_COMPANION_LABEL =
  'हिंदी में — यह सिर्फ़ आपकी समझ के लिए है; बैंक को अंग्रेज़ी वाला पत्र ही भेजें।';
