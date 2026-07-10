import type { Database } from '@/supabase/database.types';

type FreezeReason = Database['public']['Enums']['freeze_reason'];

/** Who actually controls lifting this freeze. This is the product's core
 * honesty: a bank branch cannot lift a cyber-cell / court / tax freeze. */
export type UnfreezeTrack = 'branch' | 'cyber' | 'court' | 'tax';

export type UnfreezeStep = {
  n: number;
  title: string;
  detail: string;
  /** Who you deal with at this step. */
  who: string;
  /** Rough timeline, when there is a real one. */
  deadline?: string;
};

export type UnfreezePath = {
  track: UnfreezeTrack;
  /** The honest one-line truth about who can actually unfreeze this. */
  headline: string;
  /** True only when the branch can genuinely resolve it themselves. */
  branchCanFix: boolean;
  /** The single most important thing that actually lifts the freeze. */
  keyStep: string;
  steps: UnfreezeStep[];
};

/** Language-selected content bundle for one path (headline + keyStep + steps). */
type PathContent = {
  headline: string;
  keyStep: string;
  steps: UnfreezeStep[];
};

const isHi = (locale: string | undefined) => locale === 'hi';

// ── The real path for a cyber / police freeze ──────────────────────────────
// Verified 2026: the branch only executes the freeze; the cyber cell (via an
// NOC) or the 90-day rule / a court is what lifts it.
function cyberPath(locale: string): UnfreezePath {
  const en: PathContent = {
    headline:
      "Your branch cannot lift this — a cyber cell ordered it. The branch only froze it on instruction. What actually unfreezes it is an NOC (No Objection Certificate) from that cyber cell.",
    keyStep: 'Get an NOC from the cyber cell that ordered the freeze.',
    steps: [
      {
        n: 1,
        title: 'Get the freeze details from your bank — in writing',
        detail:
          "Ask your bank's nodal officer — a senior grievance officer above the branch (in writing — your Letter 1 does this) — which cyber cell / police station ordered the freeze, the FIR / NCRP number (your cybercrime.gov.in complaint number), the amount held, and whether it's a lien (a hold on a specific amount, not your whole account) or a full freeze. You can't get a release without knowing who froze it. If a public-sector bank stonewalls, you can file an RTI (a formal Right-to-Information request) with the bank; for a private bank, RTI the police instead.",
        who: 'You → your bank nodal officer',
        deadline: 'Bank is meant to forward your grievance in ~7 days',
      },
      {
        n: 2,
        title: 'Get the release order (NOC) from the cyber cell that froze it',
        detail:
          'Send a written representation to the Investigating Officer / SHO — the officer in charge of that cyber police station (copy the senior Cyber SP) — with your ID, bank statement showing the disputed credit, and proof the money is legitimate. Ask for a written no-objection (NOC) / release order — under the 2026 SOP the police send the bank a Section 106(3) BNSS release notice (the legal notice that tells the bank to release the money). The station may be in another state. A few states (Gujarat) run an online unfreeze portal — check your state cyber cell.',
        who: 'You → the Investigating Officer / cyber cell',
        deadline: 'IO is meant to decide in ~15 days (weaker above ₹50,000)',
      },
      {
        n: 3,
        title: 'Submit the release order to your bank',
        detail:
          "Hand the NOC / release order to your bank's nodal officer. This is the document that actually lifts the freeze — the bank removes the hold within a few working days (the SOP says within 15 days of a 106(3) notice, sometimes against an indemnity bond — a written promise to repay if the money is later found to be disputed).",
        who: 'You → your bank nodal officer',
        deadline: 'Hold removed within ~15 days',
      },
      {
        n: 4,
        title: 'If nothing moves — use your time-bound rights',
        detail:
          'Under ₹50,000 disputed: release is meant to be easier without a court order, and if no court order continues the freeze within 90 days the bank should lift it. If the BANK is the blocker (froze your whole account, ignored the 90-day lapse), complain against the bank on CPGRAMS (the central government’s public-grievance website, pgportal.gov.in) and, after 30 days, to the RBI Ombudsman — a free government service for complaints against banks (cms.rbi.org.in / 14448). Note: the Ombudsman can act on the bank’s conduct but cannot override a police freeze — for that, a lawyer’s notice to the IO or a High Court writ is the route.',
        who: 'You → CPGRAMS / RBI Ombudsman / (if stuck) a lawyer or High Court',
        deadline: '30-day RBI route · 90-day auto-lift (under ₹50k)',
      },
    ],
  };

  const hi: PathContent = {
    headline:
      'आपकी शाखा यह रोक नहीं हटा सकती — यह आदेश एक साइबर सेल ने दिया है। शाखा ने तो सिर्फ़ आदेश पर रोक लगाई है। इसे असल में जो हटाता है वह है उस साइबर सेल से मिला NOC (No Objection Certificate / अनापत्ति प्रमाण-पत्र)।',
    keyStep: 'उस साइबर सेल से NOC (अनापत्ति) लें जिसने रोक लगवाई।',
    steps: [
      {
        n: 1,
        title: 'अपने बैंक से फ्रीज़ का विवरण लें — लिखित में',
        detail:
          'अपने बैंक के नोडल अधिकारी (शाखा से ऊपर के एक वरिष्ठ शिकायत अधिकारी) से लिखित में पूछें (आपका पत्र 1 यही करता है) कि किस साइबर सेल / पुलिस थाने ने रोक लगवाई, FIR / NCRP नंबर (cybercrime.gov.in वाली आपकी शिकायत संख्या), रोकी गई रकम, और यह लियन है (किसी तय रकम पर रोक, पूरा खाता नहीं) या पूरा फ्रीज़। जब तक आपको पता न हो कि रोक किसने लगाई, रिहाई नहीं मिल सकती। अगर कोई सरकारी बैंक टालमटोल करे, तो आप बैंक में RTI (सूचना का अधिकार आवेदन) दे सकते हैं; निजी बैंक हो तो पुलिस में RTI दें।',
        who: 'आप → आपके बैंक के नोडल अधिकारी',
        deadline: 'बैंक को आपकी शिकायत लगभग 7 दिन में आगे भेजनी होती है',
      },
      {
        n: 2,
        title: 'जिस साइबर सेल ने रोक लगाई, उससे रिहाई आदेश (NOC) लें',
        detail:
          'जाँच अधिकारी (Investigating Officer / IO) / SHO — उस साइबर पुलिस थाने के प्रभारी अधिकारी — को लिखित अभ्यावेदन भेजें (वरिष्ठ Cyber SP को कॉपी करें), साथ में अपनी ID, विवादित रकम आने को दिखाता बैंक स्टेटमेंट, और यह प्रमाण कि पैसा वैध है। लिखित अनापत्ति (NOC) / रिहाई आदेश माँगें — 2026 SOP के तहत पुलिस बैंक को धारा 106(3) BNSS का रिहाई नोटिस भेजती है (यह वह कानूनी नोटिस है जो बैंक को पैसा छोड़ने को कहता है)। थाना किसी दूसरे राज्य में भी हो सकता है। कुछ राज्यों (जैसे गुजरात) में ऑनलाइन अनफ्रीज़ पोर्टल है — अपने राज्य की साइबर सेल जाँचें।',
        who: 'आप → जाँच अधिकारी (IO) / साइबर सेल',
        deadline: 'IO को लगभग 15 दिन में फैसला लेना होता है (₹50,000 से ऊपर कमज़ोर)',
      },
      {
        n: 3,
        title: 'रिहाई आदेश अपने बैंक को दें',
        detail:
          'NOC / रिहाई आदेश अपने बैंक के नोडल अधिकारी को सौंपें। यही वह दस्तावेज़ है जो असल में रोक हटाता है — बैंक कुछ कार्य-दिवसों में रोक हटा देता है (SOP कहती है 106(3) नोटिस के 15 दिन के भीतर, कभी-कभी एक क्षतिपूर्ति बॉन्ड (indemnity bond — यह लिखित वादा कि अगर पैसा बाद में विवादित निकला तो लौटा देंगे) के बदले)।',
        who: 'आप → आपके बैंक के नोडल अधिकारी',
        deadline: 'लगभग 15 दिन में रोक हट जाती है',
      },
      {
        n: 4,
        title: 'अगर कुछ न हिले — अपने समयबद्ध अधिकार इस्तेमाल करें',
        detail:
          'विवादित रकम ₹50,000 से कम: बिना कोर्ट आदेश के रिहाई आसान होनी चाहिए, और अगर 90 दिन में कोई कोर्ट आदेश रोक जारी न रखे तो बैंक को रोक हटा देनी चाहिए। अगर अटकाने वाला बैंक ही है (पूरा खाता फ्रीज़ किया, 90 दिन बीतने को अनदेखा किया), तो बैंक के खिलाफ CPGRAMS (केंद्र सरकार की जन-शिकायत वेबसाइट, pgportal.gov.in) पर शिकायत करें और 30 दिन बाद RBI लोकपाल (Ombudsman) — बैंकों के खिलाफ शिकायत की मुफ़्त सरकारी सेवा (cms.rbi.org.in / 14448) — के पास जाएँ। ध्यान रहे: लोकपाल बैंक के बर्ताव पर कार्रवाई कर सकता है पर पुलिस की रोक नहीं पलट सकता — उसके लिए IO को वकील का नोटिस या हाई कोर्ट में रिट ही रास्ता है।',
        who: 'आप → CPGRAMS / RBI लोकपाल / (अगर अटके) वकील या हाई कोर्ट',
        deadline: '30-दिन RBI रास्ता · 90-दिन में अपने-आप रिहाई (₹50k से कम)',
      },
    ],
  };

  const c = isHi(locale) ? hi : en;
  return { track: 'cyber', branchCanFix: false, headline: c.headline, keyStep: c.keyStep, steps: c.steps };
}

