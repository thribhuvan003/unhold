# Unhold — 2026 Product & Architecture Evolution Plan

_Compiled 2026-07-05. This plan is research-backed and honestly graded. Every model/market claim carries a confidence tag:_
- **[LIVE]** — I verified it myself by calling the real API on 2026-07-05 (latency/behaviour measured).
- **[WEB]** — verified on the web with a dated source (mid-2026).
- **[VENDOR]** — a vendor's own claim/benchmark, not independently confirmed — treat with caution.
- **[UNVERIFIED]** — could not confirm; do not put in user-facing copy without checking primary source.

> Anti-hallucination rule (already in this repo) applies to this document too: legal clause numbers and statutory timelines below are **source-asserted from secondary sources** and must be checked against the bare Act / RBI-MHA circulars before they appear anywhere a user sees them.

---

## 1. The thesis — why this beats "just ask ChatGPT"

A general assistant (ChatGPT, voice, in Hindi) wins on **convenience**. It loses, badly, on the three things that actually get a frozen account released — and those three things are the entire product:

1. **It won't invent official facts.** Legal-AI hallucination is a documented, court-sanctioned problem: even retrieval-grounded legal tools hallucinate 17–34% (Stanford RegLab), and there were 66+ court sanctions for AI legal hallucinations in 2025. **[WEB]** For a freeze victim, a wrong nodal email, wrong authority, or wrong deadline is real harm. Unhold is built to refuse-or-cite, never guess (we already removed an unverifiable SBI email from the code).
2. **It tracks the case for 90 days.** A freeze is a multi-week process with hard clocks (golden hour → 7-day bank window → 30-day RBI escalation → 90-day cap). ChatGPT forgets you when the tab closes. State + deadline reminders is a system, not a chat.
3. **It produces the artifact and enforces the order.** The bank acts on a formal grievance with proof, escalated in sequence. ChatGPT will happily let you skip to the Ombudsman and get thrown out.

**Positioning:** _"ChatGPT gives advice; Unhold runs your case."_ A guarded, cited, deadline-tracking, document-producing engine — delivered in the user's language and voice.

**The honest pivot (this is the roadmap):** the moat is **not the website**. It is (a) verified/guarded domain data, (b) persistent case state + deadlines, (c) the produced proof/grievance artifacts, and (d) vernacular access. Deliver those through whatever channel is easiest for a panicking, low-literacy victim — which points at **voice + WhatsApp in Hindi/regional languages**, not a form.

---

## 2. Product shift — from website form to a vernacular case-engine

| Today | Target |
|---|---|
| Website + form wizard | Guarded case-engine with **WhatsApp + voice** front door (website stays as the "workspace") |
| English-first | **Hindi + regional first**, voice-in / voice-out |
| User drives every step | Engine tracks the clock and **nudges** at each deadline |
| Advice + letters | Same guardrails, delivered where the victim already is (WhatsApp) in the **golden hour** |

Why WhatsApp: a victim who messages **you first opens a free 24-hour service window** (inbound service messages are free), and WhatsApp supports **voice notes in and out** — so a scared user can just record what happened in Hindi. **[WEB]**

---

## 3. Architecture — the agent team

Keep the current philosophy (multi-agent + `swarm_events` audit log + human-in-the-loop) and harden it into a **stateful, auditable orchestration**, not a free-for-all swarm.

