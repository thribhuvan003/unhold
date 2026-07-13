# RESEARCH: Bank Account Freeze / Lien Domain (India) — Knowledge Corpus for Unhold

**Compiled:** 2026-06-25
**Status:** Archived research notebook, not user guidance and not a product promise. It contains secondary-source and mirror-derived claims that require a fresh primary-source review before use. The maintained product boundary is [`PRODUCT_AND_SAFETY.md`](./PRODUCT_AND_SAFETY.md); user-facing positions live in `lib/legal/positions.ts` and the curated retrieval corpus lives in `scripts/rag/corpus.mjs`.

**Purpose:** Preserve provenance for the original research pass. Unhold drafts copy-only material; it does not auto-file, provide individual legal advice, or guarantee an outcome or timeline.

**Confidence legend:** `[HIGH]` authoritative (RBI/MHA/court/official bank page) · `[MED]` reputable secondary (legal news, law firms, consumer press) · `[LOW]` single anecdote or unverified secondary claim.

**Currency legend (per source):** `current` (2025–2026 and in force) · `verify` (older than 2025 OR not confirmed against a primary doc — may be outdated) · `superseded`.

> **Anti-hallucination note for ingestion:** Several procedural claims circulate widely on lawyer-blog SEO pages but I could NOT confirm them against a primary RBI/MHA document in this session. These are tagged `[MED]` or `[LOW]` and flagged in Section 8. Do not present unverified specifics (exact circular numbers, exact compensation caps, "70% unfreeze in 30–60 days" statistics) as authoritative in user-facing copy without a primary-source check.
> **Date integrity:** I did NOT invent any 2026 dates to look recent. Where a claim's only support is an older or unverified source, the source is given with its true date and a `verify currency` flag. Foundational law that is necessarily older but in force (BNSS 2023; standing RBI Master Directions) is labelled "still in force as of June 2026" with its real effective date.

---

## 0. What Changed / Was Reaffirmed in the Feb–Jun 2026 Window (and the months just before)

This was the freshest layer at compilation time. Re-check every claim against a current primary source before citing it.

- **Claimed I4C / MHA account-freeze SOP — dated 02-Jan-2026.** This research pass found only a third-party PDF mirror. Its detailed thresholds and timelines are not treated as product truth until verified against an official MHA/I4C publication. `[VERIFY PRIMARY]`
- **Delhi HC — _Malabar Gold & Diamond Ltd. v. UoI_** [2026 SCC OnLine Del 297], **16-Jan-2026**: police cannot debit-freeze/attach under §106 BNSS; needs §107 Magistrate order; innocent account holders can't suffer for proceeds that "temporarily passed through." `[HIGH]` Currency: **current**.
- **Delhi trial court (Rouse Avenue) — _CBI v. Joney_, 16-Mar-2026** (USD 40M cyber-fraud): de-froze accounts; §106 needs a "direct or close link between tainted property and the offence"; unexplained deposits alone insufficient; attachment of proceeds needs §107 Magistrate approval. `[HIGH]` Currency: **current**.
- **Allahabad HC — _Ashish Rawat v. UoI_** (research citation: Supreme(Online)(All) 2026 811), **08-Apr-2026**: the notebook recorded a different reading of §106 from Bombay/Delhi. Applicability depends on jurisdiction, facts, later orders, and current law; the product must not turn this split into a universal “never” rule. `[VERIFY PRIMARY]`
- **Reaffirmed / still in force as of June 2026:** BNSS 2023 (effective **01-Jul-2024**; CrPC 1973 repealed) — §106 = seizure, §107 = Magistrate attachment. RB-IOS 2021 Ombudsman scheme (cms.rbi.org.in / 14448). RBI Master Directions on Fraud Risk Management (2024). These are older but current; verify no superseding 2026 amendment before quoting specifics.
- **STILL UNVERIFIED in the 2026 window (do not assert):** the exact RBI cyber-crime circular number and the "2025 RBI clarification allows release of excess-over-disputed amount on undertaking." Widely repeated on lawyer blogs; no primary RBI URL confirmed here. Currency: **verify**.

---

## 1. Executive Summary

