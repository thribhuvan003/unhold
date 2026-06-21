# Organization — Teams, Agents, Folders

**One-page map.** Claude Team Lead reads this after `START_HERE.md`.

Public product: **Unhold** · Internal codename: **lienliberator** · Owner: **thribhuvan003**

---

## 1. Three agent layers (never mix)

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — TEAM (prompts/team/)                             │
│  TEAM_LEAD dispatches specialists — research & review ONLY  │
│  Parallel at PLANNER and REVIEWER phases                    │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2 — HARNESS (prompts/agents/)                        │
│  ROUTER → PLANNER → IMPLEMENTER → REVIEWER → VERIFIER       │
│  Sequential — ONE role per turn — IMPLEMENTER writes code   │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3 — PRODUCT (prompts/product/ + lib/agents/)         │
│  Runtime LLM workers inside live cases (INTAKE, DRAFTER…)   │
│  Triggered by jobs/cron — not harness build loop            │
└─────────────────────────────────────────────────────────────┘
```

Index: `prompts/README.md` · Roster: `config/harness/team-roster.json`

---

## 2. Elite team (Layer 1)

| Specialist | Prompt | Edits code? | When |
|------------|--------|-------------|------|
| **TEAM_LEAD** | `prompts/team/TEAM_LEAD.md` | No | Every session orchestrator |
| RESEARCHER | `prompts/team/RESEARCHER.md` | No | Before PLANNER — cite spec |
| ARCHITECT | `prompts/team/ARCHITECT.md` | No | Boundaries, loops, deps |
| DB_ENGINEER | `prompts/team/DB_ENGINEER.md` | No | Migrations, RLS, seeds |
| BACKEND_ENGINEER | `prompts/team/BACKEND_ENGINEER.md` | No | API, state machine, cron |
| FRONTEND_ENGINEER | `prompts/team/FRONTEND_ENGINEER.md` | No | UI review — **flexible skin** |
| AGENTS_ENGINEER | `prompts/team/AGENTS_ENGINEER.md` | No | NVIDIA LLM agents |
| SECURITY_AUDITOR | `prompts/team/SECURITY_AUDITOR.md` | No | **Every slice** review |
| QA_ENGINEER | `prompts/team/QA_ENGINEER.md` | No | Tests vs acceptance |
| DEVOPS_ENGINEER | `prompts/team/DEVOPS_ENGINEER.md` | No | Vercel, env, cron |

Per-slice dispatch matrix: `config/harness/team-roster.json` → `slice_dispatch`

---

## 3. Harness build agents (Layer 2)

| Order | Role | Prompt | May edit code? |
|-------|------|--------|----------------|
| 1 | ROUTER | `prompts/agents/ROUTER.md` | No |
| 2 | PLANNER | `prompts/agents/PLANNER.md` | plan.md only |
| 3 | IMPLEMENTER | `prompts/agents/IMPLEMENTER.md` | **Yes** (scope_files) |
| 4 | REVIEWER | `prompts/agents/REVIEWER.md` | No |
| 5 | VERIFIER | `prompts/agents/VERIFIER.md` | No (runs tests) |

Runner: `scripts/harness/run-slice.sh` · Config: `config/harness/slice-orchestration.json`

---

## 4. Product runtime agents (Layer 3)

| Agent | Prompt | Code | LLM? |
|-------|--------|------|------|
| Orchestrator | `prompts/product/ORCHESTRATOR.md` | `lib/agents/router.ts` | No |
| INTAKE | `prompts/product/INTAKE.md` | `lib/agents/intake/` | NVIDIA MiniMax-M3 |
| DRAFTER | `prompts/product/DRAFTER.md` | `lib/agents/drafter/` | NVIDIA MiniMax-M3 |
| MONITOR | `prompts/product/MONITOR.md` | `lib/agents/monitor/` | Rules (Phase 1) |
| VERIFIER | `prompts/product/VERIFIER.md` | stub | Phase 2 OCR |
| ESCALATOR | `prompts/product/ESCALATOR.md` | `lib/escalations/` | Rules |

LLM client: `lib/llm/nvidia.ts` · Env: `NVIDIA_API_KEY`, `NVIDIA_MODEL`

**Name collision:** Harness VERIFIER ≠ Product VERIFIER (see `prompts/README.md`)

---

## 5. Folder map (where code lives)

```
lienliberator/
├── app/                    # Next.js pages + API routes (/api/v1/*)
├── components/             # UI only — swappable (see FRONTEND_POLICY.md)
│   ├── case/               # NextStepsCard, ActionInbox, SwarmLogPanel
│   ├── evidence/           # EvidenceUploader
│   ├── escalations/        # MarkSentForm
│   ├── letters/            # LetterPreview (copy-only)
│   ├── legal/              # DisclaimerModal, ConsentCheckbox
│   ├── ops/                # QueueTable
│   └── ui/                 # MoneyDisplay, shared primitives
├── lib/
│   ├── agents/             # Product agents (INTAKE, DRAFTER, MONITOR…)
│   ├── api/                # errors, response, cron-auth, case-access
│   ├── auth/               # guest JWT, case access
│   ├── consent/            # consent_records append
│   ├── escalations/        # proof gates, ladder
│   ├── evidence/           # sha256, storage paths
│   ├── jobs/               # agent_jobs queue
│   ├── llm/                # NVIDIA chat client
│   ├── loops/              # case-tick, harness types
│   ├── ops/                # human gate, operator auth
│   ├── state-machine/      # guards, transitions — ONLY way to change status
│   ├── supabase/           # client, server, admin
│   └── ui/                 # design tokens (change fonts/colors here)
├── supabase/migrations/    # Canonical DB schema (001–010)
├── tests/                  # unit, contract, e2e
├── prompts/                # team + harness + product prompts
├── config/
│   ├── harness/            # slice-orchestration, team-roster
│   └── public-brand.json   # Unhold, owner, GitHub name
├── scripts/
│   ├── harness/            # run-slice.sh
│   └── owner/              # git-push, vercel-deploy (thribhuvan003)
├── docs/                   # BUILD_SPEC, START_HERE, this file
└── MANIFEST.json           # Slice status — read every session
```

---

## 6. Source-of-truth order

1. `docs/BUILD_SPEC.md`
2. `docs/BUILD_SPEC_AGENTS.md`
3. `docs/BUILD_SPEC_LOOPS.md`
4. `supabase/migrations/*`
5. `package.json`
6. `MANIFEST.json`

Never use root `/2/BUILD_SPEC.md` — stale.

---

## 7. Frontend policy (summary)

**Phase 1 = correct flows, not final polish.** UI/UX/fonts/animations can change later.

- Logic in `lib/` + `app/api/` — **stable**
- Presentation in `components/` + `lib/ui/tokens.ts` — **flexible**
- FRONTEND_ENGINEER reviews behavior, not pixel perfection

Full policy: `docs/FRONTEND_POLICY.md`

---

## 8. Owner commands

```bash
cd lienliberator
pnpm owner:git-config      # thribhuvan003 identity
pnpm owner:push main "msg" # push to thribhuvan003/unhold
pnpm owner:deploy:prod      # Vercel project unhold
```

---

## 9. Session artifacts (per slice)

```
.claude/session/slice-NN/
├── route.json
├── plan.md
├── review-round-1.json
├── verification.json
├── summary.md
└── handoff.md
```

Gitignored — harness writes these during build loop.