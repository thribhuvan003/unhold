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
      'A LIEN marks a specific disputed sum as un-withdrawable while the rest of the balance stays usable — this is the lawful action for a downstream/innocent account. A DEBIT FREEZE blocks all outgoing debits on the whole account. A TOTAL FREEZE locks the account entirely (usually a court/ED order). Knowing which one you have decides the remedy: a whole-account debit/total freeze on a police request alone has been held unlawful by multiple High Courts in 2025-2026; only a lien on the disputed amount is defensible.',
    source: 'Bombay HC (Kartik Chatur, 2025); MHA/I4C SOP 02-Jan-2026',
    source_url: 'https://www.scconline.com/blog/post/2025/12/01/investigating-agency-cannot-debit-freeze-account-u-s-106-bnss-bom-hc/',
    source_type: 'court',
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
      'Since 01-Jul-2024 the BNSS 2023 replaced the CrPC 1973 (still in force as of June 2026). CrPC §102 is now BNSS §106 (seizure of property); attachment of crime proceeds is BNSS §107 (requires a Magistrate\'s order). Most High Courts read §106 as not empowering police to debit-freeze or attach a whole bank account; attachment must go through §107. This is the core legal lever for an innocent third party.',
    source: 'BNSS 2023; Delhi/Bombay HC 2025-2026',
    source_url: 'https://www.livelaw.in/articles/bank-accounts-freezing-section106-bnss-521590',
    source_type: 'court',
    confidence: 'high',
    currency: 'current',
    tags: ['bnss', 'section-106', 'section-107', 'legal'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'case_bombay_kartik_chatur',
    title: 'Bombay HC — Kartik Chatur v. UoI (20-Nov-2025)',
    content:
      'Bombay High Court (2025 SCC OnLine Bom 4778) held investigating agencies cannot debit-freeze accounts under §106 BNSS: banks "are empowered only to place the disputed amount under lien and are not authorized to impose a debit freeze… unless there is a specific order by a competent authority." Attachment must go through §107/Magistrate.',
    source: 'Bombay HC, 2025 SCC OnLine Bom 4778',
    source_url: 'https://www.scconline.com/blog/post/2025/12/01/investigating-agency-cannot-debit-freeze-account-u-s-106-bnss-bom-hc/',
    source_type: 'court',
    confidence: 'high',
    currency: 'current',
    tags: ['case-law', 'bombay-hc', 'debit-freeze', 'lien-only'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'case_delhi_malabar',
    title: 'Delhi HC — Malabar Gold v. UoI (16-Jan-2026)',
    content:
      'Delhi High Court (2026 SCC OnLine Del 297) held §106 BNSS lets police seize property for evidentiary purposes only and "does not confer any authority to attach or debit-freeze bank accounts." Freezing "innocent and unwary account holders merely because proceeds of crime may have temporarily passed through their accounts" is "disproportionate and arbitrary."',
    source: 'Delhi HC, 2026 SCC OnLine Del 297',
    source_url: 'https://www.scconline.com/blog/post/2026/02/03/del-hc-on-legality-of-bank-account-freezing-under-bnss/',
    source_type: 'court',
    confidence: 'high',
    currency: 'current',
    tags: ['case-law', 'delhi-hc', 'innocent-holder', 'lien-only'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'case_cbi_joney',
    title: 'Delhi trial court — CBI v. Joney (16-Mar-2026)',
    content:
      'A Delhi (Rouse Avenue) court de-froze accounts in a USD 40M cyber-fraud case, holding §106 needs "a direct or close link between the tainted property and the alleged offence"; unexplained deposits alone are insufficient, and attachment of proceeds needs §107 Magistrate approval.',
    source: 'Rouse Avenue District Court, 16-Mar-2026',
    source_url: 'https://www.scconline.com/blog/post/2026/03/24/delhi-court-illegal-freezing-of-bank-accounts-bnss-usd-40-million-international-cyber-fraud/',
    source_type: 'court',
    confidence: 'high',
    currency: 'current',
    tags: ['case-law', 'delhi', 'tainted-link', 'section-107'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'case_allahabad_amount_limited',
    title: 'Allahabad HC — Ashish Rawat v. UoI (08-Apr-2026) [nuance]',
    content:
      'Allahabad High Court held police MAY seize/freeze under §106 without prior notice, BUT "the entire amount lying in a bank account cannot be freezed" — seizure is limited to the suspicious amount. This partly conflicts with Bombay/Delhi (which read §106 as conferring no freeze power at all), yet lands on the same operative rule: only the disputed amount, never the whole account. Match the legal argument to the relevant High Court\'s jurisdiction.',
    source: 'Allahabad HC, Supreme(Online)(All) 2026 811',
    source_url: 'https://supremetoday.ai/allahabad-hc-no-prior-notice-s106-bnss-bank-freeze-20260413004',
    source_type: 'court',
    confidence: 'high',
    currency: 'current',
    tags: ['case-law', 'allahabad-hc', 'amount-limited', 'conflict'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'lien_only_principle',
    title: 'The lien-only principle',
    content:
      'Across Bombay, Delhi, Allahabad, Madras and Kerala High Courts (2025-2026), the converging, user-relevant rule is that any hold must be confined to the actual disputed/tainted amount — a whole-account freeze on an innocent downstream holder is not legally supported. This is the single most important point to assert (politely, with citations) in L1-L3 letters.',
    source: 'Multiple High Courts 2025-2026',
    source_url: 'https://the420.in/section-106-bnss-bank-account-freezing-legal-explanation/',
    source_type: 'court',
    confidence: 'high',
    currency: 'current',
    tags: ['lien-only', 'principle', 'core-lever'],
    intended_use: ['letter_grounding'],
  },
  {
    key: 'mha_sop_2026',
    title: 'MHA/I4C account-freeze SOP (02-Jan-2026)',
    content:
      'The NCRP-CFCFRMS account-freeze SOP (02-Jan-2026) sets: lien limited to the disputed sum (account-level freezes become the exception); a 90-day cap on holds absent a lawful direction; refunds under ₹50,000 without a court order; and a time-bound grievance ladder — bank forwards the grievance within 7 days, the IO decides within 15 days (preferably via video verification), else it auto-escalates to a District Grievance Officer (Addl.SP/DySP, 15 days), then a State Grievance Officer (ADG/IG/DIG) on appeal. It is an SOP, not statute, so compliance is uneven — cite the timelines as your entitlement.',
    source: 'MHA/I4C SOP 02-Jan-2026 (LiveLaw, Business Standard)',
    source_url: 'https://www.livelaw.in/articles/cfcfrms-reading-mha-new-account-freeze-sop-537503',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['mha-sop', '2026', 'grievance-ladder', '90-day', 'timelines'],
    intended_use: ['letter_grounding', 'next_steps_guidance'],
  },
  {
    key: 'undertaking_basis',
    title: 'Undertaking to reduce a whole-account freeze to a lien',
    content:
      'A practical lever: offer the bank/IO a written undertaking not to withdraw or transfer the disputed amount without IO/court permission, in exchange for reducing a whole-account freeze to a lien on only the disputed sum. This supports the lien-only principle and lets you operate the rest of the account. Treat the legal force as supportive, not guaranteed.',
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
      'You can approach the RBI Banking Ombudsman when the bank has not resolved your complaint within 30 days, rejected it, or you are dissatisfied — file within 1 year of the bank\'s final reply. File free at cms.rbi.org.in (helpline 14448). IMPORTANT scope limit: the Ombudsman addresses BANK deficiency (e.g., froze the whole account when only a lien was warranted, won\'t explain, ignored the IO\'s release) — it cannot order the police/IO to drop a lawful investigation hold. Frame the L3 complaint around bank conduct.',
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
    title: 'Stage 2 — the IO NOC is the decisive unlock',
    content:
      'The freeze is usually released when the Investigating Officer issues a release/NOC to the bank. Identify the police station/cyber cell that originated the request and write to the IO/SHO with: full name, account number, the transaction (date, UTR/RRN, amount, purpose), proof of legitimate source (invoice, sale receipt, chats, delivery proof), and an explicit request for an NOC/release letter to the bank. Under the 02-Jan-2026 SOP the IO should decide within 15 days.',
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
      'File online at cms.rbi.org.in (RB-IOS 2021); also crpc@rbi.org.in / Centralised Receipt & Processing Centre; helpline 14448. No fee. Eligible after 30 days of bank non-response. Typical disposal 30-90 days. Keep the complaint about bank conduct (over-freeze, non-explanation, ignoring the IO release), not the police action.',
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
    title: 'Realistic timelines (manage expectations)',
    content:
      'Documentation Day 0-2; branch + IO representation Week 1-2 (most leverage here); nodal-officer escalation Week 2-4; Ombudsman +30-90 days after the 30-day bank window; RTI replies 30 days; SOP 90-day auto-lift if no judicial order. Aggregate is commonly 1-2 months for cooperative cases, longer for high-value (>₹50k) or inter-state cases. The first two weeks matter most.',
    source: 'docs/RESEARCH_FREEZE_DOMAIN.md §3 (secondary; some figures unverified)',
    source_url: '',
    source_type: 'legal_secondary',
    confidence: 'low',
    currency: 'verify',
    tags: ['playbook', 'timelines', 'expectations'],
    intended_use: ['next_steps_guidance'],
  },
  {
    key: 'legal_last_resort',
    title: 'Legal last resort (out of copy-only scope)',
    content:
      'If letters fail: a Magistrate application for release of property/funds (BNSS successor to CrPC 451/457 — confirm exact section with a lawyer), or a High Court writ under Article 226 to quash an arbitrary/blanket freeze (strongly supported by the 2025-2026 §106 rulings). Free legal aid: NALSA helpline 15100. Flag to the user that this stage needs a lawyer; Unhold does not file.',
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
      'SBI escalation path: customer care → circle AGM/grievance cell → Principal Nodal Officer → SBI Internal Ombudsman → RBI Ombudsman. SBI publishes circle-wise grievance-cell emails and phones. No SBI-specific cyber-lien SOP is publicly documented beyond the general RBI/MHA framework, so use the general lien-only + SOP grounding in letters.',
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
      'Illustrative downstream-contamination patterns (consumer press, 2023, older): a Kerala hotel plus its chicken supplier and the supplier\'s relative all frozen over one fraud-linked customer payment; a fruit vendor frozen after selling watermelon, then his wife\'s account too. What reportedly worked: getting the IO\'s release/NOC, and consumer-court orders to release the undisputed balance while holding the disputed portion. Dead ends: banks refusing to share the cyber-cell contact, unresponsive IOs. Use ONLY to set expectations — never cite as a legal rule. A 2026 Reddit/forum pass is still owed.',
    source: 'Moneylife (Apr-2023) + forums — illustrative, not current procedure',
    source_url: 'https://www.moneylife.in/article/fraud-alert-beware-police-are-freezing-bank-accounts-for-accepting-payment-from-upi-accounts-linked-with-cybercrimes/70468.html',
    source_type: 'consumer_press',
    confidence: 'low',
    currency: 'verify',
    tags: ['community', 'real-cases', 'expectations'],
    intended_use: ['next_steps_guidance'],
  },

  // ── Group F — official GRM/MRM resolution layer (2026; portals verified live) ─
  {
    key: 'grm_portal',
    title: 'GRM — Grievance Redressal Mechanism (for wrongly-frozen innocent accounts)',
    content:
      'The Grievance Redressal Mechanism (GRM) is the official MHA/I4C path for innocent people whose accounts were wrongly frozen or lien-marked during a cyber-fraud investigation. Portal: ncrp-grievanceredressal.mha.gov.in. It is a time-bound process where bank, police and I4C coordinate, and can involve video verification of the account holder. In many cases it is initiated via your bank branch. This is the PRIMARY official route Unhold should point an innocent receiver to — Unhold only helps prepare a stronger submission.',
    source: 'MHA/I4C GRM portal (verified live 2026-06)',
    source_url: 'https://ncrp-grievanceredressal.mha.gov.in/',
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
      'The Money Restoration Module (MRM) is the official MHA/I4C module for fraud VICTIMS to claim back money that was frozen or recovered along the trail. Portal: mrm-ncrp.mha.gov.in. Use it with your existing NCRP complaint number after reporting on cybercrime.gov.in / 1930. MRM is the victim path; GRM is the innocent-receiver/wrongful-freeze path — Unhold should route the user to the right one.',
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
    title: 'Which route: GRM vs direct IO vs Ombudsman vs court',
    content:
      'Decision guide. Innocent account wrongly frozen in a cyber case → use the GRM portal (ncrp-grievanceredressal.mha.gov.in) AND submit a written representation to the Investigating Officer in parallel. Victim who lost money → MRM (mrm-ncrp.mha.gov.in). Bank misconduct (over-froze whole account, won\'t explain, ignored an IO release) after 30 days → RBI Ombudsman (cms.rbi.org.in). No progress in reasonable time → High Court writ under Art. 226 (many partial-release writs succeeded in 2026) — needs a lawyer; Unhold does not file. Start with the official portal; escalate only if it stalls.',
    source: 'docs/RESEARCH_FREEZE_DOMAIN.md + GRM/MRM portals 2026',
    source_url: 'https://ncrp-grievanceredressal.mha.gov.in/',
    source_type: 'regulator',
    confidence: 'high',
    currency: 'current',
    tags: ['routing', 'grm', 'mrm', 'ombudsman', 'court'],
    intended_use: ['next_steps_guidance'],
  },
  {
    key: 'scam_warning_unfreeze_agents',
    title: 'Warning: fake "unfreeze agents" and lawyers',
    content:
      'Desperate users with frozen accounts are targeted by fake "unfreeze agents" and lawyers who demand money up front and promise quick unfreezing. The official routes — NCRP/1930, GRM, MRM, the Investigating Officer, RBI Ombudsman — are FREE. Never pay anyone (including anyone claiming to be police) to "release" your account. Unhold must surface this warning prominently and never imply it can guarantee an unfreeze.',
    source: 'Consumer press + community reports 2025-2026',
    source_url: '',
    source_type: 'consumer_press',
    confidence: 'med',
    currency: 'current',
    tags: ['scam', 'warning', 'safety'],
    intended_use: ['next_steps_guidance'],
  },
];
