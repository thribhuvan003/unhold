/**
 * Official bank grievance contacts — VERIFIED entries only.
 *
 * Rules (product spec — "Contact Finder Agent"):
 *  - Never guess an email. If an email could not be verified on an official
 *    page, list the official page/portal instead of an email.
 *  - Every entry carries a source URL and the date it was last verified.
 *  - Always tell the user to verify with their branch before sending.
 *
 * Last verification pass: 2026-07-02 (web check of official pages + live HTTP checks).
 * Findings from that pass:
 *  - The *.bank.in domains (sbi.bank.in, hdfc.bank.in, axis.bank.in,
 *    icici.bank.in) are the RBI-mandated official bank domains and all resolve
 *    live (hdfcbank.com now redirects to hdfc.bank.in). An external audit
 *    claiming they are phishing domains was checked and found WRONG — do not
 *    "fix" them back to legacy .com/.co.in without a live HTTP check.
 *  - Contact EMAILS remain on the banks' legacy mail domains
 *    (@sbi.co.in, @axisbank.com, @icicibank.com).
 *  - SBI PNO email is gm.customer@sbi.co.in (022-22741216). The previously
 *    listed pno@sbi.co.in could not be verified and was removed.
 *  - Axis PNO email is pno@axisbank.com (080-61865098). The previously listed
 *    nodal.officer@axis.bank.in / pno@axis.bank.in could not be verified.
 *  - ICICI PNO email is headservicequality@icicibank.com (022-40088027).
 *  - HDFC publishes region-wise nodal emails behind an official page; no
 *    single verified email — the page is linked instead.
 */

export type BankContact = {
  bank_slug: string;
  bank_name: string;
  contacts: ContactEntry[];
};

export type ContactEntry = {
  role: string;
  role_plain: string; // plain-English label
  email?: string;
  phone?: string;
  portal?: string;
  notes?: string;
  source_url: string;
  verified_date: string; // ISO date — when this was last verified
  level: 'L1' | 'L2' | 'L3' | 'general';
};

const VERIFIED = '2026-07-02';

/** Bank-agnostic official routes shown for every bank. */
function officialRoutes(): ContactEntry[] {
  return [
    {
      role: 'National Cyber Crime Reporting Portal (NCRP)',
      role_plain: 'Official citizen portal for reporting cybercrime and accessing NCRP',
      portal: 'https://www.cybercrime.gov.in/',
      notes:
        'Use the public citizen portal to report cybercrime or access NCRP. For a frozen account, also submit a written request at your bank branch and obtain acknowledgement. Do not use the separate CFCFRMS staff-login portal.',
      source_url: 'https://www.cybercrime.gov.in/',
      verified_date: VERIFIED,
      level: 'L1',
    },
    {
      role: 'RBI Banking Ombudsman (RBI CMS)',
      role_plain: 'Free government complaint route — after 30 days of no bank resolution',
      portal: 'https://cms.rbi.org.in',
      phone: '14448',
      notes: 'File online at cms.rbi.org.in after 30 days of unresolved bank complaint. Free to file.',
      source_url: 'https://www.rbi.org.in/Scripts/Complaints.aspx',
      verified_date: VERIFIED,
      level: 'L3',
    },
  ];
}