- The dominant cause of innocent freezes is the **cyber-fraud money trail**. A victim reports fraud on the NCRP portal (cybercrime.gov.in) or via the **1930** helpline. This feeds the **Citizen Financial Cyber Fraud Reporting & Management System (CFCFRMS)**, run by **I4C** under the **Ministry of Home Affairs (MHA)**. The system auto-traces stolen money through successive accounts — **Layer 1** (first recipient), **Layer 2, Layer 3**, etc. — and pushes freeze/lien requests to the banks holding each account. Innocent receivers (merchants, freelancers, people who sold goods on OLX/UPI) routinely get caught at Layer 2/3. `[HIGH]` (i4c.mha.gov.in; moneylife.in)
- **Three distinct restriction types** — full freeze, debit freeze, and lien — are often conflated. Available remedies and lawful scope depend on the issuing authority, order, jurisdiction, facts, and current law. `[VERIFY FOR CASE]`
- **Recorded 2025–2026 decisions:** the research found decisions questioning blanket restrictions and differing on §106/§107. They do not establish a single universal rule for every restriction or jurisdiction. Verify the judgment, later appellate history, and case fit before use. `[VERIFY PRIMARY]`
- **Claimed 2026 SOP:** detailed thresholds and timelines came from a third-party mirror and remain excluded from product promises pending an official primary-source check. `[VERIFY PRIMARY]`
- **The realistic unfreeze path** for an innocent receiver: (1) get the freeze details in writing from the branch; (2) identify the freezing police station / cyber cell + complaint/FIR number; (3) write to the Investigating Officer (IO) proving legitimate source of funds and request an **NOC / release / "no-objection"**; (4) escalate inside the bank (branch → nodal officer); (5) if the bank is non-responsive ~30 days, file **RBI Banking Ombudsman** via **cms.rbi.org.in**; (6) **RTI** to authority + bank to force records; (7) last resort: **Magistrate application** (release of property) or **High Court writ under Art. 226**. `[HIGH/MED]`
- **No product timeline or success rate:** secondary anecdotes are not reliable enough to predict an individual case.
- **SBI (MVP bank):** standard public grievance ladder exists (customer care → circle AGM/grievance cell → Principal Nodal Officer → SBI Internal Ombudsman → RBI Ombudsman). SBI publishes circle-wise grievance-cell emails/phones. No SBI-specific _cyber-lien_ SOP is publicly documented beyond the general RBI/MHA framework. `[HIGH for contacts; LOW for cyber-specific behavior]`

---

## 2. Freeze Taxonomy

### 2.1 The three restriction types (CRITICAL distinction for intake classification)

| Type                 | What it means                                                                            | Scope                          | Typical cause                                                           |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| **Lien (mark/hold)** | Bank earmarks a _specific sum_ as un-withdrawable; rest of balance usable in theory      | Partial (disputed amount only) | Cyber-fraud trail; the legally-preferred action for downstream accounts |
| **Debit freeze**     | No outgoing debits allowed; credits may still come in; whole account blocked for outflow | Whole account                  | Police "freezing request"; historically over-used against innocents     |
| **Total freeze**     | Account fully locked — no debit, sometimes no credit, no operations                      | Whole account                  | Court order, ED/PMLA, serious investigation                             |

The distinction is useful for intake, but the lawful scope and remedy require case-specific, current review. Several decisions discussed in this notebook questioned blanket restrictions; they are not a universal product guarantee.

### 2.2 Causes of freeze/lien

1. **Cyber-fraud money trail (the core Unhold case).** Victim files NCRP/1930 complaint → CFCFRMS traces money across layers → freeze/lien request to each layer's bank. Innocent merchants/sellers/freelancers caught at Layer 1/2/3. `[HIGH]` (i4c.mha.gov.in; moneylife.in 2023)
2. **Mule-account suspicion.** Account flagged as a possible "mule" (used to launder illicit funds). RBI's **MuleHunter.AI** (ML detection) deployed across 15–23+ banks by 2025; **Suspect Registry** (Sep 2024) flagged ~24 lakh mule accounts. Being algorithmically flagged can trigger a freeze. `[HIGH]` (medianama.com; trackwizz)
3. **Lien marking specifically** = the partial, disputed-amount hold described above.
4. **GST / Income-Tax attachment.** Tax authorities can attach accounts for dues — different statute, different remedy (not the Unhold cyber path). `[MED]`
5. **Court orders / ED-PMLA.** Judicial or Enforcement Directorate attachments — require a lawyer; out of Unhold's copy-only scope. `[MED]`

### 2.3 The freeze pipeline (how the request reaches the bank)

`Victim → NCRP portal / 1930 → CFCFRMS (I4C/MHA) → Samanvay data-sharing platform (2024) → freeze/lien request routed to the bank holding each layered account → bank marks lien/freeze, usually with NO prior notice to the account holder.` The account holder typically discovers it only when a transaction fails. `[HIGH]`

---

## 3. Unfreeze Playbook by Stage (with timelines)

> Framing for letters: Unhold drafts **copy-only** escalation letters. The user sends them. Each stage below maps to a ladder rung.

### Stage 0 — Discover & document (Day 0–2)

- Visit the **branch**; ask for the **freeze/lien advice in writing**: which authority ordered it, the **complaint/FIR/NCRP acknowledgement number**, the **amount under lien**, the **legal section cited** (e.g., BNSS 106/107), and the **freeze type** (lien vs debit vs total).
- Screenshot the failed transaction + current statement.
- _Note:_ A widely-cited claim says RBI requires the bank to provide freeze advice "within 24 hours of request." I could **not** verify this against a primary RBI document — treat as `[LOW]`, do not assert as a hard right in copy.
- **Verify:** user knows freezing authority + complaint number + amount + freeze type.