// ── The branch CAN fix these — be honest and send them there ───────────────
function branchPath(kind: 'kyc' | 'cheque' | 'nomination', locale: string): UnfreezePath {
  const en = {
    kyc: {
      headline:
        'Good news — this is a KYC / verification hold, not a police freeze. Your branch CAN lift it directly once you re-do your KYC.',
      keyStep: 'Complete re-KYC at your branch.',
      steps: [
        {
          n: 1,
          title: 'Visit your branch with fresh KYC documents',
          detail:
            'Carry your Aadhaar, PAN, and a recent address proof. Ask the branch to complete your re-KYC and remove the hold.',
          who: 'You → your bank branch',
          deadline: 'Usually lifted the same day or within a few days',
        },
      ],
    },
    cheque: {
      headline:
        'This looks like a bank-internal hold (e.g. a cheque / lien matter), which your branch can usually resolve directly.',
      keyStep: 'Sort it out with your branch directly.',
      steps: [
        {
          n: 1,
          title: 'Talk to your branch manager',
          detail:
            'Ask exactly why the hold was placed and what clears it. A bank-internal hold is the branch’s to remove.',
          who: 'You → your bank branch',
          deadline: 'Often resolved in a day or two',
        },
      ],
    },
    nomination: {
      headline:
        'This is a nomination / succession hold — handled by your branch, not the police.',
      keyStep: 'Complete the succession / nomination formalities at the branch.',
      steps: [
        {
          n: 1,
          title: 'Complete the succession formalities at your branch',
          detail:
            'Ask the branch which documents they need (nomination, death certificate, legal heir proof) to release the account.',
          who: 'You → your bank branch',
          deadline: 'Varies with paperwork',
        },
      ],
    },
  } as const;

  const hi = {
    kyc: {
      headline:
        'अच्छी खबर — यह KYC / सत्यापन की रोक है, पुलिस का फ्रीज़ नहीं। आपकी शाखा इसे सीधे हटा सकती है, बस आपको दोबारा KYC करानी होगी।',
      keyStep: 'अपनी शाखा में दोबारा KYC पूरी कराएँ।',
      steps: [
        {
          n: 1,
          title: 'ताज़ा KYC दस्तावेज़ों के साथ अपनी शाखा जाएँ',
          detail:
            'अपना Aadhaar, PAN और हाल का पता-प्रमाण साथ ले जाएँ। शाखा से कहें कि आपकी दोबारा-KYC पूरी करके रोक हटा दे।',
          who: 'आप → आपकी बैंक शाखा',
          deadline: 'आमतौर पर उसी दिन या कुछ दिनों में हट जाती है',
        },
      ],
    },
    cheque: {
      headline:
        'यह बैंक की अंदरूनी रोक लगती है (जैसे चेक / लियन का मामला), जिसे आपकी शाखा आमतौर पर खुद सुलझा सकती है।',
      keyStep: 'इसे सीधे अपनी शाखा से सुलझाएँ।',
      steps: [
        {
          n: 1,
          title: 'अपने ब्रांच मैनेजर से बात करें',
          detail:
            'ठीक-ठीक पूछें कि रोक क्यों लगी और इसे क्या हटाएगा। बैंक की अंदरूनी रोक शाखा को ही हटानी होती है।',
          who: 'आप → आपकी बैंक शाखा',
          deadline: 'अक्सर एक-दो दिन में सुलझ जाती है',
        },
      ],
    },
    nomination: {
      headline:
        'यह नामांकन / उत्तराधिकार की रोक है — इसे आपकी शाखा संभालती है, पुलिस नहीं।',
      keyStep: 'शाखा में उत्तराधिकार / नामांकन की औपचारिकताएँ पूरी करें।',
      steps: [
        {
          n: 1,
          title: 'शाखा में उत्तराधिकार की औपचारिकताएँ पूरी करें',
          detail:
            'शाखा से पूछें कि खाता जारी करने के लिए कौन-से दस्तावेज़ चाहिए (नामांकन, मृत्यु प्रमाण-पत्र, कानूनी उत्तराधिकारी प्रमाण)।',
          who: 'आप → आपकी बैंक शाखा',
          deadline: 'कागज़ी कार्रवाई पर निर्भर',
        },
      ],
    },
  } as const;

  const m = (isHi(locale) ? hi : en)[kind];
  return { track: 'branch', headline: m.headline, branchCanFix: true, keyStep: m.keyStep, steps: [...m.steps] };
}

