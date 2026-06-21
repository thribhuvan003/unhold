# LienLiberator — Agent System Spec (Zero Hallucination)

**Parent:** `BUILD_SPEC.md` v3 §8  
**Rule:** LLM proposes; Postgres + guards decide. Never auto-send.

## 1. Agent Inventory

| Agent | Model | Input | Output schema | Tools ALLOWED | Tools FORBIDDEN |
|-------|-------|-------|---------------|---------------|-----------------|
| INTAKE | Sonnet | redacted case + evidence manifest | `IntakeClassificationOutput` | get_case, get_evidence_list, get_playbook, search_supermemory, write_supermemory_fact, enqueue_human_gate | draft_letter, send_*, file_*, mark_escalation_sent |
| DRAFTER | Sonnet (L3: Opus) | case + playbook + template | `LetterDraftOutput` | get_case, get_playbook, get_bank_contacts, get_template_fallback, get_escalation_history | send_*, file_*, mark_escalation_sent |
| MONITOR | Haiku | case + last actions | `MonitorTickOutput` | get_case, set_next_check_at, set_user_action_required, get_action_logs | draft_letter, send_*, write_supermemory_fact |
| VERIFIER | Sonnet + vision | evidence image | `VerifierResultOutput` | run_vision_ocr, update_evidence_extracted_json, enqueue_human_gate | draft_letter, delete_evidence |
| EVIDENCE | none (code) | evidence rows | `EvidenceBundleOutput` | compute_sha256, generate_bundle_manifest | all external |
| ESCALATOR | Haiku | case + escalations | `EscalatorSuggestionOutput` | check_proof_gates, enqueue_drafter_job | skip_escalation_level, mark_escalation_sent |
| PRESSURE | none (SQL) | aggregates | `PressureAggregateOutput` | get_anonymized_case_stats | all PII tools |
| ORCHESTRATOR | none | case status | job_type | enqueue_agent_job | all LLM + send |

## 2. Zod Schemas (`lib/agents/schemas.ts`)

```typescript
import { z } from 'zod';

export const FreezeReasonSchema = z.enum([
  'cyber_upi_chain', 'suspected_mule', 'kyc_expired', 'tax_attachment',
  'court_order', 'police_notice_bnss106', 'bank_str', 'cheque_dishonour',
  'death_nomination_dispute',
]);

export const CitationSchema = z.object({
  source_id: z.string(), // must exist in input manifest
  field: z.string(),
  excerpt: z.string().max(200),
});

export const IntakeClassificationOutputSchema = z.object({
  freeze_reason: FreezeReasonSchema,
  freeze_type: z.enum(['debit_freeze', 'credit_freeze', 'total_freeze', 'partial_lien']),
  victim_role: z.enum(['victim', 'innocent_receiver']),
  confidence: z.number().min(0).max(1),
  confidence_breakdown: z.record(z.string(), z.number()),
  missing_documents: z.array(z.string()),
  playbook_slug: z.string(),
  refuse_to_classify: z.boolean(),
  refuse_reason: z.string().optional(),
  human_review_required: z.boolean(),
  citations: z.array(CitationSchema).min(1),
});

export const LetterDraftOutputSchema = z.object({
  subject: z.string().max(200),
  body: z.string().max(8000),
  level: z.enum(['L1', 'L2', 'L3', 'L4']),
  template_slug: z.string(),
  placeholders_used: z.array(z.string()),
  placeholders_missing: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  disclaimer_block: z.literal('DRAFT ONLY — REVIEW BEFORE USE'),
  language: z.literal('en'),
});

export const MonitorTickOutputSchema = z.object({
  message: z.string().max(500),
  user_action_required: z.boolean(),
  action_code: z.string().optional(),
  action_title: z.string().optional(),
  suggest_status_transition: z.null(), // never auto-transition
  quiet_hours_suppressed: z.boolean(),
});

export const VerifierResultOutputSchema = z.object({
  confidence: z.number().min(0).max(1),
  field_confidence: z.record(z.string(), z.number()),
  extracted: z.object({
    bank_name: z.string().optional(),
    amount_paise: z.number().int().optional(),
    freeze_type: z.string().optional(),
    ncrp_id: z.string().regex(/^\d{14}$/).optional(),
    date_detected: z.string().optional(),
  }),
  forgery_risk: z.boolean(),
  forgery_flags: z.array(z.string()),
  mismatches: z.array(z.object({ field: z.string(), expected: z.string(), found: z.string() })),
  human_review_required: z.boolean(),
});
```