### Stage 1 — Branch manager (L1 letter)

- Written request to the **branch manager**: state you are an innocent recipient, request (a) the freeze details in writing, (b) reduction of any whole-account freeze to a **lien on the disputed amount only**, citing that downstream-account blanket freezes lack legal basis. Offer an **undertaking** not to withdraw/transfer the disputed amount without IO/court permission. `[MED]`
- Timeline: allow ~7 days for response.

### Stage 2 — Representation to the identified authority

- Depending on the restriction, the bank may require a release instruction from the issuing authority or a court order. Identify the source and request the exact written requirement; do not assume one universal “unlock” document.
- Include: full name, account number, the transaction (date, UTR/RRN, amount, purpose), **proof of legitimate source** (invoice, sale receipt, chat/screenshots, delivery proof), and an explicit **request for NOC / release letter to the bank**.
- If you were yourself a _victim_ of the same fraud, mention the **"unintended recipient" / reverse-trace** path on NCRP. `[MED]` (Note: the specific "Citizen Victim of Mistake" portal section is cited by RTI-wiki but unverified — `[LOW]`.)
- If the authority accepts the representation, ask for the resulting written instruction and confirm how the bank will act on it. Do not promise a processing time.
- Any SOP deadline must be verified against a current official publication and the case's applicability before it is quoted.

### Stage 3 — Bank nodal officer (L2 letter)

- If branch is unresponsive, escalate to the **bank's nodal/principal nodal officer** (grievance redressal). Reference the unresolved branch complaint + ticket number. Restate the lien-only / 90-day-SOP / BNSS-106 points. `[HIGH for ladder existence]`

### Stage 4 — RBI Banking Ombudsman / CMS (L3 letter) — eligibility gated

- **Eligible when:** the bank has not resolved within **30 days** of your complaint, OR rejected it, OR you're dissatisfied. File within **1 year** of the bank's final reply (or 13 months of the original complaint). `[HIGH]`
- File online at **cms.rbi.org.in** (RB-IOS 2021); also crpc@rbi.org.in / Centralised Receipt & Processing Centre; helpline **14448**. No fee. `[HIGH]`
- **Scope caveat (IMPORTANT):** The Ombudsman addresses **bank deficiency** (e.g., bank froze whole account when only a lien was warranted, bank won't explain, bank ignored the IO's release). It **cannot order the police/IO** to drop a lawful investigation hold. Frame the complaint around _bank conduct_, not the police action. `[MED]`
- Typical disposal: **30–90 days**. Compensation cap commonly cited as **₹20 lakh + actual loss** under RB-IOS 2021 — `[MED]`, verify against the scheme text before quoting.

### Stage 5 — RTI (L4 letter)

- Two parallel RTIs (₹10 each): to the **freezing authority** (freeze advice copy, exact section, amount, defreeze SOP, action on your representation) and to the **bank's PIO** (copy of the freeze instruction received, nodal officer details, whether the freeze covers whole account or only tainted portion, dates). PIO must reply in **30 days**. `[HIGH for RTI mechanics; MED for the salary-account 48-hour life-and-liberty proviso]`
- Tactic (sourced from RTI-wiki, `[MED]`): request **records, not opinions** — harder to deny.

### Stage 6 — Legal last resort (out of copy-only scope; flag to user)

- **Magistrate application** for release of property/funds (historically CrPC 451/457; under BNSS the analogous provisions). `[MED]`
- **High Court writ under Article 226** to quash an arbitrary/blanket freeze — now strongly supported by the 2025–26 BNSS-106 rulings. `[HIGH on legal basis]`
- Free legal aid: **NALSA helpline 15100**. `[MED]`

### Historical planning ranges (not user promises)

| Stage                                | Realistic window                                     |
| ------------------------------------ | ---------------------------------------------------- |
| Documentation                        | Day 0–2                                              |
| Branch + IO representation           | Week 1–2 (most leverage here)                        |
| Nodal officer escalation             | Week 2–4                                             |
| Ombudsman (after 30-day bank window) | +30–90 days                                          |
| RTI replies                          | 30 days                                              |
| Any SOP-derived deadline             | Verify against an official current source before use |
| Court route                          | weeks–months                                         |

Do not aggregate these research estimates into a product timeline. External response times are outside Unhold's control.

### Documents that may be relevant

- A written instruction from the issuing authority, when the bank confirms that is required.
- A court order, where the restriction or dispute requires one.
- A bank-requested undertaking, where appropriate. These are case-dependent examples, not a universal checklist.

---

## 4. Authoritative Source List (URLs)

Each entry: **Date** (publication/judgment/effective) and **Currency** (current / verify / superseded).

**Government / regulator (HIGH):**

