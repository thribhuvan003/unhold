# What Unhold Actually Is and Does (Exact Explanation)

**For anyone asking on X, in DMs, or in person:**  
Use the language below exactly. It is honest, specific, and based on the current state of the product (as of June 2026) and the BUILD_SPEC.

---

## One-Sentence Answer (use this first)

**Unhold is a tool for people in India whose bank or UPI account has been frozen (especially innocent receivers at SBI) to prepare a professional, verified evidence package and step-by-step escalation letters that they send themselves to the bank — with AI helping organize and check documents, but the user staying in full control at every step.**

Nothing is sent automatically. No guarantees. You do the actual sending.

---

## Who It Is For

Real people whose accounts are frozen, often through no fault of their own:

- Received salary, rent, business payment, or UPI from someone who later had fraud issues.
- Account frozen by SBI or other banks because the money was traced in a "mule chain" or cyber complaint.
- Stuck for weeks or months while trying to prove they are innocent.
- Already filed on cybercrime.gov.in (NCRP) or called the bank, but nothing moved.

Typical users: students, salaried employees, small traders, freelancers — people who need their own money back for daily life.

**Not for:** Fraudsters, people looking for "one-click unfreeze", or anyone expecting automatic release.

---

## What Unhold Actually Does (Current + Near-Term Capabilities)

### Today (what is live or backend-ready):

1. **Guided Intake (5-step form, no account needed)**
   - Ask about the freeze in your own words.
   - Clarify your role (victim vs innocent receiver).
   - Whether you recognize the funds.
   - Rough amount frozen.
   - NCRP number if you have one.
   - Records your story as structured data + gets required consents.

2. **Evidence Upload + Real-time AI Checking**
   - Upload documents (bank statement, freeze SMS, FIR, chat screenshots, PAN masked, etc.).
   - SHA-256 hash calculated and verified.
   - After upload, AI (NVIDIA) checks the document and shows you live feedback:
     - Flags (e.g., large/unusual amounts, mismatches).
     - Confidence score.
     - "AI is checking..." updates in the activity log.
   - You see results immediately in most cases.

3. **Case Dashboard & Tracking**
   - See your case status in plain language.
   - "Next steps" card with priority actions.
   - Full timeline of what the AI has done and any flags.
   - Evidence count and readiness indicators.

4. **Letter Drafts (L1–L3)**
   - Generates proper escalation letter drafts using SBI-specific templates.
   - **Copy-only** — you must review, approve, and send yourself (email or post).
   - The system tells you the escalation order (start with L1 to branch).
   - Tracks proof when you actually send (you upload screenshot/acknowledgement — required before next level unlocks).

5. **Evidence Bundle (backend complete, UI coming)**
   - Combines all your verified documents into one sealed PDF.
   - Includes cover page + manifest with SHA-256 hashes.
   - You download this and attach it yourself to the letter you send.
   - Creates an audit record.

**Important on sending**: Unhold gives you the letter text + the sealed bundle PDF. You copy the text into your email, attach the bundle (and any photos if you want), and send it from your own account. It does not create a pre-filled email with attachments ready to click. You do the sending. Then you come back and mark that you sent it with proof.

6. **Proof Gates & Audit Trail**
   - You must upload proof you sent L1 before L2 is unlocked.
   - Everything (uploads, letters, actions) is logged with timestamps.
   - Full history you can show the bank, police, or Ombudsman.

### What it does NOT do (ever):
- Send letters or files to the bank for you.
- Guarantee your account will be unfrozen.
- File complaints with NCRP/RBI/police on your behalf.
- Promise timelines or success rates.
- Work like "one click and done".

---

## "Isn't There Already a Solution Like This?"

### Existing options and why many people still struggle:

- **Call the bank helpline or visit branch**  
  Correct first step. Often gets you "we'll check and get back" or a standard reply. Many users report weeks/months of silence even after providing documents. Bank waits for clearance from cyber cell.