**Orchestration pattern:** a deterministic **orchestrator → workers** graph with checkpointing (the LangGraph model — the 2026 production standard for stateful, auditable, resumable workflows, with time-travel/rollback). **[WEB]** Reserve parallel fan-out for cheap isolation (document checks), and route only genuinely hard steps to a frontier model — heavy multi-agent runs cost multiples more tokens (~7× per this repo's own ops notes). **[WEB + repo]**

**Agent roster** (existing + proposed additions):

| Agent | Job | Status |
|---|---|---|
| Intake | classify freeze reason, victim vs receiver | exists |
| Verifier | judge document relevance + read + forgery/mismatch + confidence | exists (hardened this week) |
| Drafter | fill official-format letters from a fixed library | exists |
| Escalator | enforce the L1→L2→L3 proof-gated ladder | exists |
| Monitor | track statutory deadlines, fire reminders | exists → expand |
| Human-ops | review low-confidence / flagged before submission | exists |
| **Voice/Language** _(new)_ | ASR in, translate, TTS out (Hindi + regional) | propose |
| **Guardian** _(new)_ | prompt-injection + "off-corpus → refuse" gate on every user turn | propose |

**Protocol note:** MCP + Agent-to-Agent (A2A) are now standardized under the Linux Foundation and spoken by every major framework — safe to build on. **[WEB]**

---

## 4. Model-per-job — which model for which task

Frontier landscape (mid-2026): **Claude Opus 4.8 / Fable 5**, **GPT-5.5**, **Gemini 3.1 Pro / 3.5 Flash**, **Grok 4.3**. **[WEB]** But for this product, **model quality is not the bottleneck — guardrails and cost-at-scale are.** Route accordingly:

| Job | Recommended | Why | Grade |
|---|---|---|---|
| Hard reasoning / planning (orchestrator, edge cases) | **Claude Opus 4.8 / Fable 5** (frontier, only when needed) | best agentic reasoning; use sparingly for cost | [WEB] |
| Cheap high-volume intake/classification | **gpt-oss-120b on Groq** (0.56s) or **Claude Haiku 4.5** ($1/$5) | current repo default; fast + cheap | [LIVE] / [WEB] |
| Document OCR / verify | **Groq `llama-4-scout` (0.41s) or `qwen3.6-27b` (0.56s)** for speed+cost, **Gemini 3 Flash** when accuracy > throughput | Gemini 3 Flash tops the OCR Arena; Groq path already wired with the relevance guardrail | [LIVE] / [WEB] |
| Letter drafting | **gpt-oss-120b** (Groq) or **Claude Sonnet 5** | strong structured output; keep the legal-citation guardrail | [LIVE] / [WEB] |
| **Hindi/regional ASR (voice-in)** | **Sarvam Saaras v3** (23 langs, code-mixed) — hedge with **AI4Bharat IndicConformer** (self-host) / **Whisper-turbo on Groq** | Sarvam is most turnkey; Whisper-turbo is served on Groq today | [WEB] / [LIVE] |
| **TTS (voice-out)** | **Sarvam Bulbul v3** (sub-250ms) or **Bhashini/AI4Bharat** (sovereign) | streaming, 11 langs; Groq also serves an Orpheus TTS | [WEB] / [LIVE] |
| Translation | **IndicTrans2 (AI4Bharat)** or Sarvam | 22 languages, self-hostable | [WEB] |
| Prompt-injection guard | **`llama-prompt-guard-2` on Groq** | purpose-built guard model, served today | [LIVE] |

**Live-measured latencies (2026-07-05, Groq):** `llama-4-scout` 0.41s · `gpt-oss-120b` 0.56s · `qwen3.6-27b` 0.48s text / 0.56s vision · `llama-3.3-70b` 1.3s. **[LIVE]**

**Live relevance-guardrail proof (2026-07-05):** fed the verifier prompt a resume and a food receipt → `relevant:false` conf 0.1 (rejected); a real freeze notice and bank statement → `relevant:true` conf 0.95 (accepted). All < 1s. **[LIVE]**

**⚠️ Migration flag:** Groq announced deprecation (June 17 2026) of `llama-3.1-8b`, `llama-3.3-70b`, `qwen3-32b`, `llama-4-scout` → migrate to `gpt-oss-20b/120b` + `qwen3.6`. **[WEB]** I confirmed **live** they still respond today (deprecated ≠ removed), but plan the migration before sunset. This repo's default (`gpt-oss-120b` + `qwen3.6`) is already on the safe side. **[LIVE]**

**Indian-language cost caveat:** global frontier models handle Hindi but are **3–5× more token-hungry per Hindi word** — a real cost/latency penalty at volume, which is why an India-tuned stack (Sarvam/Bhashini) matters for the voice path. **[WEB]**

---

## 5. The vernacular voice + WhatsApp front door

**Pipeline:** WhatsApp voice note (Hindi) → **Saaras v3 ASR** → orchestrator (guarded engine) → **Bulbul v3 TTS** → voice reply + a WhatsApp **Flow**/list for structured steps (upload notice, confirm details).

Key facts to design around **[WEB]**:
- **Inbound service messages are free** within a 24-hour window → inbound-led support is cheap; a Click-to-WhatsApp ad reply opens a 72-hour free window.
- Business-initiated templates are **per-message billed** (India in INR since Jan 2026; utility/auth ~80–90% cheaper than marketing) — use utility templates for deadline reminders.
- Interactive: **Flows** (multi-step forms), **list messages** (≤10 options), **reply buttons** (≤3), media headers. Voice notes send + play inline (but audio can't be an interactive header).
- Onboarding in India: Business Verification ~2–4 days, full WABA ~3–10 business days, first template approval ~24–48h; needs matching legal identity + GST/registration docs. _(BSP-blog sourced — confirm against Meta directly.)_

---

## 6. Trust & compliance features — the "make HR go quiet" list

These are the features a general assistant **structurally cannot** replicate, and each doubles as a compliance artifact:

1. **Closed-corpus RAG over verified official sources only** (I4C/NCRP procedure, RBI circulars, the statute text, bank NOC formats) with **inline citations**; refuse/deflect when off-corpus. **[WEB pattern]**
2. **No free-form legal advice — templated document generation** from a fixed library (grievance, NOC request, RBI-Ombudsman complaint). Bounded output = bounded liability. _(Already the repo's letter model.)_
3. **Statutory-deadline / SLA tracking** on the freeze timeline (golden hour, 7-day bank window, 30-day RBI escalation, 90-day cap) → **time-bound WhatsApp reminders**. State ChatGPT can't hold.
4. **Human-in-the-loop review** before any submission — courts/firms increasingly *require* documented human review; make it visible. **[WEB]** _(Repo already routes low-confidence to human-ops.)_
5. **Immutable audit + consent log** — the DPDP evidence (in-language consent, timestamped) **and** the proof-of-victim trail for the cyber cell, in one artifact. _(Repo already has append-only consent + `swarm_events`.)_
6. **No-hallucination official-data guardrail** — verified-only bank/authority contacts with source URLs + verified dates; deterministic PIN→circle resolution. _(Already built.)_

---

## 7. DPDP + RBI compliance plan

Status **[WEB]**: DPDP Act in force; **DPDP Rules 2025 notified 13 Nov 2025**; phased — Consent Managers from **13 Nov 2026**, core consent/notice/rights from **13 May 2027**. Fintech adds an **RBI overlay** (payment-data localization; 6-hour incident report) on top of DPDP's 72-hour breach notice.

What Unhold must do (build these in):
- **In-language consent is a legal requirement** (notice must be in English or a scheduled language, or consent can be invalid) — so vernacular design is a *compliance feature*, not just UX. **[WEB]** Capture + log it immutably in the user's language.
- **Data minimization**; **India-resident storage** for any payment/financial data (RBI). **[WEB]**
- **Breach playbook:** Data Protection Board + affected users within **72 hours**; a **6-hour** path if partnered with a regulated entity. **[WEB]**
- **Rights handling** (access/correction/erasure/grievance) + a named **grievance officer**; **retention limits**.

---

## 8. Distribution & moat

The hard-to-copy asset is **legitimacy + referral relationships**, not code:
- MoUs / integrations with **state cyber cells, DLSA & legal-aid, bank grievance desks, consumer forums**.
- **I4C's 1930 revamp (announced June 2026: AI + multilingual + victim-grievance framework)** is both validation and a **build-vs-partner** decision — engage early; it could be a partner API or a competitor. **[WEB — verify exact PIB release]**
- **Verified official data feeds + referral relationships** are what a general assistant can never hold.

---

## 9. What else to add (features that impress + genuinely help)

- **Golden-hour fast path:** the moment someone opens WhatsApp, a 3-tap "freeze happened now" flow that generates the 1930/NCRP report checklist — recovery odds are highest in the first hour.
- **Proof-of-victim pack:** the sealed, hash-stamped bundle re-framed as the exact document the cyber cell needs to issue an NOC.
- **Deadline reminders over WhatsApp** (utility templates) — "day 7: ask your bank for the reference number."
- **Evaluation harness + accuracy dashboard:** measure verifier confidence, false-accept/false-reject on a labeled set — shows engineering maturity and de-risks the AI claims. _(Partially exists: eval scripts + 241 tests.)_
- **Multi-language coverage** rollout (start Hindi → add regional by volume).
- **Public transparency page:** "here's what our AI can and cannot do, and where a human checks" — trust as a feature.

---

## 10. Phased roadmap

| Phase | Focus | Ships |
|---|---|---|
| **M0 (now)** | Harden the guarded engine | ✅ relevance rejection, dedup, proof-gates, no-hallucination contacts, 241 tests |
| **M1** | Deadline engine + reminders | Monitor agent expansion; WhatsApp utility-template reminders |
| **M2** | WhatsApp front (text) | Cloud API onboarding; inbound-led intake as a Flow; closed-corpus RAG with citations |
| **M3** | Vernacular voice | Sarvam Saaras + Bulbul pipeline; Hindi first; Guardian (injection) agent |
| **M4** | Compliance hardening | DPDP consent-log + grievance officer + breach playbook; data-localization review |
| **M5** | Distribution | Pilot MoU with one state cyber cell / legal-aid; transparency page |
| **M6+** | Scale languages + eval | Regional languages by volume; accuracy dashboard; partner-vs-compete decision on 1930 |

---

## 11. Honest risks & open items (verify before relying)

- **Legal clause numbers & timelines** (BNSS §106; <₹50k no-court-refund; 90-day freeze-lift; DPDP section numbers) are **secondary-source-asserted** — check primary text before any user-facing copy. **[UNVERIFIED]**
- **Exact WhatsApp ₹ rates + India doc checklist** — BSP-blog sourced; confirm on Meta's official pages. **[UNVERIFIED]**
- **Sarvam accuracy / sub-250ms / "beats frontier on Indic OCR"** — vendor self-benchmarks; pilot-test before committing. **[VENDOR]**
- **GPT-5.6** (Sol/Terra/Luna) is a **gov-gated limited preview** — do not architect on it yet. **Gemini 3.5 Pro** existence is disputed — confirm on ai.google.dev. **[UNVERIFIED]**
- **The 1930 revamp** may partner or compete — verify the exact June 2026 PIB release before betting on it.
- **Model deprecations:** migrate off Groq's June-17-deprecated models before sunset (still live today, but on the clock). **[LIVE + WEB]**

---

## 12. The one-liner for a recruiter

> _"ChatGPT wins on convenience and language; it loses on not hallucinating legal facts, tracking a case over 90 days, and producing the actual submission. So the right build is a guarded, cited, deadline-tracking case-engine behind a Hindi voice/WhatsApp front — verified official data, human-checked, DPDP-compliant by design. I live-tested the model stack (sub-second on Groq; Sarvam for Indic voice), used a research team with a verification pass so nothing here is a guessed model name, and here's the phased roadmap."_

A junior founder claims their thing beats ChatGPT. This plan shows exactly where it doesn't, and builds the moat where it does.

---

_Research method: two parallel research agents (models+orchestration; India voice/WhatsApp/compliance) with mandatory source-dating and confidence tags, plus a live-API verification pass (Groq catalog + latencies, relevance-guardrail behaviour) that caught a "deprecated-but-still-served" discrepancy the web sources got wrong. Frontier + Indic + regulatory facts are web-sourced (mid-2026); model behaviour/latency is first-hand._