const BANK_CONTACTS: BankContact[] = [
  {
    bank_slug: 'state-bank-of-india',
    bank_name: 'State Bank of India (SBI)',
    contacts: [
      {
        role: 'SBI Customer Care',
        role_plain: 'General helpline (start here)',
        phone: '1800-1234 / 1800-2100 / 1800-11-2211 / 1800-425-3800',
        notes: '24×7 toll-free helplines. SMS complaint status: 567676.',
        source_url: 'https://sbi.bank.in/web/customer-care/contact-us',
        verified_date: VERIFIED,
        level: 'general',
      },
      {
        role: 'SBI Customer Care Email',
        role_plain: 'General complaint inbox; submit your L1 letter at your branch first',
        email: 'customercare@sbi.co.in',
        notes:
          'Official complaint email (also contactcentre@sbi.co.in). Submit the L1 letter at your home branch first and get an acknowledgement.',
        source_url: 'https://sbi.bank.in/web/customer-care/contact-us',
        verified_date: VERIFIED,
        level: 'general',
      },
      {
        role: 'SBI Network Grievance Redressal Nodal Officers',
        role_plain: 'Published escalation contacts if the branch response is inadequate — find your circle',
        portal: 'https://sbi.bank.in/web/customer-care/addresses-and-helpline-nos-of-grievances-redressal-cell',
        notes:
          'SBI lists nodal officers per circle (region). Open this official page, find your circle, and use that officer. Verify with your branch.',
        source_url:
          'https://sbi.bank.in/web/customer-care/addresses-and-helpline-nos-of-grievances-redressal-cell',
        verified_date: VERIFIED,
        level: 'L2',
      },
      {
        role: 'SBI Principal Nodal Officer (GM Customer Service)',
        role_plain: 'Final internal escalation before the RBI Ombudsman',
        email: 'gm.customer@sbi.co.in',
        phone: '022-22741216',
        notes:
          'Customer Service Dept, State Bank Bhavan, Mumbai. Use only if the nodal officer also does not respond. Verify before sending.',
        source_url: 'https://sbi.bank.in/web/customer-care/contact-us',
        verified_date: VERIFIED,
        level: 'L2',
      },
      ...officialRoutes(),
    ],
  },
  {
    bank_slug: 'hdfc-bank',
    bank_name: 'HDFC Bank',
    contacts: [
      {
        role: 'HDFC Customer Care',
        role_plain: 'General helpline',
        phone: '1800-202-6161 / 1800-258-3838',
        source_url: 'https://www.hdfc.bank.in/contact-us/call-us',
        verified_date: VERIFIED,
        level: 'general',
      },
      {
        role: 'HDFC Grievance Redressal (online form + branch)',
        role_plain: 'First complaint — use your home branch and this official form',
        portal: 'https://www.hdfc.bank.in/need-help/grievance-redressal',
        notes:
          'Submit the L1 letter at your home HDFC branch and lodge the complaint on this official page to get a reference number. HDFC does not publish one single grievance email — do not trust emails from other sites.',
        source_url: 'https://www.hdfc.bank.in/need-help/grievance-redressal',
        verified_date: VERIFIED,
        level: 'L1',
      },
      {
        role: 'HDFC Nodal Officers (region-wise)',
        role_plain: 'Escalation if the branch does not respond — find your region',
        portal: 'https://www.hdfc.bank.in/contact-us/email-id-for-nodal-officers',
        notes:
          'HDFC lists nodal-officer emails by region on this official page. Pick your region there. Principal Nodal Officer: Mr. Ripal Kirtikumar Sheth, Peninsula Business Park, Lower Parel, Mumbai 400013.',
        source_url: 'https://www.hdfc.bank.in/contact-us/email-id-for-nodal-officers',
        verified_date: VERIFIED,
        level: 'L2',
      },
      ...officialRoutes(),
    ],
  },
  {
    bank_slug: 'axis-bank',
    bank_name: 'Axis Bank',
    contacts: [
      {
        role: 'Axis Customer Care',
        role_plain: 'General helpline',
        phone: '1800-209-5577 / 1860-419-5555',
        source_url: 'https://www.axis.bank.in/contact-us',
        verified_date: VERIFIED,
        level: 'general',
      },
      {
        role: 'Axis Grievance Redressal Officer (GRO)',
        role_plain: 'Escalation if the branch does not respond — official GRO page',
        portal: 'https://application.axis.bank.in/Webforms/axis-support/GRODetails.aspx',
        notes:
          'Axis publishes GRO details on this official page. Use it to escalate after the branch. Verify with your branch.',
        source_url: 'https://application.axis.bank.in/Webforms/axis-support/GRODetails.aspx',
        verified_date: VERIFIED,
        level: 'L2',
      },
      {
        role: 'Axis Principal Nodal Officer',
        role_plain: 'Final internal escalation before the RBI Ombudsman',
        email: 'pno@axisbank.com',
        phone: '080-61865098',
        notes:
          'PNO office: Axis Bank, Gigaplex, Airoli Knowledge Park, Navi Mumbai. Mon–Sat 9:30–17:30 (except 2nd/4th Sat). Verify before sending.',
        source_url: 'https://www.axis.bank.in/contact-us/banking-ombudsman',
        verified_date: VERIFIED,
        level: 'L2',
      },
      ...officialRoutes(),
    ],
  },
  {
    bank_slug: 'icici-bank',
    bank_name: 'ICICI Bank',
    contacts: [
      {
        role: 'ICICI Customer Care',
        role_plain: 'General helpline',
        phone: '1800-1080',
        source_url: 'https://www.icici.bank.in/contact-us',
        verified_date: VERIFIED,
        level: 'general',
      },
      {
        role: 'ICICI Grievance Redressal (online form + branch)',
        role_plain: 'First complaint — use your home branch and this official form',
        portal: 'https://nli.icicibank.com/NewRetailWeb/complaint.htm',
        notes:
          'Submit the L1 letter at your home ICICI branch and lodge the complaint on this official page to get a reference number. If unresolved in 7 working days, write to the Nodal Officer, ICICI Bank Ltd, Bandra Kurla Complex, Mumbai 400051.',
        source_url: 'https://www.icici.bank.in/personal-banking/loans/cardless-emi/grievance-redressal',
        verified_date: VERIFIED,
        level: 'L1',
      },
      {
        role: 'ICICI Principal Nodal Officer (Head Service Quality)',
        role_plain: 'Final internal escalation before the RBI Ombudsman',
        email: 'headservicequality@icicibank.com',
        phone: '022-40088027',
        notes:
          'PNO: Mr. Vinayak M More, Bandra Kurla Complex, Mumbai. Mon–Fri 10:00–17:00 excluding bank holidays. Verify before sending.',
        source_url: 'https://www.icici.bank.in/personal-banking/loans/cardless-emi/grievance-redressal',
        verified_date: VERIFIED,
        level: 'L2',
      },
      ...officialRoutes(),
    ],
  },
];