- I4C / NCRP portal — https://i4c.mha.gov.in/ncrp.aspx ; FAQ https://i4c.mha.gov.in/FAQ.aspx — Date: live portal. Currency: **current**.
- **I4C/MHA NCRP-CFCFRMS account-freeze SOP — PDF mirror** — https://the420.in/wp-content/uploads/2026/01/sop.pdf — Date: issued **02-Jan-2026**. Currency: **current** (confirm against an official MHA-hosted copy before quoting verbatim).
- RBI Complaints / Ombudsman entry — https://www.rbi.org.in/Scripts/Complaints.aspx — Date: live. Currency: **current**.
- RBI CMS portal (file Ombudsman complaint, RB-IOS 2021; helpline 14448) — https://cms.rbi.org.in — Date: scheme 2021, in force. Currency: **current (verify no 2026 amendment)**.
- RBI Master Directions on Fraud Risk Management (banks) — https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12702 — Date: 2024. Currency: **current**.
- MHA I4C SOP for Financial Institutions → LEA, Puducherry Police mirror — https://police.py.gov.in/Cyber%20Crime%20-%20I4C%20-%20Standard%20Operating%20Procedure%20(SOP)%20for%20Financial%20Institutions%20to%20LEA%20-%202024.pdf — Date: 2024. Currency: **verify (likely partly superseded by 02-Jan-2026 SOP)**.
- Cyber Cell SOP for Debit Freeze of Suspected Bank Accounts (DIG) — https://police.py.gov.in/Cyber%20Cell%20-%20SOP%20for%20Debit%20Freeze%20of%20Suspected%20Bank%20Accounts%20-%20DIG%20-%2010.01.24.PDF — Date: 10-Jan-2024. Currency: **verify (older; superseded in part)**.
- SBI grievance redressal cell addresses/helplines — https://sbi.bank.in/web/customer-care/addresses-and-helpline-nos-of-grievances-redressal-cell — Date: live page (HTTP-verified 2026-07-02, shows circle LHO emails). Currency: **current (re-verify contacts; they change)**.
- SBI contact us — https://sbi.bank.in/web/customer-care/contact-us — Date: live. Currency: **current**. (Note: `*.bank.in` is the RBI-mandated official bank domain family; hdfcbank.com now redirects to hdfc.bank.in. An external audit calling these domains fake was checked on 2026-07-02 and found wrong.)

**Court rulings (HIGH unless noted):**

- Delhi trial court — _CBI v. Joney_, Rouse Avenue District Court, **16-Mar-2026** (USD 40M cyber fraud, de-freeze on bond) — https://www.scconline.com/blog/post/2026/03/24/delhi-court-illegal-freezing-of-bank-accounts-bnss-usd-40-million-international-cyber-fraud/ — Currency: **current**.
- Allahabad HC — _Ashish Rawat v. UoI_ (Supreme(Online)(All) 2026 811), **08-Apr-2026** — https://supremetoday.ai/allahabad-hc-no-prior-notice-s106-bnss-bank-freeze-20260413004 — Currency: **current** (note §106-power nuance).
- Delhi HC — _Malabar Gold & Diamond Ltd. v. UoI_ [2026 SCC OnLine Del 297], **16-Jan-2026** (Kaurav J) — https://www.scconline.com/blog/post/2026/02/03/del-hc-on-legality-of-bank-account-freezing-under-bnss/ — Currency: **current**.
- Bombay HC — _Kartik Yogeshwar Chatur v. UoI_ [2025 SCC OnLine Bom 4778], **20-Nov-2025** (Pansare & Wakode JJ) — https://www.scconline.com/blog/post/2025/12/01/investigating-agency-cannot-debit-freeze-account-u-s-106-bnss-bom-hc/ — Currency: **current**.
- Kerala HC — _Kunnamangalam Co-op Rural Bank v. Inspector of Police_ [2026 KER 15537] (Verdictum) — https://www.verdictum.in/court-updates/high-courts/kerala-high-court/ms-kunnamangalam-co-operative-rural-bank-ltd-v-inspector-of-police-2026ker15537-bank-free-mirror-account-cooperative-bank-1609057 — Date: 2026. Currency: **current (verify citation)**.
- Madras HC — police can't freeze without quantifying disputed amount (Moneylife) — https://www.moneylife.in/article/police-cant-freeze-a-bank-account-without-quantifying-amount-involved-in-financial-fraud-madras-hc/75476.html — Date: to confirm. Currency: **verify**.
- The420.in explainer on §106 BNSS freezing — https://the420.in/section-106-bnss-bank-account-freezing-legal-explanation/ — Date: 2025/26. Currency: **current**.
- LiveLaw — "Freezing of Bank Accounts and the Mandate of Section 106 BNSS" — https://www.livelaw.in/articles/bank-accounts-freezing-section106-bnss-521590 — Date: 2025. Currency: **current (verify)**.
- Vaish Associates — freezing under CrPC/BNSS, powers & remedies — https://www.vaishlaw.com/freezing-of-bank-accounts-by-police-under-the-code-of-criminal-procedure-1973-bharatiya-nagarik-suraksha-sanhita-2023-power-parameters-and-remedies/ — Date: undated. Currency: **verify**.