- **Official GRM (Grievance Redressal Mechanism) + MRM via cybercrime.gov.in or 1930 (primary 2026+ path)**  
  **Start here.** GRM is the dedicated free mechanism (strengthened 2026) for review/unfreezing wrongly frozen or lien-marked accounts — direct bank + police coordination, video verification, time-bound accountability. MRM for victim fund restoration. Real results shown (e.g., Mumbai). NCRP/1930 is the entry point. GRM gives the structure and power; many still struggle with disorganized submissions.

- **File on cybercrime.gov.in (NCRP) or call 1930**  
  Correct entry. Creates official record. Alone, frequently insufficient for innocent receivers in money trails (original complaint often triggers the freeze).

- **Wait for police/cyber cell investigation**  
  2026 SOP + GRM gives timelines (bank review ~7 days, IO ~15 days, grievance escalation). In practice, many innocent holders report "complaint closed" but account still frozen for 1–19+ months with no communication.

- **Hire a local lawyer or consultant**  
  Works for some. Expensive, and you still need to gather/organize the same docs. Unhold gives you the organized starting package.

- **RBI Ombudsman**  
  Free and powerful when it applies. Usually expects prior proper escalation (now via GRM). Strong docs help.

**The gap Unhold targets**:
Most people end up with scattered screenshots, incomplete documents, no proof of follow-up, and no GRM-ready package. GRM and banks respond better to structured, timestamped, verifiable, GRM-aligned submissions.

Unhold turns "I have some papers and an NCRP number" into "Here is a GRM-optimized sealed bundle of verified evidence + formal representations with proof I followed the steps — ready for official submission." We are the best prep/intel companion for the official GRM process.

