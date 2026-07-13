import type { Database } from "@/supabase/database.types";

type FreezeReason = Database["public"]["Enums"]["freeze_reason"];

/** Scenario track used to choose the safest next information-gathering route. */
export type UnfreezeTrack = "branch" | "cyber" | "court" | "tax";

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
  /** A bounded explanation of the likely route and its uncertainty. */
  headline: string;
  /** True only for a classified bank-internal restriction. */
  branchCanFix: boolean;
  /** The single most useful next step. */
  keyStep: string;
  steps: UnfreezeStep[];
};

/** Language-selected content bundle for one path (headline + keyStep + steps). */
type PathContent = {
  headline: string;
  keyStep: string;
  steps: UnfreezeStep[];
};

const isHi = (locale: string | undefined) => locale === "hi";

// ── Cyber / police freeze path ──────────────────────────────────────────────
// Exact powers, remedies and timelines depend on the order and jurisdiction.
// The safe first move is to obtain the written restriction details.
function cyberPath(locale: string): UnfreezePath {
  const en: PathContent = {
    headline:
      "First confirm who ordered the restriction and exactly what your bank has blocked. Unhold cannot determine who may release it until those written details are known.",
    keyStep:
      "Get the restriction details and ordering-authority reference in writing.",
    steps: [
      {
        n: 1,
        title: "Ask your bank for the restriction details",
        detail:
          "Request the amount held, type of restriction, ordering authority, police station or cyber cell, and complaint/FIR/NCRP reference. Keep the written reply and acknowledgement.",
        who: "You → your bank branch or published grievance channel",
      },
      {
        n: 2,
        title: "Use the identified official route",
        detail:
          "If the bank names a police or cyber authority, send that authority a factual representation with only the documents it requests. Ask for a written decision or the next official step. Unhold does not submit this for you.",
        who: "You → the authority named by the bank",
      },
      {
        n: 3,
        title: "Give any written direction to your bank",
        detail:
          "If the authority issues a release, modification, or no-objection direction, give a copy to the bank through its published grievance channel and keep proof of delivery.",
        who: "You → your bank",
      },
      {
        n: 4,
        title: "Escalate service failures carefully",
        detail:
          "For a bank-service problem, follow the bank’s published grievance process. RBI CMS may review eligible service complaints after the bank’s process; it does not replace a police or court decision. For urgent or disputed legal action, seek independent legal aid.",
        who: "You → bank grievance channel / RBI CMS if eligible / independent legal aid",
      },
    ],
  };

  const hi: PathContent = {
    headline:
      "पहले लिखित में पता करें कि रोक किसने लगवाई और बैंक ने ठीक-ठीक क्या रोका है। इन विवरणों के बिना Unhold यह तय नहीं कर सकता कि रोक कौन बदल सकता है।",
    keyStep: "रोक का विवरण और आदेश देने वाली अथॉरिटी का रेफरेंस लिखित में लें।",
    steps: [
      {
        n: 1,
        title: "बैंक से रोक का पूरा विवरण माँगें",
        detail:
          "रोकी गई रकम, रोक का प्रकार, आदेश देने वाली अथॉरिटी, पुलिस थाना/साइबर सेल और शिकायत/FIR/NCRP रेफरेंस माँगें। लिखित जवाब और पावती संभालकर रखें।",
        who: "आप → बैंक शाखा या बैंक का प्रकाशित शिकायत चैनल",
      },
      {
        n: 2,
        title: "बताए गए आधिकारिक रास्ते का उपयोग करें",
        detail:
          "अगर बैंक किसी पुलिस या साइबर अथॉरिटी का नाम देता है, तो उसे केवल माँगे गए दस्तावेज़ों के साथ तथ्यात्मक अभ्यावेदन दें। लिखित निर्णय या अगला आधिकारिक कदम माँगें। Unhold आपकी ओर से कुछ जमा नहीं करता।",
        who: "आप → बैंक द्वारा बताई गई अथॉरिटी",
      },
      {
        n: 3,
        title: "मिला हुआ लिखित निर्देश बैंक को दें",
        detail:
          "अगर अथॉरिटी रिहाई, बदलाव या अनापत्ति का लिखित निर्देश देती है, तो उसे बैंक के प्रकाशित शिकायत चैनल पर दें और जमा करने का प्रमाण रखें।",
        who: "आप → आपका बैंक",
      },
      {
        n: 4,
        title: "सेवा में कमी हो तो सावधानी से शिकायत बढ़ाएँ",
        detail:
          "बैंक की सेवा से जुड़ी समस्या के लिए बैंक की प्रकाशित शिकायत प्रक्रिया अपनाएँ। पात्र मामलों में RBI CMS बैंक की सेवा-शिकायत देख सकता है; वह पुलिस या अदालत के निर्णय की जगह नहीं लेता। जरूरी या विवादित कानूनी कार्रवाई में स्वतंत्र कानूनी सहायता लें।",
        who: "आप → बैंक शिकायत चैनल / पात्र होने पर RBI CMS / स्वतंत्र कानूनी सहायता",
      },
    ],
  };

  const c = isHi(locale) ? hi : en;
  return {
    track: "cyber",
    branchCanFix: false,
    headline: c.headline,
    keyStep: c.keyStep,
    steps: c.steps,
  };
}