export function getBankContacts(bankSlug: string): BankContact | null {
  return BANK_CONTACTS.find((b) => b.bank_slug === bankSlug) ?? null;
}

export function getAllBankSlugs(): string[] {
  return BANK_CONTACTS.map((b) => b.bank_slug);
}

/**
 * Location-aware regional grievance contact resolver.
 * 
 * Philosophy (2026 research + project rules):
 * - Primary recommendation for almost every case: Take the sealed bundle + letter 
 *   IN PERSON to the nearest branch and get a stamped acknowledgement.
 *   This is what real users and SOP say gives the best response/audit trail.
 * - Email is backup / escalation.
 * - For SBI: We can resolve to the correct Circle LHO (Local Head Office) grievance email 
 *   if we have state/city. These are the published official channels.
 * - For other banks: Use the best verified PNO / regional portal. Never guess branch manager emails.
 * - Always tell the user: Verify with your branch. These are public official sources.
 *
 * Latest verified data: 2026-07 (SBI circle LHOs from official sbi.co.in pages).
 */

export type Location = {
  state?: string;
  city?: string;
  pincode?: string;
};

type RegionalContact = {
  email?: string;
  portal?: string;
  phone?: string;
  role_plain: string;
  notes: string;
  recommendedAction: 'branch_visit_primary' | 'email_backup';
  source_url: string;
  verified_date: string;
};

