/**
 * Friendly labels for letter placeholders. Users never see raw keys like
 * `{{USER_NAME}}` — they see "Your full name" with an input to fill it.
 */
export type PlaceholderFieldDef = {
  key: string;
  label: string;
  /** intake_json key the value is saved under (runner reads these). */
  intakeKey: string;
  inputType: 'text' | 'tel' | 'date' | 'number';
  placeholder?: string;
  help?: string;
  /** Optional validation pattern (client-side hint only), tested on the
   *  NORMALIZED value (see normalizePlaceholderValue). */
  pattern?: RegExp;
  patternMessage?: string;
  /** Caps typed length so, e.g., the "last 4" field can't take a full a/c no. */
  maxLength?: number;
  /** Enables mobile autofill so a stressed user isn't hand-typing everything. */
  autoComplete?: string;
  /** For date inputs: bound the range so no future/ancient freeze date. */
  min?: string;
  /** Reviewed Hindi variants — pick via localizePlaceholderField(def, locale). */
  labelHi?: string;
  placeholderHi?: string;
  helpHi?: string;
  patternMessageHi?: string;
};

/** Returns the field with its display strings in the given locale ('en' default). */
export function localizePlaceholderField(
  def: PlaceholderFieldDef,
  locale: string,
): PlaceholderFieldDef {
  if (locale !== 'hi') return def;
  return {
    ...def,
    label: def.labelHi ?? def.label,
    placeholder: def.placeholderHi ?? def.placeholder,
    help: def.helpHi ?? def.help,
    patternMessage: def.patternMessageHi ?? def.patternMessage,
  };
}

// Reused email shape (matches SendByEmailCard's branch-email check).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PLACEHOLDER_FIELDS: Record<string, PlaceholderFieldDef> = {
  USER_NAME: {
    key: 'USER_NAME',
    label: 'Your full name (as in the bank account)',
    intakeKey: 'user_name',
    inputType: 'text',
    placeholder: 'e.g. Rahul Sharma',
    // At least two letters in ANY script (Latin, Devanagari, Tamil, Telugu,
    // Bengali, …) — blocks ".", "0", blank, but never a real Indian name.
    pattern: /\p{L}.*\p{L}/u,
    patternMessage: 'Please enter your real full name.',
    maxLength: 120,
    autoComplete: 'name',
    labelHi: 'आपका पूरा नाम (जैसा बैंक खाते में है)',
    placeholderHi: 'जैसे: राहुल शर्मा',
    patternMessageHi: 'कृपया अपना असली पूरा नाम लिखें।',
  },
  USER_ADDRESS: {
    key: 'USER_ADDRESS',
    label: 'Your address (for the letter head)',
    intakeKey: 'user_address',
    inputType: 'text',
    placeholder: 'House / street, area, city, PIN',
    maxLength: 160,
    autoComplete: 'street-address',
    labelHi: 'आपका पता (पत्र के ऊपर के लिए)',
    placeholderHi: 'मकान / गली, इलाक़ा, शहर, PIN',
  },
  USER_PHONE: {
    key: 'USER_PHONE',
    label: 'Your phone number',
    intakeKey: 'user_phone',
    inputType: 'tel',
    placeholder: '10-digit mobile number',
    // Tested on the normalized value, so +91 / 0-prefix / spaces all pass.
    // Indian mobile: starts 6–9, not all the same digit.
    pattern: /^(?!(\d)\1{9})[6-9]\d{9}$/,
    patternMessage: 'Enter a valid 10-digit Indian mobile number (starts with 6–9).',
    autoComplete: 'tel',
    labelHi: 'आपका फ़ोन नंबर',
    placeholderHi: '10 अंकों का मोबाइल नंबर',
    patternMessageHi: 'सही 10 अंकों का भारतीय मोबाइल नंबर लिखें (6–9 से शुरू)।',
  },
  BANK_NAME: {
    key: 'BANK_NAME',
    label: 'Your bank name',
    intakeKey: 'bank_name',
    inputType: 'text',
    placeholder: 'e.g. Canara Bank',
    maxLength: 80,
    labelHi: 'आपके बैंक का नाम',
    placeholderHi: 'जैसे: Canara Bank',
  },
  BRANCH_CITY: {
    key: 'BRANCH_CITY',
    label: 'Branch city / location',
    intakeKey: 'branch_city',
    inputType: 'text',
    placeholder: 'e.g. Indiranagar, Bengaluru',
    maxLength: 100,
    autoComplete: 'address-level2',
    labelHi: 'शाखा का शहर / जगह',
    placeholderHi: 'जैसे: Indiranagar, Bengaluru',
  },
  ACCOUNT_LAST4: {
    key: 'ACCOUNT_LAST4',
    label: 'Last 4 digits of your account number',
    intakeKey: 'account_last4',
    inputType: 'text',
    placeholder: 'e.g. 4821',
    pattern: /^\d{4}$/,
    patternMessage: 'Exactly 4 digits — never share the full account number.',
    help: 'Only the last 4 digits. Never share your full account number here.',
    maxLength: 4,
    labelHi: 'खाता नंबर के आख़िरी 4 अंक',
    placeholderHi: 'जैसे: 4821',
    patternMessageHi: 'सिर्फ़ 4 अंक — पूरा खाता नंबर कभी साझा न करें।',
    helpHi: 'सिर्फ़ आख़िरी 4 अंक। पूरा खाता नंबर यहाँ कभी न लिखें।',
  },
  FREEZE_DATE: {
    key: 'FREEZE_DATE',
    label: 'Date the freeze started (approximate is fine)',
    intakeKey: 'freeze_date',
    inputType: 'date',
    min: '2015-01-01',
    labelHi: 'फ्रीज़ शुरू होने की तारीख़ (अंदाज़न भी चलेगा)',
  },
  AMOUNT_INR: {
    key: 'AMOUNT_INR',
    label: 'Frozen / disputed amount (₹)',
    intakeKey: 'amount_inr',
    // text (not number) so a pasted "₹1,00,000" is cleaned, not silently dropped.
    inputType: 'text',
    placeholder: 'e.g. 25000',
    maxLength: 13,
    labelHi: 'फ्रीज़ / विवादित रकम (₹)',
    placeholderHi: 'जैसे: 25000',
  },
  NCRP_ID: {
    key: 'NCRP_ID',
    label: 'NCRP acknowledgement number (if you have one)',
    intakeKey: 'ncrp_id',
    inputType: 'text',
    placeholder: '14-digit number from cybercrime.gov.in',
    // 14 digits, not all the same (blocks 00000000000000).
    pattern: /^(?!(\d)\1{13})\d{14}$/,
    patternMessage: 'NCRP acknowledgement numbers are 14 digits (not all zeros).',
    maxLength: 14,
    labelHi: 'NCRP पावती नंबर (अगर है तो)',
    placeholderHi: 'cybercrime.gov.in से मिला 14 अंकों का नंबर',
    patternMessageHi: 'NCRP पावती नंबर 14 अंकों का होता है (सारे शून्य नहीं)।',
  },
  NODAL_EMAIL: {
    key: 'NODAL_EMAIL',
    label: 'Nodal officer email (from the official contacts below)',
    intakeKey: 'nodal_email',
    inputType: 'text',
    placeholder: 'Copy from "Official contacts" and verify with your branch',
    pattern: EMAIL_RE,
    patternMessage: 'Enter a valid email address (copy it from the official contacts).',
    maxLength: 120,
    autoComplete: 'email',
    labelHi: 'नोडल अधिकारी का ईमेल (नीचे दिए आधिकारिक संपर्कों से)',
    placeholderHi: '“आधिकारिक संपर्क” से कॉपी करें और शाखा से पक्का करें',
    patternMessageHi: 'सही ईमेल पता लिखें (आधिकारिक संपर्कों से कॉपी करें)।',
  },
};