// ── The branch CAN fix these — be honest and send them there ───────────────
function branchPath(
  kind: "kyc" | "cheque" | "nomination",
  locale: string,
): UnfreezePath {
  const en = {
    kyc: {
      headline:
        "This is classified as a KYC / verification hold. Confirm that with your bank, then complete the bank’s current re-KYC process.",
      keyStep: "Confirm the reason and complete the bank’s re-KYC process.",
      steps: [
        {
          n: 1,
          title: "Ask your branch which current KYC documents it needs",
          detail:
            "Use the bank’s verified channel or visit the branch. Provide only the documents the bank confirms are required and ask for a service-request reference.",
          who: "You → your bank branch",
        },
      ],
    },
    cheque: {
      headline:
        "This looks like a bank-internal hold (e.g. a cheque / lien matter), which your branch can usually resolve directly.",
      keyStep: "Sort it out with your branch directly.",
      steps: [
        {
          n: 1,
          title: "Talk to your branch manager",
          detail:
            "Ask exactly why the hold was placed and what clears it. A bank-internal hold is the branch’s to remove.",
          who: "You → your bank branch",
        },
      ],
    },
    nomination: {
      headline:
        "This is a nomination / succession hold — handled by your branch, not the police.",
      keyStep:
        "Complete the succession / nomination formalities at the branch.",
      steps: [
        {
          n: 1,
          title: "Complete the succession formalities at your branch",
          detail:
            "Ask the branch which documents they need (nomination, death certificate, legal heir proof) to release the account.",
          who: "You → your bank branch",
        },
      ],
    },
  } as const;

  const hi = {
    kyc: {
      headline:
        "इसे KYC / सत्यापन रोक के रूप में वर्गीकृत किया गया है। पहले बैंक से इसकी पुष्टि करें, फिर बैंक की मौजूदा re-KYC प्रक्रिया पूरी करें।",
      keyStep: "कारण की पुष्टि करें और बैंक की re-KYC प्रक्रिया पूरी करें।",
      steps: [
        {
          n: 1,
          title: "शाखा से पूछें कि कौन-से मौजूदा KYC दस्तावेज़ चाहिए",
          detail:
            "बैंक के सत्यापित चैनल का उपयोग करें या शाखा जाएँ। केवल बैंक द्वारा बताए गए जरूरी दस्तावेज़ दें और सर्विस-रिक्वेस्ट रेफरेंस माँगें।",
          who: "आप → आपकी बैंक शाखा",
        },
      ],
    },
    cheque: {
      headline:
        "यह बैंक की अंदरूनी रोक लगती है (जैसे चेक / लियन का मामला), जिसे आपकी शाखा आमतौर पर खुद सुलझा सकती है।",
      keyStep: "इसे सीधे अपनी शाखा से सुलझाएँ।",
      steps: [
        {
          n: 1,
          title: "अपने ब्रांच मैनेजर से बात करें",
          detail:
            "ठीक-ठीक पूछें कि रोक क्यों लगी और इसे क्या हटाएगा। बैंक की अंदरूनी रोक शाखा को ही हटानी होती है।",
          who: "आप → आपकी बैंक शाखा",
        },
      ],
    },
    nomination: {
      headline:
        "यह नामांकन / उत्तराधिकार की रोक है — इसे आपकी शाखा संभालती है, पुलिस नहीं।",
      keyStep: "शाखा में उत्तराधिकार / नामांकन की औपचारिकताएँ पूरी करें।",
      steps: [
        {
          n: 1,
          title: "शाखा में उत्तराधिकार की औपचारिकताएँ पूरी करें",
          detail:
            "शाखा से पूछें कि खाता जारी करने के लिए कौन-से दस्तावेज़ चाहिए (नामांकन, मृत्यु प्रमाण-पत्र, कानूनी उत्तराधिकारी प्रमाण)।",
          who: "आप → आपकी बैंक शाखा",
        },
      ],
    },
  } as const;

  const m = (isHi(locale) ? hi : en)[kind];
  return {
    track: "branch",
    headline: m.headline,
    branchCanFix: true,
    keyStep: m.keyStep,
    steps: [...m.steps],
  };
}