// SBI Circle mapping (state or major city → circle code + email)
// Source: Official SBI grievance cell pages (verified 2026)
const SBI_CIRCLE_MAP: Record<string, { circle: string; email: string; display: string }> = {
  // Gujarat
  'gujarat': { circle: 'ahmedabad', email: 'agmcustomer.lhoahm@sbi.co.in', display: 'Ahmedabad Circle (Gujarat)' },
  'ahmedabad': { circle: 'ahmedabad', email: 'agmcustomer.lhoahm@sbi.co.in', display: 'Ahmedabad Circle' },
  // Andhra Pradesh (Amaravati circle) vs Telangana (separate Hyderabad circle —
  // verified 2026-07-05 on SBI's official grievance list, agmcustomer.lhohyd).
  'andhra pradesh': { circle: 'amaravati', email: 'agmcustomer.lhoand@sbi.co.in', display: 'Amaravati Circle (Andhra Pradesh)' },
  'amaravati': { circle: 'amaravati', email: 'agmcustomer.lhoand@sbi.co.in', display: 'Amaravati Circle' },
  'telangana': { circle: 'hyderabad', email: 'agmcustomer.lhohyd@sbi.co.in', display: 'Hyderabad Circle (Telangana)' },
  'hyderabad': { circle: 'hyderabad', email: 'agmcustomer.lhohyd@sbi.co.in', display: 'Hyderabad Circle' },
  // Karnataka
  'karnataka': { circle: 'bengaluru', email: 'agmcustomer.lhoban@sbi.co.in', display: 'Bengaluru Circle (Karnataka)' },
  'bengaluru': { circle: 'bengaluru', email: 'agmcustomer.lhoban@sbi.co.in', display: 'Bengaluru Circle' },
  'bangalore': { circle: 'bengaluru', email: 'agmcustomer.lhoban@sbi.co.in', display: 'Bengaluru Circle' },
  // Madhya Pradesh
  'madhya pradesh': { circle: 'bhopal', email: 'agmcustomer.lhobho@sbi.co.in', display: 'Bhopal Circle (Madhya Pradesh)' },
  'bhopal': { circle: 'bhopal', email: 'agmcustomer.lhobho@sbi.co.in', display: 'Bhopal Circle' },
  // Odisha
  'odisha': { circle: 'bhubaneswar', email: 'agmcustomer.lhobhu@sbi.co.in', display: 'Bhubaneswar Circle (Odisha)' },
  'bhubaneswar': { circle: 'bhubaneswar', email: 'agmcustomer.lhobhu@sbi.co.in', display: 'Bhubaneswar Circle' },
  // Punjab, Haryana, Chandigarh, Himachal, J&K
  'punjab': { circle: 'chandigarh', email: 'agmcustomer.lhocha@sbi.co.in', display: 'Chandigarh Circle' },
  'haryana': { circle: 'chandigarh', email: 'agmcustomer.lhocha@sbi.co.in', display: 'Chandigarh Circle' },
  'chandigarh': { circle: 'chandigarh', email: 'agmcustomer.lhocha@sbi.co.in', display: 'Chandigarh Circle' },
  'himachal pradesh': { circle: 'chandigarh', email: 'agmcustomer.lhocha@sbi.co.in', display: 'Chandigarh Circle' },
  // Delhi NCR
  'delhi': { circle: 'delhi', email: 'agmcustomer.lhodel@sbi.co.in', display: 'Delhi Circle' },
  'new delhi': { circle: 'delhi', email: 'agmcustomer.lhodel@sbi.co.in', display: 'Delhi Circle' },
  'ncr': { circle: 'delhi', email: 'agmcustomer.lhodel@sbi.co.in', display: 'Delhi Circle' },
  // West Bengal
  'west bengal': { circle: 'kolkata', email: 'agmcustomer.lhokol@sbi.co.in', display: 'Kolkata Circle (West Bengal)' },
  'kolkata': { circle: 'kolkata', email: 'agmcustomer.lhokol@sbi.co.in', display: 'Kolkata Circle' },
  // Maharashtra
  // SBI splits Maharashtra: Mumbai Metro (MMR) is its own circle (lhomum); the
  // rest of the state is the Maharashtra circle (lhomah). Verified 2026-07-05.
  'maharashtra': { circle: 'maharashtra', email: 'agmcustomer.lhomah@sbi.co.in', display: 'Maharashtra Circle' },
  'mumbai': { circle: 'mumbai', email: 'agmcustomer.lhomum@sbi.co.in', display: 'Mumbai Metro Circle' },
  'pune': { circle: 'maharashtra', email: 'agmcustomer.lhomah@sbi.co.in', display: 'Maharashtra Circle' },
  // Tamil Nadu
  // Chennai circle email is lhoche (NOT lhochen — that was a dead address).
  'tamil nadu': { circle: 'chennai', email: 'agmcustomer.lhoche@sbi.co.in', display: 'Chennai Circle (Tamil Nadu)' },
  'chennai': { circle: 'chennai', email: 'agmcustomer.lhoche@sbi.co.in', display: 'Chennai Circle' },
  // Rajasthan
  'rajasthan': { circle: 'jaipur', email: 'agmcustomer.lhojai@sbi.co.in', display: 'Jaipur Circle (Rajasthan)' },
  'jaipur': { circle: 'jaipur', email: 'agmcustomer.lhojai@sbi.co.in', display: 'Jaipur Circle' },
  // Uttar Pradesh
  'uttar pradesh': { circle: 'lucknow', email: 'agmcustomer.lholuc@sbi.co.in', display: 'Lucknow Circle (Uttar Pradesh)' },
  'lucknow': { circle: 'lucknow', email: 'agmcustomer.lholuc@sbi.co.in', display: 'Lucknow Circle' },
  'kanpur': { circle: 'lucknow', email: 'agmcustomer.lholuc@sbi.co.in', display: 'Lucknow Circle' },
  // Bihar
  'bihar': { circle: 'patna', email: 'agmcustomer.lhopat@sbi.co.in', display: 'Patna Circle (Bihar)' },
  'patna': { circle: 'patna', email: 'agmcustomer.lhopat@sbi.co.in', display: 'Patna Circle' },
  // Kerala
  'kerala': { circle: 'thiruvananthapuram', email: 'agmcustomer.lhotri@sbi.co.in', display: 'Thiruvananthapuram Circle (Kerala)' },
  'thiruvananthapuram': { circle: 'thiruvananthapuram', email: 'agmcustomer.lhotri@sbi.co.in', display: 'Thiruvananthapuram Circle' },
  'kochi': { circle: 'thiruvananthapuram', email: 'agmcustomer.lhotri@sbi.co.in', display: 'Thiruvananthapuram Circle' },
  // Assam / North East — SBI's North Eastern circle (Guwahati) serves all seven states
  'assam': { circle: 'guwahati', email: 'agmcustomer.lhoguw@sbi.co.in', display: 'Guwahati Circle (Assam & NE)' },
  'guwahati': { circle: 'guwahati', email: 'agmcustomer.lhoguw@sbi.co.in', display: 'Guwahati Circle' },
  'arunachal pradesh': { circle: 'guwahati', email: 'agmcustomer.lhoguw@sbi.co.in', display: 'Guwahati Circle (Assam & NE)' },
  'meghalaya': { circle: 'guwahati', email: 'agmcustomer.lhoguw@sbi.co.in', display: 'Guwahati Circle (Assam & NE)' },
  'manipur': { circle: 'guwahati', email: 'agmcustomer.lhoguw@sbi.co.in', display: 'Guwahati Circle (Assam & NE)' },
  'mizoram': { circle: 'guwahati', email: 'agmcustomer.lhoguw@sbi.co.in', display: 'Guwahati Circle (Assam & NE)' },
  'nagaland': { circle: 'guwahati', email: 'agmcustomer.lhoguw@sbi.co.in', display: 'Guwahati Circle (Assam & NE)' },
  'tripura': { circle: 'guwahati', email: 'agmcustomer.lhoguw@sbi.co.in', display: 'Guwahati Circle (Assam & NE)' },
  // Chhattisgarh
  'chhattisgarh': { circle: 'raipur', email: 'agmcustomer.lhoraipur@sbi.co.in', display: 'Raipur Circle (Chhattisgarh)' },
  'raipur': { circle: 'raipur', email: 'agmcustomer.lhoraipur@sbi.co.in', display: 'Raipur Circle' },
  // Jharkhand
  'jharkhand': { circle: 'ranchi', email: 'agmcustomer.lhoranchi@sbi.co.in', display: 'Ranchi Circle (Jharkhand)' },
  'ranchi': { circle: 'ranchi', email: 'agmcustomer.lhoranchi@sbi.co.in', display: 'Ranchi Circle' },
  // Add more as needed. The map is extensive for peak India coverage.
  // Fallback always directs to official list + branch visit.
};