**Special note on "Why not just use Claude/ChatGPT?"**: See the dedicated detailed answer in `docs/REAL_USER_OBJECTIONS_FAQ.md` (section 12). Short version: A general LLM gives you text. Unhold gives verified + sealed evidence, enforced proof gates, and a persistent credible audit trail. The two can be used together (use Claude to review Unhold's drafts if you want), but they are not the same thing.

---

## Exact Comparison: Unhold vs Copperlane (Penny)

**Copperlane (YC W26)** is an **AI-native mortgage origination platform** built for US mortgage **lenders**.

Their main product is an AI agent called **"Penny"** that acts like a full autonomous loan officer assistant.

### What Copperlane / Penny actually does:
- Proactively communicates with borrowers via chat, text, voice, and email.
- Guides the borrower through the entire loan application (conversational intake).
- Automatically pulls and verifies documents in real-time.
- Flags missing or conflicting information and follows up with the borrower automatically.
- Drafts "Letters of Explanation" for the borrower.
- Checks income patterns, assets, credit, and other underwriting conditions.
- Optimizes rate pricing suggestions.
- Prepares a clean, pre-vetted file so the human loan officer only has to do final review.
- Goal: Lenders can process 2x more loans because the AI handles most of the document chasing and back-and-forth.

**Key point**: Copperlane operates on the **lender side** for US home loans (mortgages). The AI is allowed to be quite autonomous because it's helping people get approved for new loans, not dealing with frozen bank accounts or formal legal escalation letters to banks.

---

**Unhold** is completely different:
- Victim-side tool for people in India whose bank/UPI accounts are **already frozen**.
- Domain: Innocent receivers (especially SBI) caught in fraud chains.
- We deliberately **do not** copy the heavy automation.
- Letters are copy-only.
- User must send everything themselves.
- Strong proof gates and audit trail (because this is about proving innocence to banks/police).

**Unhold** is a **victim-side case manager for India bank/UPI freezes** (SBI innocent-receiver focus).
- Core: Helps people whose accounts are already frozen prepare evidence and letters.
- What it does today/near-term:
  - Guided (currently 5-step, moving toward more conversational) intake for freeze stories.
  - Evidence upload with SHA-256 + real-time AI verification feedback (NVIDIA OCR/vision).
  - Sealed evidence bundle (professional PDF package for the bank).
  - Copy-only L1–L3 escalation letter drafts (SBI templates).
  - Proof gates (you must prove you sent L1 before L2 unlocks).
  - Human-readable AI activity timeline + next steps.
  - Full audit trail and human ops queue for complex cases.
- Goal: Give frozen account holders a stronger, documented submission they can send themselves so the bank/cyber cell actually acts.
- Strict limits (by design):
  - No auto-send of anything.
  - No guarantees or timelines promised.
  - Consent required for AI processing of documents.
  - User always controls and performs the final actions.
  - India-specific (UPI chains, SBI playbooks, innocent receiver scenarios).
  - Human gates and proof required at every escalation level.

### Side-by-side

| Aspect                    | Copperlane (Penny)                                      | Unhold                                                  |
|---------------------------|---------------------------------------------------------|---------------------------------------------------------|
| Side                      | Lender side (mortgage companies) + borrowers            | Victim side (people whose accounts are already frozen)  |
| Country / Domain          | US home loans (mortgages)                               | India bank & UPI freezes (mainly SBI innocent receivers)|
| Main AI Agent             | "Penny" — acts like an autonomous loan officer          | Multiple agents (Intake, Verifier, Drafter, etc.)       |
| What the AI does          | Collects docs, verifies, follows up, drafts explanations, optimizes pricing, prepares full files | Verifies evidence (SHA + AI), creates sealed bundle, generates copy-only letter drafts |
| Automation level          | High — AI proactively messages borrowers and prepares files | Very low — everything is copy-only, user sends | 
| Human role                | Loan officer does final review                          | User must review, send letters, upload proof |
| Key Output                | Clean pre-underwritten loan file for the lender         | Sealed evidence bundle PDF + tracked escalation letters |
| Why different rules       | Helping people get new loans approved (lower legal risk) | Dealing with frozen money + formal letters to banks (high legal risk) |

**Copperlane inspiration we took** (only the good UX parts):
- Conversational guidance
- Real-time document feedback
- Clear "AI did this" timeline
- Pipeline dashboard feel

We deliberately did **not** copy the heavy autonomous sending and auto follow-up, because Unhold's domain is much more sensitive.

**Copperlane inspiration we are borrowing (only UX patterns, not the model):**
- Conversational/guided feel
- Real-time document feedback
- Clear "AI activity" timeline
- Pipeline view of cases
- Proactive suggestions

We are deliberately **not** copying the autonomous/agentic parts because Unhold operates in a completely different regulatory and trust context (India banking freezes for innocents).

---

## Simple Explanation: What Copperlane Actually Does

Copperlane is a US company (YC W26) that makes software for **mortgage lenders** (banks/companies that give home loans).

Their AI is called **Penny**. Penny works like a very smart loan officer assistant that can:

- Talk to the person applying for a home loan (via chat, text, or email)
- Automatically ask them for documents
- Check the documents as soon as they upload
- Tell them "this document is missing" or "this looks wrong, please explain"
- Write explanation letters for them
- Prepare a clean file so the human loan officer has less work

**Result**: The mortgage company can approve more loans faster because the AI does most of the chasing and checking.

It is **proactive and does a lot automatically** — because it's helping people get a new loan approved in America.

---

**Unhold is the opposite**:
- We help people in India whose account is **already frozen**.
- We are very careful — we never send anything automatically.
- We only help you prepare a strong evidence package + letters.
- **You** still have to send everything yourself.

That's why we can borrow some of Copperlane's nice UX ideas (real-time checking, timelines, guided flow) but we cannot copy their heavy automation.

---

## Simple Way to Explain to Normal People

"Imagine your salary or rent money lands in your SBI account and suddenly the whole account is frozen because someone earlier in the payment chain did fraud.

You file a complaint. You call the bank. Weeks or months go by with no reply.

Unhold helps you gather your bank statements, messages, FIR etc., checks them automatically, puts them into one sealed professional file, and gives you proper letters to send to the bank branch and higher officers — with proof you actually sent the earlier ones.

You still have to send the letters yourself. But instead of random screenshots and 'I called once', you have an organized package with a clear record."

---

**Use the files in this folder for continuity:**
- This file (`docs/WHAT_UNHOLD_IS_AND_DOES.md`)
- `docs/REAL_USER_OBJECTIONS_FAQ.md`
- `docs/X_REPLY_TEMPLATES.md`
- `docs/REMAINING_WORK.md`

When someone asks "what does it do?", point them here or copy the sections above. Keep answers specific and honest.