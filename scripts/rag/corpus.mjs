// scripts/rag/corpus.mjs
// Curated knowledge corpus for Unhold's RAG knowledge base, distilled from
// docs/RESEARCH_FREEZE_DOMAIN.md (compiled 2026-06-25).
//
// Tagging rules (enforced at ingest + by the drafter):
//  - source_type court|regulator  + confidence high  -> citable as legal grounding
//  - source_type community_*/consumer_press          -> expectation-setting ONLY, never a legal claim
//  - currency 'verify'                                -> unconfirmed; never asserted as fact in user copy
//
// Keep each chunk one idea, tightly scoped. Edit here, then re-run ingest.mjs.

export const CORPUS = [
  // ── Group A — intake classification ────────────────────────────────────────
  {
    key: 'freeze_type_taxonomy',
    title: 'Three restriction types: lien vs debit-freeze vs total freeze',
    content:
      'Bank notices use terms such as lien, debit restriction, debit freeze, or freeze inconsistently. Do not infer the legal effect or lawfulness from the label alone. Ask the bank in writing for the exact restriction (what transactions are blocked), amount, effective date, ordering authority, and complaint/FIR/NCRP or bank reference. A court/ED/tax order can have a different route and needs professional legal advice.',
    source: 'Product safety rule; terminology and legal effect require the underlying bank/authority record',
    source_url: '',
    source_type: 'internal',
    confidence: 'high',
    currency: 'current',
    tags: ['freeze-type', 'lien', 'debit-freeze', 'classification'],
    intended_use: ['intake_classification', 'letter_grounding'],
  },
  {
    key: 'cause_cyber_money_trail',
    title: 'Why innocent receivers get frozen: the cyber-fraud money trail',
    content:
      'A fraud victim reports on the NCRP portal (cybercrime.gov.in) or 1930 helpline. This feeds the CFCFRMS, run by I4C under the MHA, which auto-traces the stolen money through successive accounts — Layer 1 (first recipient), Layer 2, Layer 3 — and sends freeze/lien requests to each layer\'s bank, usually with no prior notice. Innocent merchants, sellers, and freelancers routinely get caught at Layer 2/3 after a normal sale or UPI payment.',
    source: 'I4C/MHA (i4c.mha.gov.in); Moneylife',
    source_url: 'https://i4c.mha.gov.in/ncrp.aspx',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['cause', 'cyber', 'money-trail', 'layer', 'upi'],
    intended_use: ['intake_classification', 'next_steps_guidance'],
  },
  {
    key: 'cause_mule_flag',
    title: 'Mule-account flagging (MuleHunter.AI / Suspect Registry)',
    content:
      'An account can be frozen because it was algorithmically flagged as a possible "mule". RBI\'s MuleHunter.AI ML detection was deployed across 15-23+ banks by 2025, and the I4C Suspect Registry (Sep 2024) flagged ~24 lakh mule accounts. Being flagged is suspicion, not proof — an innocent holder rebuts it with evidence of legitimate fund sources and normal activity.',
    source: 'MediaNama RTI (Dec-2025); I4C Suspect Registry',
    source_url: 'https://www.medianama.com/2025/12/223-rti-23-banks-mulehunter-mule-accounts/',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['cause', 'mule', 'flagging'],
    intended_use: ['intake_classification'],
  },
  {
    key: 'cause_non_cyber_out_of_scope',
    title: 'Non-cyber freezes route OUT of the copy-only flow',
    content:
      'GST/Income-Tax attachments, court orders, and ED/PMLA attachments are different statutes with different remedies and require a lawyer. Unhold is copy-only and scoped to the cyber-fraud-trail lien on an innocent receiver. If the freeze is tax/court/ED-driven, flag it as out of scope and advise professional legal help rather than the L1-L4 letter ladder.',
    source: 'docs/RESEARCH_FREEZE_DOMAIN.md §2.2',
    source_url: '',
    source_type: 'internal',
    confidence: 'high',
    currency: 'current',
    tags: ['cause', 'out-of-scope', 'gst', 'court', 'ed-pmla'],
    intended_use: ['intake_classification'],
  },
  {
    key: 'am_i_in_scope',
    title: 'Scope decision: is this an Unhold case?',
    content:
      'IN SCOPE: a cyber-fraud-trail lien/freeze on an innocent receiver (you received money via a normal sale/transfer and a downstream complaint froze your account). OUT OF SCOPE: ED/PMLA, court-ordered, or tax-attachment freezes — these need a lawyer. The strongest in-scope signal is a small disputed amount relative to a whole-account freeze, plus an NCRP/complaint reference from a cyber cell.',
    source: 'docs/RESEARCH_FREEZE_DOMAIN.md §7',
    source_url: '',
    source_type: 'internal',
    confidence: 'high',
    currency: 'current',
    tags: ['scope', 'decision', 'innocent-receiver'],
    intended_use: ['intake_classification'],
  },

  // ── Group B — letter grounding (court/regulator facts) ─────────────────────
  {
    key: 'bnss_106_vs_107',
    title: 'BNSS §106 (seizure) vs §107 (Magistrate attachment)',
    content:
      'BNSS terminology and the authority behind a bank restriction are legal questions. Do not tell a user that a particular BNSS section makes their restriction lawful or unlawful. Ask for the written bank notice and ordering-authority reference, and advise a lawyer for a court, ED/PMLA, tax, or unclear authority order. Court decisions are jurisdiction- and fact-specific.',
    source: 'BNSS 2023; product safety rule',
    source_url: '',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['bnss', 'section-106', 'section-107', 'legal'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'case_bombay_kartik_chatur',
    title: 'Bombay HC — Kartik Chatur v. UoI (20-Nov-2025)',
    content:
      'Secondary reporting describes a Bombay High Court decision concerning a debit-freeze under §106 BNSS. Treat it as a case-specific legal lead for a qualified lawyer, not as a nationwide rule or a promise that a user is entitled to a lien-only restriction. Unhold should not quote it in a user letter without primary judgment verification and jurisdiction-specific review.',
    source: 'Secondary report of Bombay HC decision; primary judgment verification required',
    source_url: 'https://www.scconline.com/blog/post/2025/12/01/investigating-agency-cannot-debit-freeze-account-u-s-106-bnss-bom-hc/',
    source_type: 'legal_secondary',
    confidence: 'med',
    currency: 'verify',
    tags: ['case-law', 'bombay-hc', 'debit-freeze', 'lien-only'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'case_delhi_malabar',
    title: 'Delhi HC — Malabar Gold v. UoI (16-Jan-2026)',
    content:
      'Secondary reporting describes a Delhi High Court decision involving a §106 BNSS bank restriction. It may be relevant to legal counsel in a matching fact pattern and jurisdiction, but it does not let Unhold declare another user\'s restriction invalid or promise a release. Verify the primary judgment before relying on it in user-facing material.',
    source: 'Secondary report of Delhi HC decision; primary judgment verification required',
    source_url: 'https://www.scconline.com/blog/post/2026/02/03/del-hc-on-legality-of-bank-account-freezing-under-bnss/',
    source_type: 'legal_secondary',
    confidence: 'med',
    currency: 'verify',
    tags: ['case-law', 'delhi-hc', 'innocent-holder', 'lien-only'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'case_cbi_joney',
    title: 'Delhi trial court — CBI v. Joney (16-Mar-2026)',
    content:
      'Secondary reporting describes a Delhi trial-court outcome in a particular cyber-fraud case. It is not a general route to de-freeze an account and must not be turned into a product promise. A lawyer must verify the judgment, facts, and applicable jurisdiction.',
    source: 'Secondary report of Delhi trial-court outcome; primary order verification required',
    source_url: 'https://www.scconline.com/blog/post/2026/03/24/delhi-court-illegal-freezing-of-bank-accounts-bnss-usd-40-million-international-cyber-fraud/',
    source_type: 'legal_secondary',
    confidence: 'med',
    currency: 'verify',
    tags: ['case-law', 'delhi', 'tainted-link', 'section-107'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'case_allahabad_amount_limited',
    title: 'Allahabad HC — Ashish Rawat v. UoI (08-Apr-2026) [nuance]',
    content:
      'Secondary reporting describes an Allahabad High Court decision under §106 BNSS. It illustrates that reported decisions can differ by facts and jurisdiction; it does not create a product rule that every restriction must be amount-limited. Verify the primary decision and obtain legal advice before relying on it.',
    source: 'Secondary report of Allahabad HC decision; primary judgment verification required',
    source_url: 'https://supremetoday.ai/allahabad-hc-no-prior-notice-s106-bnss-bank-freeze-20260413004',
    source_type: 'legal_secondary',
    confidence: 'med',
    currency: 'verify',
    tags: ['case-law', 'allahabad-hc', 'amount-limited', 'conflict'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'lien_only_principle',
    title: 'Do not promise a lien-only outcome',
    content:
      'Do not promise that a whole-account restriction will be converted to a lien, or say that a lien is always the lawful result. Some reported court decisions may be relevant to a lawyer in a particular jurisdiction, but Unhold should only help the user request exact written restriction details, authority, reference, amount, and review route.',
    source: 'Product safety rule; court outcomes require jurisdiction-specific legal review',
    source_url: '',
    source_type: 'internal',
    confidence: 'high',
    currency: 'current',
    tags: ['lien-only', 'principle', 'core-lever'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'mha_sop_2026',
    title: 'MHA/I4C account-freeze SOP (02-Jan-2026)',
    content:
      'MHA has publicly confirmed that an NCRP/CFCFRMS SOP was issued on 02-Jan-2026. Unhold has not located a public primary SOP text that establishes universal citizen-facing rules on lien-only treatment, 7/15/90-day deadlines, automatic escalation or release, or refunds below ₹50,000. Do not state those details as entitlements, predictions, or product rules. Ask the bank/authority for the current written route and response.',
    source: 'MHA parliamentary reply confirming SOP issuance; detailed public SOP text not established for product use',
    source_url: 'https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/RS04022026/553.pdf',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['mha-sop', '2026', 'verification-required'],
    intended_use: ['letter_grounding', 'next_steps_guidance'],
  },
  {
    key: 'undertaking_basis',
    title: 'Undertaking to reduce a whole-account freeze to a lien',
    content:
      'A written undertaking may be a document a bank or authority considers, but Unhold must not present it as a route to convert a restriction, release funds, or secure a particular outcome. Before suggesting one, show the user the exact restriction and authority record, and ask the receiving bank/authority what documents it accepts.',
    source: 'Legal secondary; docs/RESEARCH_FREEZE_DOMAIN.md §3',
    source_url: '',
    source_type: 'legal_secondary',
    confidence: 'med',
    currency: 'current',
    tags: ['undertaking', 'lien-only', 'tactic'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'ombudsman_scope_eligibility',
    title: 'RBI Ombudsman: eligibility + scope (RB-IOS 2021)',
    content:
      'RBI CMS is for eligible bank-service deficiencies after the user has first used the bank\'s grievance process and satisfies the current RB-IOS eligibility conditions. It does not review or overturn an order or action of police, a court, ED, tax authority, or another investigating authority. Frame any CMS complaint only around documented bank service conduct, and send the user to cms.rbi.org.in to confirm eligibility before filing.',
    source: 'RBI RB-IOS 2021 (cms.rbi.org.in)',
    source_url: 'https://cms.rbi.org.in',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['ombudsman', 'rbi', 'eligibility', 'scope', 'l3'],
    intended_use: ['letter_grounding', 'next_steps_guidance'],
  },
  {
    key: 'rti_record_request_basis',
    title: 'RTI mechanics: ask for records, not opinions',
    content:
      'Two parallel RTIs (₹10 each) — to the freezing authority (freeze advice copy, exact section, amount, defreeze SOP, action on your representation) and to the bank\'s PIO (copy of the freeze instruction received, nodal officer details, whether the freeze covers the whole account or only the tainted portion, dates). The PIO must reply within 30 days. Request records, not opinions — they are harder to deny.',
    source: 'RTI Act; docs/RESEARCH_FREEZE_DOMAIN.md §3',
    source_url: '',
    source_type: 'legal_secondary',
    confidence: 'med',
    currency: 'current',
    tags: ['rti', 'records', 'l4'],
    intended_use: ['letter_grounding', 'next_steps_guidance'],
  },

  // ── Group C — next-steps playbook ──────────────────────────────────────────
  {
    key: 'playbook_stage0_document',
    title: 'Stage 0 — document the freeze (Day 0-2)',
    content:
      'At the branch, ask for the freeze/lien advice IN WRITING: which authority ordered it, the complaint/FIR/NCRP acknowledgement number, the amount under lien, the legal section cited (e.g., BNSS 106/107), and the freeze type (lien vs debit vs total). Screenshot the failed transaction and current statement. You need the freezing authority + complaint number + amount + freeze type before escalating.',
    source: 'docs/RESEARCH_FREEZE_DOMAIN.md §3 Stage 0',
    source_url: '',
    source_type: 'legal_secondary',
    confidence: 'high',
    currency: 'current',
    tags: ['playbook', 'stage-0', 'document'],
    intended_use: ['next_steps_guidance'],
  },
  {
    key: 'playbook_stage2_io_noc',
    title: 'Stage 2 — request an authority response in writing',
    content:
      'If the bank identifies an Investigating Officer or cyber cell as the authority, the user can send a factual written representation: full name, account number, transaction date/UTR/RRN/amount/purpose, and proof of legitimate source. Ask for the status, the exact authority reference, and any document the bank needs. A release/NOC, if issued, may be relevant to the bank, but is not a guaranteed or decisive outcome. Do not promise a response deadline.',
    source: 'docs/RESEARCH_FREEZE_DOMAIN.md §3 Stage 2',
    source_url: '',
    source_type: 'legal_secondary',
    confidence: 'med',
    currency: 'current',
    tags: ['playbook', 'stage-2', 'io', 'noc', 'unlock'],
    intended_use: ['next_steps_guidance'],
  },
  {
    key: 'playbook_ombudsman_filing',
    title: 'Filing the RBI Ombudsman complaint',
    content:
      'If the user has completed the bank\'s grievance process and believes there is an eligible bank-service deficiency, direct them to cms.rbi.org.in and the current RB-IOS eligibility guidance. Keep the complaint about documented bank conduct, not an investigating-authority order. Do not predict disposal times or promise that RBI CMS can change an authority-imposed restriction.',
    source: 'RBI (cms.rbi.org.in)',
    source_url: 'https://cms.rbi.org.in',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['playbook', 'ombudsman', 'filing'],
    intended_use: ['next_steps_guidance'],
  },
  {
    key: 'playbook_timelines',
    title: 'Do not predict case timelines',
    content:
      'Unhold must not give typical timelines, predict a release, or state that a restriction automatically expires or escalates. The duration depends on the documented authority, bank process, case facts, and applicable law. Help the user record dates, obtain written references, and follow the current official route; for an urgent or unclear restriction, suggest professional legal advice.',
    source: 'Product safety rule; prior timeline figures were not established by a public primary source',
    source_url: '',
    source_type: 'internal',
    confidence: 'high',
    currency: 'current',
    tags: ['playbook', 'timelines', 'no-predictions'],
    intended_use: ['next_steps_guidance'],
  },
  {
    key: 'legal_last_resort',
    title: 'Legal last resort (out of copy-only scope)',
    content:
      'A court, ED/PMLA, tax, or unclear authority restriction is outside Unhold\'s copy-only scope. A lawyer can advise whether any court application, writ, or legal-aid route is appropriate for the user\'s facts and jurisdiction. Do not recommend a legal remedy or say that reported §106 cases make it likely to succeed. Unhold does not file documents or provide legal advice.',
    source: 'docs/RESEARCH_FREEZE_DOMAIN.md §3 Stage 6',
    source_url: '',
    source_type: 'legal_secondary',
    confidence: 'med',
    currency: 'current',
    tags: ['playbook', 'legal', 'writ', 'magistrate', 'nalsa'],
    intended_use: ['next_steps_guidance'],
  },

  // ── Group D — SBI-specific (MVP bank) ──────────────────────────────────────
  {
    key: 'sbi_grievance_ladder',
    title: 'SBI grievance ladder',
    content:
      'SBI publishes customer-care and grievance contacts. Use the current SBI page to start a documented bank grievance. Do not use a general MHA/SOP claim to tell SBI that a particular restriction must be converted, released, or resolved by a deadline.',
    source: 'SBI grievance redressal (sbi.bank.in)',
    source_url: 'https://sbi.bank.in/web/customer-care/addresses-and-helpline-nos-of-grievances-redressal-cell',
    source_type: 'bank_official',
    confidence: 'high',
    currency: 'current',
    tags: ['sbi', 'grievance', 'ladder'],
    intended_use: ['next_steps_guidance', 'letter_grounding'],
  },
  {
    key: 'sbi_contacts',
    title: 'SBI contacts (re-verify before display)',
    content:
      'SBI helplines: 1800 1234 / 1800 2100 / 1800 11 2211 / 1800 425 3800 / 080-26599990. Email: customercare@sbi.co.in, contactcentre@sbi.co.in. Circle grievance cells (examples): Delhi agmcustomer.lhodel@sbi.co.in 011-23404124; Mumbai agmcustomer.lhomum@sbi.co.in 022-26445863; Bengaluru agmcustomer.lhoban@sbi.co.in 080-25943126. Bank contacts change — re-verify against sbi.bank.in before showing to a user.',
    source: 'SBI customer care pages (sbi.bank.in)',
    source_url: 'https://sbi.bank.in/web/customer-care/contact-us',
    source_type: 'bank_official',
    confidence: 'med',
    currency: 'verify',
    tags: ['sbi', 'contacts'],
    intended_use: ['next_steps_guidance'],
  },

  // ── Group E — community (caveat-tagged; never a legal claim) ────────────────
  {
    key: 'community_real_cases',
    title: 'Community lived experience (expectation-setting only)',
    content:
      'Illustrative downstream-contamination patterns in older consumer press describe merchants and relatives affected after a fraud-linked payment. These anecdotes cannot establish a current procedure, typical timeline, legal rule, or reliable outcome. Do not use them in user-facing legal guidance; at most, use them internally to understand why users need written bank and authority records.',
    source: 'Moneylife (Apr-2023) + forums — illustrative, not current procedure',
    source_url: 'https://www.moneylife.in/article/fraud-alert-beware-police-are-freezing-bank-accounts-for-accepting-payment-from-upi-accounts-linked-with-cybercrimes/70468.html',
    source_type: 'consumer_press',
    confidence: 'low',
    currency: 'verify',
    tags: ['community', 'real-cases', 'expectations'],
    intended_use: ['next_steps_guidance'],
  },

  // ── Group F — official-route verification (2026) ───────────────────────────
  {
    key: 'grm_portal',
    title: 'Do not send citizens to the GRM staff-login URL',
    content:
      'The URL ncrp-grievanceredressal.mha.gov.in currently presents an I4C/ICJS/Bank-FI login and is not a verified public citizen submission route. Do not link a user to it or describe it as a self-service GRM portal. For an account restriction, first ask the bank for the written restriction details, ordering authority, and current official submission route.',
    source: 'Live portal check; staff/login page, not verified for citizen self-service',
    source_url: '',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['grm', 'unfreeze', 'official', 'innocent-receiver'],
    intended_use: ['next_steps_guidance', 'intake_classification'],
  },
  {
    key: 'mrm_portal',
    title: 'MRM — Money Restoration Module (for victims to reclaim money)',
    content:
      'The Money Restoration Module (MRM) is presented as a route for fraud victims seeking restoration after first reporting through cybercrime.gov.in or 1930. It is not a route to promise relief to a recipient whose account is restricted. Do not route an innocent-receiver case to MRM as an unfreeze mechanism; verify the current official instructions with the reporting authority.',
    source: 'MHA/I4C MRM portal (verified live 2026-06)',
    source_url: 'https://mrm-ncrp.mha.gov.in/',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['mrm', 'victim', 'official', 'restoration'],
    intended_use: ['next_steps_guidance', 'intake_classification'],
  },
  {
    key: 'grm_vs_io_vs_court',
    title: 'Which route: official fraud report, bank process, authority record, or legal help',
    content:
      'Decision guide. Fraud victim who just lost money → report immediately at cybercrime.gov.in or 1930; MRM may be relevant only to the fraud-victim/restoration path after official reporting. Account restriction → obtain the bank\'s written restriction details, ordering authority, reference, amount, and current route; send a factual representation only if the authority is identified. Bank-service concern → use the bank\'s process first, then check RBI CMS eligibility for a bank-service deficiency, not an authority order. Court, ED/PMLA, tax, or unclear authority orders need a lawyer. Unhold does not submit reports or determine the correct legal remedy.',
    source: 'I4C/NCRP public FAQ; RBI CMS; product safety rule',
    source_url: 'https://www.cybercrime.gov.in/Webform/FAQ.aspx',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['routing', 'cybercrime', 'mrm', 'ombudsman', 'court'],
    intended_use: ['next_steps_guidance'],
  },
  {
    key: 'scam_warning_unfreeze_agents',
    title: 'Warning: fake "unfreeze agents" and lawyers',
    content:
      'Desperate users with restricted accounts can be targeted by people who demand money and promise quick release. Do not pay anyone who promises an outcome. Use only official government/bank contact details that you independently verify. Unhold must never imply it can guarantee a release, and must not present the GRM staff-login URL as a public route.',
    source: 'Consumer press + community reports 2025-2026',
    source_url: '',
    source_type: 'consumer_press',
    confidence: 'med',
    currency: 'current',
    tags: ['scam', 'warning', 'safety'],
    intended_use: ['next_steps_guidance'],
  },
];