/**
 * Returns the best regional grievance contact for the user's bank + location.
 * Prioritizes official published channels.
 * Always recommends branch visit as primary action.
 */
export function getRegionalGrievanceContact(
  bankSlug: string,
  location?: Location
): RegionalContact {
  const bank = getBankContacts(bankSlug);
  if (!bank) {
    return {
      role_plain: 'Official citizen cybercrime portal',
      notes: 'Use the public NCRP portal to report cybercrime or access NCRP, and visit your nearest branch with the evidence bundle for a written acknowledgement.',
      recommendedAction: 'branch_visit_primary',
      portal: 'https://www.cybercrime.gov.in/',
      source_url: 'https://www.cybercrime.gov.in/',
      verified_date: VERIFIED,
    };
  }

  const loc = location || {};
  const stateKey = (loc.state || '').toLowerCase().trim();
  const cityKey = (loc.city || '').toLowerCase().trim();
  const pin = (loc.pincode || '').trim();

  // === SBI special handling (best data) ===
  if (bankSlug === 'state-bank-of-india') {
    const match = SBI_CIRCLE_MAP[stateKey] || SBI_CIRCLE_MAP[cityKey];

    if (match) {
      const pinNote = pin ? ` For pincode ${pin}: Use the official SBI Branch Locator (https://sbi.bank.in/web/home/locator/branch?pincode=${pin}) to identify your exact branch and manager. Visit in person with bundle as primary.` : '';
      return {
        email: match.email,
        role_plain: `SBI ${match.display} Grievance (LHO)`,
        notes: `This is the published official grievance email for your circle. Best first action: Take your sealed bundle + letter in person to your nearest branch and get a stamped acknowledgement. Use this email as written follow-up / escalation if needed.${pinNote}`,
        recommendedAction: 'branch_visit_primary',
        source_url: 'https://sbi.bank.in/web/customer-care/addresses-and-helpline-nos-of-grievances-redressal-cell',
        verified_date: VERIFIED,
      };
    }

    // Fallback for SBI: direct to circle list
    return {
      portal: 'https://sbi.bank.in/web/customer-care/addresses-and-helpline-nos-of-grievances-redressal-cell',
      role_plain: 'SBI Circle / LHO Grievance Officer',
      notes: 'Find your exact circle (state/region) on the official SBI page. Best action: Visit your nearest branch with the sealed bundle in person. Email the circle LHO as backup.',
      recommendedAction: 'branch_visit_primary',
      source_url: 'https://sbi.bank.in/web/customer-care/addresses-and-helpline-nos-of-grievances-redressal-cell',
      verified_date: VERIFIED,
    };
  }

  // === Other banks: Use best verified + strong branch recommendation ===
  if (bankSlug === 'hdfc-bank') {
    return {
      portal: 'https://www.hdfc.bank.in/contact-us/email-id-for-nodal-officers',
      role_plain: 'HDFC Regional Nodal Officer',
      notes: 'HDFC publishes region-wise contacts. Primary recommendation: Visit your nearest branch with the sealed bundle + letter and obtain acknowledgement. Use the official regional page to find the correct nodal email for your state/city as written follow-up.',
      recommendedAction: 'branch_visit_primary',
      source_url: 'https://www.hdfc.bank.in/contact-us/email-id-for-nodal-officers',
      verified_date: VERIFIED,
    };
  }

  if (bankSlug === 'axis-bank') {
    return {
      email: 'pno@axisbank.com',
      role_plain: 'Axis Circle / Regional Nodal Officer',
      notes: 'Visit your nearest branch in person with the sealed bundle first (get acknowledgement). Use pno@axisbank.com or the circle nodal (listed on official site) for escalation. Always verify the exact address with your branch.',
      recommendedAction: 'branch_visit_primary',
      source_url: 'https://www.axis.bank.in/contact-us',
      verified_date: VERIFIED,
    };
  }

  if (bankSlug === 'icici-bank') {
    return {
      email: 'headservicequality@icicibank.com',
      role_plain: 'ICICI Principal Nodal / Regional Grievance',
      notes: 'Go to your nearest branch with the bundle + letter (best response path). Escalate to headservicequality@icicibank.com if needed. Confirm regional contact on ICICI\'s official grievance page.',
      recommendedAction: 'branch_visit_primary',
      source_url: 'https://www.icici.bank.in/personal-banking/loans/cardless-emi/grievance-redressal',
      verified_date: VERIFIED,
    };
  }

  // Generic safe fallback
  return {
    portal: 'https://www.cybercrime.gov.in/',
    role_plain: 'Bank grievance and official cybercrime reporting',
    notes: 'Take your evidence bundle and letter to the nearest branch and request acknowledgement. Use published bank contacts for written follow-up. Use the public NCRP portal to report cybercrime or access NCRP; it is not an account-unfreeze portal.',
    recommendedAction: 'branch_visit_primary',
    source_url: 'https://www.cybercrime.gov.in/',
    verified_date: VERIFIED,
  };
}

export { BANK_CONTACTS };
