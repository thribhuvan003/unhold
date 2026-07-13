#!/usr/bin/env node
// scripts/eval/run.mjs
// Live evaluation of the Notice Analyzer (Groq + RAG + rerank) against the
// golden set in tests/golden/notice_eval.json. Two metrics:
//   1. Classification accuracy — freeze_reason matches an expected enum.
//   2. Faithfulness (LLM-as-judge, Groq) — is the plain-English explanation
//      grounded and free of hallucinated legal claims, with conservative
//      restriction-detail and authority/reference framing.
//
//   node --env-file=.env.local scripts/eval/run.mjs            (uses http://localhost:3005)
//   EVAL_BASE_URL=https://unholdd.vercel.app node --env-file=.env.local scripts/eval/run.mjs
import { readFile } from "node:fs/promises";

const BASE = process.env.EVAL_BASE_URL ?? "http://localhost:3005";
const GROQ = (process.env.GROQ_API_KEYS ?? process.env.GROQ_API_KEY ?? "")
  .split(/[\s,]+/)
  .map((k) => k.trim())
  .filter(Boolean)[0];
const j = (r) =>
  r.text().then((t) => {
    try {
      return JSON.parse(t);
    } catch {
      return t;
    }
  });

const data = JSON.parse(
  await readFile(
    new URL("../../tests/golden/notice_eval.json", import.meta.url),
    "utf8",
  ),
);

async function analyze(notice) {
  const s = await fetch(`${BASE}/api/v1/guest/sessions`, { method: "POST" });
  const tok = (await j(s)).device_token;
  const C = `ll_guest=${tok}`;
  const cr = await fetch(`${BASE}/api/v1/cases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: C,
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      bank_slug: "state-bank-of-india",
      consent_accepted: true,
      ai_consent_accepted: true,
      frozen_amount_paise: 200000,
    }),
  });
  const id = (await j(cr)).id;
  const t0 = Date.now();
  const an = await fetch(`${BASE}/api/v1/cases/${id}/notice-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: C },
    body: JSON.stringify({ input_kind: "text", pasted_text: notice }),
  });
  const body = await j(an);
  return { analysis: body.analysis ?? null, ms: Date.now() - t0 };
}

// LLM-as-judge via Groq: rate faithfulness + conservative, document-first grounding.
async function judge(notice, analysis) {
  const sys = `You are a strict QA judge for an Indian bank-restriction assistant. Given a bank NOTICE and the assistant's ANALYSIS, output ONLY JSON: {"faithfulness":1-5,"restriction_detail_grounded":true|false,"authority_or_reference_grounded":true|false,"hallucinated_legal_claim":true|false,"note":"<8 words"}. faithfulness: 5 = accurate to the notice and conservative; 1 = wrong or invented. restriction_detail_grounded: it accurately states the restriction/amount only if the notice supports it, otherwise says the detail must be obtained in writing. authority_or_reference_grounded: it names an authority/reference only if the notice supports it, otherwise asks the user to obtain it in writing. hallucinated_legal_claim: it asserts an unsupported statute, deadline, automatic release/escalation, refund threshold, NOC outcome, or universal lien-only rule. Do not reward an analysis for saying a restriction must be limited to a disputed amount.`;
  const user = JSON.stringify({
    notice,
    analysis: {
      freeze_reason: analysis.freeze_reason,
      plain_english: analysis.plain_english,
      what_this_means: analysis.what_this_means,
      suggested_next: analysis.suggested_next,
    },
  });
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 200,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });
  try {
    return JSON.parse((await j(r)).choices[0].message.content);
  } catch {
    return null;
  }
}

const rows = [];
for (const c of data.cases) {
  const { analysis, ms } = await analyze(c.notice);
  if (!analysis) {
    rows.push({
      id: c.id,
      classOk: false,
      fr: "NULL",
      faith: 0,
      restriction: false,
      authority: false,
      halluc: true,
      ms,
    });
    continue;
  }
  const classOk = c.expected_freeze_reason.includes(analysis.freeze_reason);
  const verdict = (await judge(c.notice, analysis)) ?? {};
  rows.push({
    id: c.id,
    classOk,
    fr: analysis.freeze_reason,
    expect: c.expected_freeze_reason.join("|"),
    faith: verdict.faithfulness ?? 0,
    restriction: !!verdict.restriction_detail_grounded,
    authority: !!verdict.authority_or_reference_grounded,
    halluc: !!verdict.hallucinated_legal_claim,
    ms,
  });
  console.log(
    `${c.id}: class=${classOk ? "OK " : "MISS"} fr=${analysis.freeze_reason} faith=${verdict.faithfulness} restriction=${verdict.restriction_detail_grounded} authority=${verdict.authority_or_reference_grounded} (${(ms / 1000).toFixed(1)}s)`,
  );
}

const n = rows.length;
const acc = rows.filter((r) => r.classOk).length / n;
const avgFaith = rows.reduce((s, r) => s + (r.faith || 0), 0) / n;
const restrictionRate = rows.filter((r) => r.restriction).length / n;
const authorityRate = rows.filter((r) => r.authority).length / n;
const halluc = rows.filter((r) => r.halluc).length;

console.log("\n================ EVAL SUMMARY ================");
console.log(`cases:                 ${n}`);
console.log(
  `classification accuracy: ${(acc * 100).toFixed(0)}%  (${rows.filter((r) => r.classOk).length}/${n})`,
);
console.log(`avg faithfulness (1-5):  ${avgFaith.toFixed(2)}`);
console.log(
  `restriction grounding:   ${(restrictionRate * 100).toFixed(0)}%  (all cases)`,
);
console.log(
  `authority/ref grounding: ${(authorityRate * 100).toFixed(0)}%  (all cases)`,
);
console.log(`hallucinated legal claim:${halluc}  (lower is better)`);
console.log(
  `avg latency:             ${(rows.reduce((s, r) => s + r.ms, 0) / n / 1000).toFixed(1)}s`,
);