function courtPath(locale: string): UnfreezePath {
  const en: PathContent = {
    headline:
      "The restriction is recorded as court-ordered. Ask the bank for the order, then get case-specific advice on the remedy available before that court.",
    keyStep: "Get the order and obtain case-specific legal advice.",
    steps: [
      {
        n: 1,
        title: "Get a copy of the court order from your bank",
        detail:
          "Ask your bank for the exact court, case number, and the order under which your account was attached.",
        who: "You → your bank branch",
      },
      {
        n: 2,
        title: "Apply to that court (with a lawyer)",
        detail:
          "Ask a lawyer what relief is available on the facts and order, including whether the scope or amount of the attachment can be reviewed.",
        who: "You → the court, via a lawyer",
      },
    ],
  };

  const hi: PathContent = {
    headline:
      "रोक को अदालती आदेश के रूप में दर्ज किया गया है। बैंक से आदेश लें, फिर उसी अदालत में उपलब्ध उपाय पर मामले के अनुसार कानूनी सलाह लें।",
    keyStep: "आदेश लें और मामले के अनुसार कानूनी सलाह प्राप्त करें।",
    steps: [
      {
        n: 1,
        title: "अपने बैंक से अदालत के आदेश की कॉपी लें",
        detail:
          "अपने बैंक से पूछें कि किस अदालत, किस केस नंबर, और किस आदेश के तहत आपका खाता कुर्क हुआ।",
        who: "आप → आपकी बैंक शाखा",
      },
      {
        n: 2,
        title: "उस अदालत में (वकील के ज़रिए) आवेदन करें",
        detail:
          "वकील से पूछें कि आदेश और तथ्यों के आधार पर क्या राहत मिल सकती है, और क्या कुर्की की सीमा या रकम की समीक्षा हो सकती है।",
        who: "आप → अदालत, वकील के ज़रिए",
      },
    ],
  };

  const c = isHi(locale) ? hi : en;
  return {
    track: "court",
    branchCanFix: false,
    headline: c.headline,
    keyStep: c.keyStep,
    steps: c.steps,
  };
}

function taxPath(locale: string): UnfreezePath {
  const en: PathContent = {
    headline:
      "The restriction is recorded as a tax / GST attachment. Get the notice and issuing-office details before choosing a response.",
    keyStep:
      "Get the notice and address it through the issuing tax/GST office.",
    steps: [
      {
        n: 1,
        title: "Find the tax notice behind the attachment",
        detail:
          "Ask your bank for the notice / order and which tax or GST office issued it.",
        who: "You → your bank branch",
      },
      {
        n: 2,
        title: "Approach the tax/GST officer",
        detail:
          "Ask a qualified adviser or the issuing office how to pay, dispute, or seek review of the demand, then give any resulting written direction to the bank.",
        who: "You → the tax / GST department",
      },
    ],
  };

  const hi: PathContent = {
    headline:
      "रोक को कर / GST कुर्की के रूप में दर्ज किया गया है। जवाब चुनने से पहले नोटिस और जारी करने वाले कार्यालय की जानकारी लें।",
    keyStep:
      "नोटिस लें और जारी करने वाले कर/GST कार्यालय के जरिए इसका जवाब दें।",
    steps: [
      {
        n: 1,
        title: "कुर्की के पीछे का कर नोटिस ढूँढें",
        detail:
          "अपने बैंक से वह नोटिस / आदेश और यह पूछें कि किस कर या GST कार्यालय ने इसे जारी किया।",
        who: "आप → आपकी बैंक शाखा",
      },
      {
        n: 2,
        title: "कर/GST अधिकारी से संपर्क करें",
        detail:
          "योग्य सलाहकार या जारी करने वाले कार्यालय से पूछें कि माँग का भुगतान, आपत्ति या समीक्षा कैसे करनी है, फिर मिला हुआ लिखित निर्देश बैंक को दें।",
        who: "आप → कर / GST विभाग",
      },
    ],
  };

  const c = isHi(locale) ? hi : en;
  return {
    track: "tax",
    branchCanFix: false,
    headline: c.headline,
    keyStep: c.keyStep,
    steps: c.steps,
  };
}

/**
 * A scenario-aware route driven by the recorded reason for the restriction.
 * This is the product's substance: it tells you who actually controls the
 * unfreeze (often not your branch) and the real ordered steps, instead of a
 * generic "send a letter to the branch". Content is localized (en/hi); the
 * default keeps the English source-of-truth.
 */
export function getUnfreezePath(
  reason: FreezeReason | null | undefined,
  locale = "en",
): UnfreezePath {
  switch (reason) {
    case "kyc_expired":
      return branchPath("kyc", locale);
    case "cheque_dishonour":
      return branchPath("cheque", locale);
    case "death_nomination_dispute":
      return branchPath("nomination", locale);
    case "court_order":
      return courtPath(locale);
    case "tax_gst_attachment":
      return taxPath(locale);
    // cyber_upi_chain, suspected_mule, police_notice_bnss106, bank_str, and the
    // unknown/default all follow the cautious written-authority path.
    default:
      return cyberPath(locale);
  }
}