## 3. Grounding Rules (all system prompts)

1. If a fact is not in provided JSON inputs, **omit it** — never invent.
2. Never claim guaranteed unfreezing or legal outcomes.
3. Never request banking passwords, UPI PIN, or full Aadhaar.
4. Every classification field needs ≥1 citation with valid `source_id`.
5. On confidence < threshold → set `human_review_required: true`.
6. Letters are drafts only; never say "I filed" or "we sent".

## 4. Confidence Thresholds

| Agent | Auto-accept | Human gate |
|-------|-------------|------------|
| INTAKE | ≥0.75 | <0.75 |
| VERIFIER | ≥0.85 | <0.85 |
| DRAFTER | ≥0.70 | <0.70 or missing required placeholder |

## 5. Refusal Conditions (hard stop)

- Amount in OCR differs from user input by >10%
- `freeze_reason: court_order` without court_order evidence
- `suspected_mule` + user admits receiving unknown funds → no innocent-receiver playbook
- `forgery_risk: true` on evidence
- L2/L3 draft requested without prior level proof in DB

## 6. Template Fallbacks (LLM failure)

### L1 — `sbi_branch_lien_release`

```
To,
The Branch Manager
{{BANK_NAME}} — {{BRANCH_CITY}} Branch

Subject: Request for release of lien / debit freeze on Account No. XXXXXX{{ACCOUNT_LAST4}}

Respected Sir/Madam,

I am {{USER_NAME}}, holder of the above savings/current account. A lien/debit freeze of Rs. {{AMOUNT_INR}} was applied on {{FREEZE_DATE}} (Ref: {{NCRP_ID}}).

I am an innocent receiver of a fraudulent UPI transaction and have filed NCRP complaint {{NCRP_ID}}. I request release of the lien under applicable RBI guidelines.

Enclosures: NCRP acknowledgement, bank SMS screenshot, ID proof.

Yours faithfully,
{{USER_NAME}}
{{USER_PHONE}}
```

### L2 — `sbi_nodal_escalation`

```
To,
Nodal Officer — {{BANK_NAME}}
Email: {{NODAL_EMAIL}}

Subject: Escalation — No response to branch complaint dated {{L1_SENT_DATE}}

[References branch letter sent {{L1_SENT_DATE}}; 10-day wait elapsed]
```

### L3 — `rbi_ombudsman_sbi`

```
Facts for RBI CMS filing (user files manually at cms.rbi.org.in):
Bank: {{BANK_NAME}}
Account: XXXXXX{{ACCOUNT_LAST4}}
Amount frozen: Rs. {{AMOUNT_INR}}
NCRP: {{NCRP_ID}}
Prior escalations: Branch {{L1_SENT_DATE}}, Nodal {{L2_SENT_DATE}}
```

## 7. Golden Eval (20 cases — CI gate)

File: `tests/unit/agents/golden/agent_eval.json`

Pass: ≥18/20 correct `freeze_reason`; 0 invented NCRP IDs; 100% disclaimer literal match.

Cases: innocent receiver (G01), victim fork (G02), KYC vs cyber (G03), tax refusal (G04), court refusal (G05), amount mismatch (G07), L1/L2/L3 gates (G09–G11), forgery (G16–G19), template fallback (G20).

## 8. Anti-Hallucination Checklist

- [ ] Zod parse on every agent output; reject on fail → template fallback or human_ops
- [ ] `validateCitations()` — source_id in manifest
- [ ] `validateNoInventedIds()` — NCRP 14-digit only if in input
- [ ] `redactPii()` before every `anthropic.messages.create`
- [ ] Cross-border consent before first LLM call
- [ ] CI grep: no `send_email`, `file_rbi`, `file_ncrp`
- [ ] Cost cap $2/case → stop LLM, route human_escalation
- [ ] Langfuse trace per job; no PII in tags