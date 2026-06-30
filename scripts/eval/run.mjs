#!/usr/bin/env node
// scripts/eval/run.mjs
// Live evaluation of the Notice Analyzer (Groq + RAG + rerank) against the
// golden set in tests/golden/notice_eval.json. Two metrics:
//   1. Classification accuracy — freeze_reason matches an expected enum.
//   2. Faithfulness (LLM-as-judge, Groq) — is the plain-English explanation
//      grounded and free of hallucinated legal claims, with correct lien-only
//      framing where expected.
//
//   node --env-file=.env.local scripts/eval/run.mjs            (uses http://localhost:3005)
//   EVAL_BASE_URL=https://unholdd.vercel.app node --env-file=.env.local scripts/eval/run.mjs
import { readFile } from 'node:fs/promises';

const BASE = process.env.EVAL_BASE_URL ?? 'http://localhost:3005';
const GROQ = (process.env.GROQ_API_KEYS ?? process.env.GROQ_API_KEY ?? '')
  .split(/[\s,]+/).map((k) => k.trim()).filter(Boolean)[0];
const j = (r) => r.text().then((t) => { try { return JSON.parse(t); } catch { return t; } });

const data = JSON.parse(await readFile(new URL('../../tests/golden/notice_eval.json', import.meta.url), 'utf8'));

async function analyze(notice) {
  const s = await fetch(`${BASE}/api/v1/guest/sessions`, { method: 'POST' });
  const tok = (await j(s)).device_token;
  const C = `ll_guest=${tok}`;
  const cr = await fetch(`${BASE}/api/v1/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: C, 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ bank_slug: 'state-bank-of-india', consent_accepted: true, ai_consent_accepted: true, frozen_amount_paise: 200000 }),
  });
  const id = (await j(cr)).id;
  const t0 = Date.now();
  const an = await fetch(`${BASE}/api/v1/cases/${id}/notice-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: C },
    body: JSON.stringify({ input_kind: 'text', pasted_text: notice }),
  });
  const body = await j(an);
  return { analysis: body.analysis ?? null, ms: Date.now() - t0 };
}

// LLM-as-judge via Groq: rate faithfulness 1-5 + lien-only grounding.
async function judge(notice, analysis, expectLienOnly) {
  const sys = `You are a strict QA judge for an Indian bank-freeze assistant. Given a freeze NOTICE and the assistant's ANALYSIS, score it. Output ONLY JSON: {"faithfulness":1-5,"grounded_lien_only":true|false,"hallucinated_legal_claim":true|false,"note":"<8 words"}. faithfulness: 5 = explanation is accurate to the notice and adds correct, non-hallucinated context; 1 = wrong or invented. grounded_lien_only: did it convey that only the disputed amount should be held / the account isn't necessarily fully lost (only relevant for cyber/police freezes). hallucinated_legal_claim: did it assert a specific law/section/number that isn't supported.`;
  const user = JSON.stringify({ notice, analysis: { freeze_reason: analysis.freeze_reason, plain_english: analysis.plain_english, what_this_means: analysis.what_this_means, suggested_next: analysis.suggested_next }, lien_only_expected: expectLienOnly });
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${GROQ}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', response_format: { type: 'json_object' }, temperature: 0, max_tokens: 200, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }),
  });
  try { return JSON.parse((await j(r)).choices[0].message.content); } catch { return null; }
}

const rows = [];
for (const c of data.cases) {
  const { analysis, ms } = await analyze(c.notice);
  if (!analysis) { rows.push({ id: c.id, classOk: false, fr: 'NULL', faith: 0, lien: false, halluc: true, ms }); continue; }
  const classOk = c.expected_freeze_reason.includes(analysis.freeze_reason);
  const verdict = await judge(c.notice, analysis, c.expect_lien_only_grounding) ?? {};
  rows.push({
    id: c.id, classOk, fr: analysis.freeze_reason, expect: c.expected_freeze_reason.join('|'),
    faith: verdict.faithfulness ?? 0,
    lienExpected: c.expect_lien_only_grounding, lien: !!verdict.grounded_lien_only,
    halluc: !!verdict.hallucinated_legal_claim, ms,
  });
  console.log(`${c.id}: class=${classOk ? 'OK ' : 'MISS'} fr=${analysis.freeze_reason} faith=${verdict.faithfulness} lien=${verdict.grounded_lien_only} (${(ms / 1000).toFixed(1)}s)`);
}

const n = rows.length;
const acc = rows.filter((r) => r.classOk).length / n;
const avgFaith = rows.reduce((s, r) => s + (r.faith || 0), 0) / n;
const lienRows = rows.filter((r) => r.lienExpected);
const lienRate = lienRows.length ? lienRows.filter((r) => r.lien).length / lienRows.length : 1;
const halluc = rows.filter((r) => r.halluc).length;

console.log('\n================ EVAL SUMMARY ================');
console.log(`cases:                 ${n}`);
console.log(`classification accuracy: ${(acc * 100).toFixed(0)}%  (${rows.filter((r) => r.classOk).length}/${n})`);
console.log(`avg faithfulness (1-5):  ${avgFaith.toFixed(2)}`);
console.log(`lien-only grounding:     ${(lienRate * 100).toFixed(0)}%  (of ${lienRows.length} cyber/police cases)`);
console.log(`hallucinated legal claim:${halluc}  (lower is better)`);
console.log(`avg latency:             ${(rows.reduce((s, r) => s + r.ms, 0) / n / 1000).toFixed(1)}s`);