function courtPath(locale: string): UnfreezePath {
  const en: PathContent = {
    headline:
      'Your account was frozen by a court order — your branch cannot lift it. Only the court that passed the order (or the resolution of that case) can release it.',
    keyStep: 'Get the court to modify or vacate the attachment.',
    steps: [
      {
        n: 1,
        title: 'Get a copy of the court order from your bank',
        detail: 'Ask your bank for the exact court, case number, and the order under which your account was attached.',
        who: 'You → your bank branch',
      },
      {
        n: 2,
        title: 'Apply to that court (with a lawyer)',
        detail:
          'A lawyer can file to modify or vacate the attachment — for example arguing only the disputed amount should be held, not your whole account.',
        who: 'You → the court, via a lawyer',
      },
    ],
  };

  const hi: PathContent = {
    headline:
      'आपका खाता एक अदालती आदेश से फ्रीज़ हुआ है — आपकी शाखा इसे नहीं हटा सकती। इसे केवल वही अदालत हटा सकती है जिसने आदेश दिया (या उस केस का निपटारा)।',
    keyStep: 'अदालत से कुर्की में बदलाव कराएँ या उसे रद्द कराएँ।',
    steps: [
      {
        n: 1,
        title: 'अपने बैंक से अदालत के आदेश की कॉपी लें',
        detail: 'अपने बैंक से पूछें कि किस अदालत, किस केस नंबर, और किस आदेश के तहत आपका खाता कुर्क हुआ।',
        who: 'आप → आपकी बैंक शाखा',
      },
      {
        n: 2,
        title: 'उस अदालत में (वकील के ज़रिए) आवेदन करें',
        detail:
          'एक वकील कुर्की बदलवाने या रद्द कराने के लिए आवेदन कर सकता है — जैसे यह तर्क कि सिर्फ़ विवादित रकम रोकी जाए, पूरा खाता नहीं।',
        who: 'आप → अदालत, वकील के ज़रिए',
      },
    ],
  };

  const c = isHi(locale) ? hi : en;
  return { track: 'court', branchCanFix: false, headline: c.headline, keyStep: c.keyStep, steps: c.steps };
}

