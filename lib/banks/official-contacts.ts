/**
 * Official bank grievance contacts — sourced from each bank's published pages.
 *
 * IMPORTANT: Bank contacts change periodically. Every entry has a source URL
 * and a "verified" date. Always tell the user to verify with their branch
 * before sending. Never say "definitely send here."
 *
 * Sources used:
 *  SBI:  https://sbi.bank.in/web/customer-care/contact-us
 *  HDFC: https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?folderPath=/footer/Grievance%20Redressal/
 *  Axis: https://www.axisbank.com/contact-us/banking-ombudsman
 *  ICICI: https://www.icicibank.com/personal-banking/info-centre/service/customer-care/grievance-redressal
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

const BANK_CONTACTS: BankContact[] = [
  {
    bank_slug: 'state-bank-of-india',
    bank_name: 'State Bank of India (SBI)',
    contacts: [
      {
        role: 'SBI Customer Care',
        role_plain: 'General helpline (start here)',
        phone: '1800-11-2211 / 1800-425-3800',
        notes: '24×7 toll-free helplines.',
        source_url: 'https://sbi.bank.in/web/customer-care/contact-us',
        verified_date: '2026-01-01',
        level: 'general',
      },
      {
        role: 'SBI Circle Grievance Cell (Branch escalation)',
        role_plain: 'First letter to your bank branch',
        email: 'customercare@sbi.co.in',
        phone: '1800-1234',
        notes: 'Submit the L1 letter at your home branch. Ask for a written acknowledgement with a grievance reference number.',
        source_url: 'https://sbi.bank.in/web/customer-care/contact-us',
        verified_date: '2026-01-01',
        level: 'L1',
      },
      {
        role: 'SBI Nodal Officer (GM Customer Service)',
        role_plain: 'Escalation if branch does not respond in 7 days',
        email: 'gm.customer@sbi.co.in',
        notes: 'Use for L2 escalation. Verify this email with your branch before sending — bank emails change.',
        source_url: 'https://sbi.bank.in/web/customer-care/addresses-and-helpline-nos-of-grievances-redressal-cell',
        verified_date: '2026-01-01',
        level: 'L2',
      },
      {
        role: 'SBI Principal Nodal Officer',
        role_plain: 'Final internal escalation before Ombudsman',
        email: 'pno@sbi.co.in',
        notes: 'Use only if nodal officer also does not respond. Verify before sending.',
        source_url: 'https://sbi.bank.in/web/customer-care/contact-us',
        verified_date: '2026-01-01',
        level: 'L2',
      },
      {
        role: 'RBI Banking Ombudsman (RBI CMS)',
        role_plain: 'Official government complaint route — after 30 days of no response',
        portal: 'https://cms.rbi.org.in',
        phone: '14448',
        notes: 'File online at cms.rbi.org.in after 30 days of unresolved bank complaint. Free to file.',
        source_url: 'https://www.rbi.org.in/Scripts/Complaints.aspx',
        verified_date: '2026-01-01',
        level: 'L3',
      },
      {
        role: 'GRM — Cyber Freeze Grievance Redressal',
        role_plain: 'Official government GRM for wrongly frozen accounts',
        portal: 'https://ncrp-grievanceredressal.mha.gov.in/',
        notes: 'Primary route for NCRP/cyber-fraud freezes. File through your bank branch or at this portal.',
        source_url: 'https://ncrp-grievanceredressal.mha.gov.in/',
        verified_date: '2026-01-01',
        level: 'L1',
      },
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
        source_url: 'https://www.hdfcbank.com/contact-us',
        verified_date: '2026-01-01',
        level: 'general',
      },
      {
        role: 'HDFC Grievance Redressal (Branch)',
        role_plain: 'First letter to your branch',
        email: 'support@hdfcbank.com',
        notes: 'Submit L1 letter at your home HDFC branch.',
        source_url: 'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?folderPath=/footer/Grievance%20Redressal/',
        verified_date: '2026-01-01',
        level: 'L1',
      },
      {
        role: 'HDFC Nodal Officer',
        role_plain: 'Escalation if branch ignores L1',
        email: 'nodal.officer@hdfcbank.com',
        notes: 'Use for L2. Verify email on official HDFC grievance page before sending.',
        source_url: 'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?folderPath=/footer/Grievance%20Redressal/',
        verified_date: '2026-01-01',
        level: 'L2',
      },
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
        source_url: 'https://www.axisbank.com/contact-us',
        verified_date: '2026-01-01',
        level: 'general',
      },
      {
        role: 'Axis Nodal Officer',
        role_plain: 'Escalation after branch non-response',
        email: 'nodaloffcer@axisbank.com',
        notes: 'Verify spelling and current email on the official Axis grievance page before sending.',
        source_url: 'https://www.axisbank.com/contact-us/banking-ombudsman',
        verified_date: '2026-01-01',
        level: 'L2',
      },
      {
        role: 'Axis Principal Nodal Officer',
        role_plain: 'Final internal step before Ombudsman',
        email: 'pno@axisbank.com',
        notes: 'Use only after nodal officer is also unresponsive. Verify before sending.',
        source_url: 'https://www.axisbank.com/contact-us/banking-ombudsman',
        verified_date: '2026-01-01',
        level: 'L2',
      },
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
        source_url: 'https://www.icicibank.com/contact-us',
        verified_date: '2026-01-01',
        level: 'general',
      },
      {
        role: 'ICICI Nodal Officer',
        role_plain: 'Escalation after branch non-response',
        email: 'nodaloffcer@icicibank.com',
        notes: 'Verify current email at ICICI grievance redressal page before sending.',
        source_url: 'https://www.icicibank.com/personal-banking/info-centre/service/customer-care/grievance-redressal',
        verified_date: '2026-01-01',
        level: 'L2',
      },
    ],
  },
];

export function getBankContacts(bankSlug: string): BankContact | null {
  return BANK_CONTACTS.find((b) => b.bank_slug === bankSlug) ?? null;
}

export function getAllBankSlugs(): string[] {
  return BANK_CONTACTS.map((b) => b.bank_slug);
}

export { BANK_CONTACTS };
