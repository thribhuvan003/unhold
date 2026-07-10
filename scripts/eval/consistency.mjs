#!/usr/bin/env node
// scripts/eval/consistency.mjs
// Consistency check for the Notice Analyzer: run each golden case EVAL_RUNS times
// and measure output STABILITY — does the analyzer return the same freeze_reason
// every time, and does the modal answer match the expected class?
//
//   node --env-file=.env.local scripts/eval/consistency.mjs        (EVAL_RUNS=5)
//   EVAL_RUNS=9 node --env-file=.env.local scripts/eval/consistency.mjs
//
// Production AI quality is not just accuracy — it's repeatability. A model that
// flips between two classes on identical input is a reliability risk.
import { readFile } from 'node:fs/promises';

const BASE = process.env.EVAL_BASE_URL ?? 'http://localhost:3005';
const RUNS = Math.max(2, Number(process.env.EVAL_RUNS ?? 5));
const j = (r) => r.text().then((t) => { try { return JSON.parse(t); } catch { return t; } });

const data = JSON.parse(await readFile(new URL('../../tests/golden/notice_eval.json', import.meta.url), 'utf8'));

async function analyzeReason(notice) {
  const s = await fetch(`${BASE}/api/v1/guest/sessions`, { method: 'POST' });
  const tok = (await j(s)).device_token;
  const C = `ll_guest=${tok}`;
  const cr = await fetch(`${BASE}/api/v1/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: C, 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ bank_slug: 'state-bank-of-india', consent_accepted: true, ai_consent_accepted: true, frozen_amount_paise: 200000 }),
  });
  const id = (await j(cr)).id;
  const an = await fetch(`${BASE}/api/v1/cases/${id}/notice-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: C },
    body: JSON.stringify({ input_kind: 'text', pasted_text: notice }),
  });
  const body = await j(an);
  return body.analysis?.freeze_reason ?? 'NULL';
}

const rows = [];
for (const c of data.cases) {
  const reasons = [];
  for (let i = 0; i < RUNS; i++) reasons.push(await analyzeReason(c.notice));
  const counts = reasons.reduce((m, r) => ((m[r] = (m[r] || 0) + 1), m), {});
  const [modal, modalCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const stable = Object.keys(counts).length === 1; // every run identical
  const matchExpected = c.expected_freeze_reason.includes(modal);
  const consistencyRate = modalCount / RUNS; // share agreeing on the modal answer
  rows.push({ id: c.id, modal, stable, matchExpected, consistencyRate });
  console.log(`${c.id}: modal=${modal.padEnd(22)} stable=${stable ? 'YES' : 'no '} match=${matchExpected} [${reasons.join(' ')}]`);
}

const n = rows.length;
const fullyStable = rows.filter((r) => r.stable).length;
const avgConsistency = rows.reduce((s, r) => s + r.consistencyRate, 0) / n;
const modalAccuracy = rows.filter((r) => r.matchExpected).length / n;

console.log('\n=============== CONSISTENCY SUMMARY ===============');
console.log(`runs per case:          ${RUNS}`);
console.log(`cases:                  ${n}`);
console.log(`fully-stable cases:     ${fullyStable}/${n}  (${((fullyStable / n) * 100).toFixed(0)}% identical across all runs)`);
console.log(`avg consistency rate:   ${(avgConsistency * 100).toFixed(1)}%  (share agreeing on the modal answer)`);
console.log(`modal-class accuracy:   ${(modalAccuracy * 100).toFixed(0)}%  (modal answer matches expected)`);