function taxPath(locale: string): UnfreezePath {
  const en: PathContent = {
    headline:
      'This is a tax / GST attachment — your branch cannot lift it. The tax officer who attached the account has to release it.',
    keyStep: 'Resolve or dispute the tax demand with the tax/GST officer.',
    steps: [
      {
        n: 1,
        title: 'Find the tax notice behind the attachment',
        detail: 'Ask your bank for the notice / order and which tax or GST office issued it.',
        who: 'You → your bank branch',
      },
      {
        n: 2,
        title: 'Approach the tax/GST officer',
        detail:
          'Clear or formally dispute the demand. Once the tax office lifts the attachment, the bank releases the account.',
        who: 'You → the tax / GST department',
      },
    ],
  };

  const hi: PathContent = {
    headline:
      'यह कर / GST की कुर्की है — आपकी शाखा इसे नहीं हटा सकती। जिस कर अधिकारी ने खाता कुर्क किया, उसी को इसे छोड़ना होगा।',
    keyStep: 'कर/GST अधिकारी के साथ कर-माँग सुलझाएँ या उस पर आपत्ति करें।',
    steps: [
      {
        n: 1,
        title: 'कुर्की के पीछे का कर नोटिस ढूँढें',
        detail: 'अपने बैंक से वह नोटिस / आदेश और यह पूछें कि किस कर या GST कार्यालय ने इसे जारी किया।',
        who: 'आप → आपकी बैंक शाखा',
      },
      {
        n: 2,
        title: 'कर/GST अधिकारी से संपर्क करें',
        detail:
          'माँग चुकाएँ या औपचारिक रूप से उस पर आपत्ति करें। जैसे ही कर कार्यालय कुर्की हटाता है, बैंक खाता जारी कर देता है।',
        who: 'आप → कर / GST विभाग',
      },
    ],
  };

  const c = isHi(locale) ? hi : en;
  return { track: 'tax', branchCanFix: false, headline: c.headline, keyStep: c.keyStep, steps: c.steps };
}

/**
 * The real, honest path to unfreeze — driven by WHY the account was frozen.
 * This is the product's substance: it tells you who actually controls the
 * unfreeze (often not your branch) and the real ordered steps, instead of a
 * generic "send a letter to the branch". Content is localized (en/hi); the
 * default keeps the English source-of-truth.
 */
export function getUnfreezePath(
  reason: FreezeReason | null | undefined,
  locale = 'en',
): UnfreezePath {
  switch (reason) {
    case 'kyc_expired':
      return branchPath('kyc', locale);
    case 'cheque_dishonour':
      return branchPath('cheque', locale);
    case 'death_nomination_dispute':
      return branchPath('nomination', locale);
    case 'court_order':
      return courtPath(locale);
    case 'tax_gst_attachment':
      return taxPath(locale);
    // cyber_upi_chain, suspected_mule, police_notice_bnss106, bank_str, and the
    // unknown/default all follow the cyber-cell + NOC path.
    default:
      return cyberPath(locale);
  }
}