**Policy analysis (HIGH/MED):**

- mssulthan.com — comprehensive analysis of I4C's 2026 SOP — https://mssulthan.com/analysisofi4cs2026sopforfinancialcybercrimes — Date: 2026. Currency: **current**.
- prashantkanha.com — NCRP/CFCFRMS cyber-fraud SOP 2026 (grievance timelines detailed) — https://www.prashantkanha.com/ncrp-cfcfrms-cyber-fraud-sop-2026/ — Date: 2026. Currency: **current**.
- LiveLaw — reading MHA's new account-freeze SOP, with critique — https://www.livelaw.in/articles/cfcfrms-reading-mha-new-account-freeze-sop-537503 — Date: Jan-2026. Currency: **current**.
- Business Standard — MHA SOP eases refunds under ₹50,000, no court order — https://www.business-standard.com/india-news/mha-sop-cyber-fraud-refunds-below-50000-no-court-order-126011500706_1.html — Date: 15-Jan-2026. Currency: **current**.
- The420.in — MHA SOP refunds under ₹50k / 90-day lift — https://the420.in/mha-sop-cyber-fraud-refunds-under-50000-no-court-order/ — Date: Jan-2026. Currency: **current**.
- Razorpay — how payment gateways handle LEA hold requests (2026 guide) — https://razorpay.com/blog/how-payment-gateways-handle-law-enforcement-agency-lea-hold-requests-in-india — Date: 2026. Currency: **current**.
- MediaNama — RTI: 23 banks implemented MuleHunter.AI — https://www.medianama.com/2025/12/223-rti-23-banks-mulehunter-mule-accounts/ — Date: Dec-2025. Currency: **current**.
- MediaNama — IBA pushes RBI power to freeze mule accounts — https://www.medianama.com/2025/04/223-iba-rbi-cyber-fraud-measures-freeze-bank-accounts-cybercrime/ — Date: Apr-2025. Currency: **current (verify)**.
- Drishti IAS — MHA's new SOP on cyber financial frauds — https://www.drishtiias.com/daily-updates/daily-news-analysis/mhas-new-sop-on-cyber-financial-frauds — Date: Jan-2026. Currency: **current**.

**Consumer press (MED):**

- Moneylife — police freezing accounts for UPI payments linked to cybercrime (real downstream cases) — https://www.moneylife.in/article/fraud-alert-beware-police-are-freezing-bank-accounts-for-accepting-payment-from-upi-accounts-linked-with-cybercrimes/70468.html — Date: **14-Apr-2023**. Currency: **verify — older; illustrative pattern only, not current procedure**.

---

## 5. Reddit / Community Lived-Experience Findings