/**
 * Clean a raw input value before validating/saving, so the way real users write
 * things (spaces, +91, ₹, commas, leading zero) is accepted instead of rejected.
 */
export function normalizePlaceholderValue(key: string, raw: string): string {
  const v = raw.trim();
  switch (key) {
    case 'USER_PHONE': {
      let d = v.replace(/\D/g, '');
      if (d.length === 12 && d.startsWith('91')) d = d.slice(2); // +91XXXXXXXXXX
      else if (d.length === 11 && d.startsWith('0')) d = d.slice(1); // 0XXXXXXXXXX
      return d;
    }
    case 'AMOUNT_INR':
      // Keep the integer rupee part only: "₹1,00,000.50" -> "100000".
      return v.replace(/[^\d.]/g, '').split('.')[0] ?? '';
    case 'ACCOUNT_LAST4':
    case 'NCRP_ID':
      return v.replace(/\D/g, '');
    default:
      return v;
  }
}

/** Placeholders that are NOT user-fillable (driven by other flows). */
export function placeholderExplanation(key: string, locale = 'en'): string | null {
  const hi = locale === 'hi';
  if (key.startsWith('PROOF_GATE_')) {
    return hi
      ? 'यह पत्र तब खुलता है जब आप अपने केस पेज से दर्ज करते हैं कि पिछला पत्र (प्रूफ के साथ) भेज दिया।'
      : 'This letter unlocks after you record that you sent the previous letter (with proof) from your case page.';
  }
  if (key === 'L1_SENT_DATE') {
    return hi
      ? 'यह अपना पहला (L1) पत्र भेजने के बाद भरें — केस पेज पर उसे भेजा हुआ दर्ज करें।'
      : 'Fill this after you send your first (L1) letter — mark it as sent on your case page.';
  }
  if (key === 'L2_SENT_DATE') {
    return hi
      ? 'यह नोडल अधिकारी वाला (L2) पत्र भेजने के बाद भरें — केस पेज पर उसे भेजा हुआ दर्ज करें।'
      : 'Fill this after you send your nodal-officer (L2) letter — mark it as sent on your case page.';
  }
  return null;
}