**ACCESS LIMITATION (flag for follow-up):** The available web search engine is US-only and **did not index Reddit/Quora threads** for these queries, and direct fetch of reddit.com is blocked in this environment. So I could NOT capture verbatim Reddit quotes/URLs from r/legaladviceindia, r/personalfinanceindia, r/india, r/bangalore as requested. **This section needs a manual pass** (logged-in browser, or an India-region search) — and per the 2026-recency requirement it should favor **2026 threads (ideally Feb–Jun 2026)**; the one 2026 community pointer found here is the TechnoFino forum thread on the MHA SOP (https://technofino.in/community/threads/, 2026). The consumer-press cases below are older (2023) and used only as illustrative pattern, not current procedure. `[MED/LOW]`

**Lived-experience patterns that recur (from Moneylife real cases + lawyer Q&A pages):**

- A **Kerala hotel** had its account — plus its **chicken supplier's** and the **supplier's father-in-law's** accounts — frozen because one customer paid a meal bill from a fraud-linked UPI account. Pure downstream contamination. `[MED]` (moneylife.in, Apr-2023)
- **Noushad PK, a fruit vendor**, frozen after selling watermelon to a customer; his **wife's account** then froze when he transferred to her. Shows how the freeze spreads. `[MED]` (moneylife.in)
- A professional received a legitimate fee; bank froze the **entire amount** though police asked to hold only **₹10,000** — bank demanded a court order or police direction to release. Illustrates the **whole-account-vs-disputed-amount over-freeze** at the heart of the legal fight. `[MED]`
- **What worked:** consumer-court intervention ordering the bank to release the undisputed balance while holding the disputed portion; getting the **IO's release/NOC**. `[MED]`
- **Dead ends reported:** banks refusing to share the cyber-cell contact; IOs ignoring complaints; people resorting to **bribes across multiple states** (reported, not endorsed). `[MED]`
- **Quotable (paraphrase):** Advocate Ameen Hassan (representing ~20 victims): police are "misusing the provision put in place to help real victims." `[MED]`

**Community Q&A sources to mine in the manual pass:**

- Quora — lien of ₹20k from cybercrime, what to do — https://www.quora.com/How-can-I-report-to-cybercrime-my-bank-account-freeze-20k-as-lien-amount (fetch blocked 403 here)
- LawRato — account unfreeze / remove lien mark — https://lawrato.com/cyber-crime-legal-advice/account-unfreeze-request-to-remove-lien-mark-amount-250638
- Sudhir Rao — NCRP hold lien, what to do / when lien amount is credited back — https://sudhirrao.com/my-bank-account-has-a-lien-amount-due-to-a-cybercrime-ncrp-hold-what-should-i-do/
- Consumer Court forum — account freeze thread — https://consumercourt.net/threads/account-freeze.1970/

---

## 6. Latest Legal / Regulatory Changes 2024–2026

**A. CrPC → BNSS transition (effective 01-Jul-2024; CrPC 1973 repealed — still in force as of June 2026).** CrPC Section 102 (power to seize property) is now **BNSS Section 106** (seizure); attachment of crime proceeds is **BNSS Section 107** (Magistrate-ordered). Frame §106 as current law; CrPC 102 is historical context only. `[HIGH]` Currency: **current**.

**B. The §106 vs §107 line — the key innocent-third-party lever (chronological, freshest last):**

- **Bombay HC**, _Kartik Yogeshwar Chatur v. UoI_ (2025 SCC OnLine Bom 4778), **20-Nov-2025**: investigating agencies **cannot debit-freeze accounts under §106**; banks "are empowered only to place the disputed amount under lien and are not authorized to impose a debit freeze… unless there is a specific order… by a competent authority." Attachment must go through **§107/Magistrate**. `[HIGH]` Currency: **current**.
- **Delhi HC**, _Malabar Gold & Diamond v. UoI_ (2026 SCC OnLine Del 297), **16-Jan-2026**: §106 lets police "seize property for evidentiary purposes" only and "does not confer any authority to attach or debit-freeze bank accounts"; freezing "innocent and unwary account holders… merely because proceeds of crime may have temporarily passed through their accounts" is "disproportionate and arbitrary." `[HIGH]` Currency: **current**.
- **Delhi trial court (Rouse Avenue District Court)**, _CBI v. Joney_, **16-Mar-2026** (USD 40M international cyber fraud): de-froze accounts on personal bond; investigators must show "a direct or close link between the tainted property and the alleged offence"; unexplained deposits vs known income, without connecting evidence, are insufficient; attachment of proceeds needs **§107** Magistrate approval. `[HIGH]` Currency: **current**.
- **Allahabad HC**, _Ashish Rawat v. UoI_ (Supreme(Online)(All) 2026 811), **08-Apr-2026**: **nuance/partial conflict** — police _may_ seize/freeze under §106 **without prior notice**, but "power of seizure is limited to the… suspicious amount… entire amount lying in a bank account cannot be freezed." Reads §106 as _granting_ a notice-free seizure power (unlike Bombay/Delhi), yet lands on the same amount-limited rule. `[HIGH]` Currency: **current**.
- **Madras HC**: police cannot freeze without **quantifying** the disputed amount. `[MED]` (Moneylife article, date to confirm) Currency: **verify**.
- **Kerala HC** (2026), _Kunnamangalam Co-op Rural Bank v. Inspector of Police_ (2026 KER 15537): police requisitions must not paralyse banking operations; banks bound to identify and freeze the **actual fraud-linked** account/amount. `[MED]` Currency: **current (verify citation)**.

**C. MHA / I4C account-freeze SOP — issued 02-Jan-2026 (NCRP-CFCFRMS, Custody, Seizure & Release SOP):** `[HIGH/MED]` Currency: **current**.

- Lien should be **limited to the disputed sum**; account-level freezes become the exception.
- **90-day** cap: if no lawful direction within 90 days of the grievance, bank notifies LEA 15 days before expiry, then (after enhanced due diligence + holder request) may remove the hold and update NCRP-CFCFRMS.
- Frauds **under ₹50,000**: refund possible **without a court order**.
- **Time-bound grievance ladder:** bank verifies bona fides + forwards grievance to CFCFRMS module within **7 days** → **IO decides within 15 days** (notice to holder, preferably by video conference), else auto-escalates → **District Grievance Officer** decides in **15 days**, IO executes in **2 days** → holder may appeal to **State Grievance Officer** (15-day window). Ranks: District = Addl.SP/DySP; State = ADG/IG/DIG. Court remains available at any stage.
- Covers banks, NBFCs, payment aggregators, e-commerce, trading apps, mutual funds.
- **Criticisms (LiveLaw, Jan-2026):** SOP has **no statutory force** (uneven compliance), **no prior-notice/hearing** requirement, **inter-state jurisdiction** still fragmented, **>₹50k cases lack timelines**, banks still fail to tell customers who froze them.

**D. CFCFRMS / I4C infrastructure (2024–2025):** Samanvay data-sharing platform (2024); **Suspect Registry** (Sep 2024) flagged ~24 lakh mule accounts / ~11 lakh identifiers; **MuleHunter.AI** ML mule-detection across 15–23+ banks; **IDPIC** (incorporated 16-Oct-2025) for real-time transaction risk scoring. Helpline **1930**. `[HIGH]`

**E. RBI fraud framework:** Revised **Master Directions on Fraud Risk Management** (2024); a **Jan 2025 RBI circular on prevention of financial fraud**. A specific **DOR.REC.56/13.01.01/2023-24** "cyber crime circular" requiring whole-account freeze on police request is widely cited by lawyer blogs, and a "2025 clarification" allowing release of the excess-over-disputed amount on an undertaking is also widely cited — **both unverified against primary RBI text in this session → `[MED/LOW]`, must confirm.**

---

## 7. Proposed RAG Knowledge-Base Corpus Structure (`knowledge_chunks`)

Suggested schema per chunk: `id, topic, body, source_type {regulator|court|bank_official|legal_secondary|consumer_press|community_anecdote}, source_url, jurisdiction, confidence {high|med|low}, last_verified, intended_use [intake_classification | letter_grounding | next_steps_guidance], stale_after`.

**Group A — Intake classification (help the user self-identify):**

1. `freeze_type_taxonomy` — lien vs debit-freeze vs total-freeze, how to tell which you have. (court/regulator, HIGH)
2. `cause_cyber_money_trail` — Layer 1/2/3 explanation; why innocent receivers get caught. (regulator/press, HIGH)
3. `cause_mule_flag` — MuleHunter/Suspect-Registry flagging. (regulator, HIGH)
4. `cause_non_cyber` — GST/IT/court/ED freezes and that these need different (legal) handling — route OUT of copy-only flow. (legal_secondary, MED)
5. `am_i_in_scope` — decision rules: is this a cyber-trail lien on an innocent receiver (in scope) vs ED/PMLA/court (refer to lawyer). (internal, HIGH)

**Group B — Letter grounding (facts the drafter cites in L1–L4):** 6. `bnss_106_vs_107` — police can't debit-freeze under §106; attachment needs §107 Magistrate order. (court, HIGH) 7. `case_bombay_kartik_chatur` — holding + quote. (court, HIGH) 8. `case_delhi_malabar` — innocent-account holding + quote. (court, HIGH) 9. `case_madras_quantify` / `case_kerala_actual_account` / `case_allahabad_blanket` — supporting holdings. (court/press, MED) 10. `mha_sop_2026` — lien-to-disputed-sum, 90-day lift, <₹50k refund, 3-tier grievance ladder. (regulator/policy, HIGH/MED) 11. `lien_only_principle` — freeze must be confined to actual disputed amount. (regulator/court, HIGH) 12. `undertaking_template_basis` — basis for offering an undertaking to reduce a whole-account freeze to a disputed-amount lien. (legal_secondary, MED) 13. `ombudsman_scope_and_eligibility` — 30-day rule, 1-year limit, RB-IOS 2021, scope = bank deficiency not police action. (regulator, HIGH) 14. `rti_record_request_basis` — RTI mechanics + "ask for records not opinions" tactic. (legal_secondary, MED)

**Group C — Next-steps guidance (the playbook):** 15. `playbook_stage0_document` — get freeze advice + authority + complaint number + amount + type. (HIGH) 16. `playbook_stage2_io_noc` — the IO NOC is the decisive unlock; what to include. (legal_secondary, MED) 17. `playbook_ombudsman_filing` — how/where to file at cms.rbi.org.in / 14448 / crpc@rbi.org.in. (regulator, HIGH) 18. `playbook_timelines` — realistic windows per stage; manage expectations. (MED/LOW) 19. `documents_that_release` — IO NOC, court release order, undertaking. (MED) 20. `legal_last_resort` — Magistrate release application; Art. 226 writ; NALSA 15100. (court/legal_secondary, HIGH/MED)

**Group D — Bank-specific (MVP = SBI):** 21. `sbi_grievance_ladder` — customer care numbers, circle AGM grievance emails, nodal/principal-nodal, SBI Internal Ombudsman → RBI Ombudsman. (bank_official, HIGH) 22. `sbi_contacts_table` — 18001234 / 18002100 / 1800112211 / 18004253800 / 080-26599990; customercare@sbi.co.in, contactcentre@sbi.co.in; circle grievance cells (Delhi agmcustomer.lhodel@sbi.co.in 011-23404124; Mumbai agmcustomer.lhomum@sbi.co.in 022-26445863; Bengaluru agmcustomer.lhoban@sbi.co.in 080-25943126). (bank_official, HIGH — but re-verify before display; bank contacts change.)

**Group E — Community (caveat-tagged):** 23. `community_real_cases` — Moneylife downstream-contamination cases; what worked (consumer court, IO NOC) / dead ends (bribes, non-responsive IO). (consumer_press, MED) — **expand after manual Reddit pass.**

**Ingestion rules:** tag every `court` and `regulator` chunk `HIGH` and let the drafter cite them in letters; mark every `community_anecdote` clearly so it's never used as a legal claim, only as expectation-setting; set `stale_after` on bank-contact and SOP chunks (these change) and on any "circular number" chunk (unverified).

---

## 8. Gaps / Where We Need a Human or Legal Expert

1. **Reddit/forum lived-experience pass is incomplete.** The search engine here is US-only and didn't index Reddit/Quora; reddit.com fetch is blocked. **Action:** run an India-region or logged-in pass over r/legaladviceindia, r/personalfinanceindia, r/india, r/bangalore for verbatim "what worked / how long" quotes + URLs. Section 5 currently leans on consumer press as a proxy.
2. **Unverified RBI specifics.** The cited cyber-crime circular number **DOR.REC.56/13.01.01/2023-24**, the "2025 clarification allows releasing excess-over-disputed amount on undertaking," the "freeze advice within 24 hours," the "₹20 lakh compensation cap," and the "~70% unfreeze in 30–60 days" stat all come from secondary/lawyer-SEO pages. **A human must confirm each against the primary RBI/RB-IOS text** before any goes into user-facing copy.
3. **BNSS section-number precision.** Confirm the exact BNSS successor to CrPC 451/457 (release of property) — secondary sources still cite CrPC numbers. Needs a lawyer or bare-act check.
4. **Court citations** (Kartik Chatur, Malabar Gold, CBI v. Joney, Ashish Rawat, Kerala) came via legal-news summaries, not the judgments themselves. Verify neutral citations and that none are stayed/overruled — case law moves fast in 2026.
   **UPDATE 2026-07-05 (Kartik Chatur + Malabar Gold only, via primary-source PDFs read directly — sci.gov.in + delhihighcourt.nic.in):** citations and quoted holdings are accurate — not fabricated, not misattributed. BUT: Supreme Court suo motu order dated **01-Dec-2025** (Suo Motu W.P.(Crl.) No. 3/2025, _In Re: Victims of Digital Arrest Related to Forged Documents_) flags this Bombay HC ruling as **conflicting** with Kerala HC's _Rasmi K.R. v. NCCRP_ and **directs the Solicitor General to file SLPs against both within two weeks**; the same SC order separately holds police "**at liberty to freeze**" accounts prima facie traceable to cybercrime "with or without FIR" — in tension with Kartik Chatur/Malabar Gold's own holding. No resolution of the SLPs found as of the most recent reporting (Mar-2026). **Do not present these two rulings as settled law in user-facing copy — hedge as "recently held by the Bombay/Delhi High Courts" and prefer the BNSS 106-vs-107 statutory structure over naming these specific cases where possible.** CBI v. Joney, Ashish Rawat, and Kerala (Rasmi K.R.) remain unverified against primary text.
   4a. **Open conflict between High Courts on the §106 question.** Bombay/Delhi read §106 BNSS as conferring **no** freeze/seizure power over accounts (need §107). Allahabad (08-Apr-2026) reads §106 as **granting** a notice-free seizure power, just limited to the tainted amount. The user-facing rule ("only the disputed amount, never the whole account") holds either way, but the _legal argument_ used in a writ must be matched to the relevant High Court's jurisdiction — needs a lawyer. **Supreme Court has NOT settled this (update 2026-07-05): a suo motu order (01-Dec-2025) ordered the Bombay/Kerala split up on appeal rather than resolving it** — see item 4 above.
   4b. **2026-recency confirmation still owed:** the 02-Jan-2026 SOP was read via secondary analyses (prashantkanha, mssulthan, LiveLaw, The420 PDF mirror). Confirm the SOP text against an official MHA/I4C-hosted copy before letter-grounding the exact 7/15/15/2-day timelines and ranks.
5. **Ombudsman scope nuance.** The Ombudsman can act on **bank deficiency**, not on a lawful police hold. The boundary (when is it "bank deficiency" vs "police action") needs an expert-reviewed rule so Unhold doesn't over-promise the L3 letter.
6. **Inter-state jurisdiction** (complaint filed in State A, account in State B) is the hardest real-world blocker and is under-documented procedurally. Needs practitioner input.
7. **SBI cyber-lien behavior** specifically (vs the generic grievance ladder) is not publicly documented — worth a practitioner interview or test cases.
8. **Liability framing.** Unhold is copy-only and must not cross into legal advice; a lawyer should sign off on the disclaimer and on any letter template that asserts a legal right (esp. the BNSS-106 and Ombudsman-eligibility claims).
