// lib/rag/grm-knowledge.ts
// Bootstrapped curated knowledge for GRM/MRM + legal context (RAG target).
// In prod: seed via migration into pgvector table + embeddings (NVIDIA embed or equivalent).
// Hybrid retrieve stub (text match now; vector later).

export type GrKnowledgeChunk = {
  id: string;
  title: string;
  content: string;
  source: string; // e.g. "I4C GRM 2026 SOP"
  tags: string[];
};

export const GRM_KNOWLEDGE: GrKnowledgeChunk[] = [
  {
    id: 'grm-overview',
    title: 'GRM Overview (2026)',
    content: 'GRM (Grievance Redressal Mechanism) is the dedicated official path under I4C/MHA for review of wrongly frozen/lien accounts in cyber cases. Allows innocent holders (incl. mules) to seek review. Involves banks + police + video verification. Time-bound: bank review ~7 days, IO decision ~15 days. Primary entry via cybercrime.gov.in GRM sections after NCRP.',
    source: 'I4C GRM 2026',
    tags: ['grm', 'unfreeze', 'official'],
  },
  {
    id: 'grm-what-to-submit',
    title: 'What GRM Typically Wants',
    content: 'Strong evidence of innocence: bank statements showing source of funds, transaction proofs, relationship to sender, FIR/NCRP details, ID proof, explanation letter. Structured representation to IO/nodal + proof of prior steps. Sealed/timestamped packages help. Avoid loose files.',
    source: 'I4C GRM guidance + user reports 2026',
    tags: ['grm', 'documents', 'evidence'],
  },
  {
    id: 'mrm-overview',
    title: 'MRM for Victims',
    content: 'Money Restoration Module (MRM) for victims to recover funds from frozen/recovered pools. Works with existing NCRP number. Focus on victim path vs innocent receiver review (GRM).',
    source: 'I4C MRM 2026',
    tags: ['mrm', 'victim', 'official'],
  },
  {
    id: 'sbi-innocent-tips',
    title: 'SBI / Common Bank Response Pattern',
    content: 'SBI often requires formal nodal letter + full evidence trail even after NCRP. Proof of "innocent receiver" (no knowledge of fraud chain) is key. Timelines per 2026 SOP are aspirational; documented packages + follow-up move cases.',
    source: 'SBI playbooks + 2026 reports',
    tags: ['sbi', 'innocent-receiver'],
  },
  {
    id: 'small-amount-trail',
    title: 'Tiny Unknown UPI Test Transfers (₹1–₹10)',
    content: 'Fraudsters send very small amounts (₹2, ₹10, ₹200) from unknown UPI to test if accounts are active or to extend money trails. Innocent receivers (often 3rd+ layer in chain, students/salaried with normal activity) get full account freezes despite only tiny disputed sum. Real cases: entire balance (e.g. ₹1800 or salary) locked; police sometimes demand money; lawyers charge high. GRM is primary review path. Key proof: bank statements showing normal inflows (salary etc.), declaration "no prior contact or knowledge of sender", ID, explanation letter. RBI/HC guidance: lien only disputed amount, but practice varies — GRM + documented package helps.',
    source: 'Real user reports (r/bangalore, r/UPI 2026) + I4C SOP 2026 + RBI guidelines',
    tags: ['grm', 'small-amount', 'innocent-receiver', 'upi-chain'],
  },
  {
    id: 'sop-2026-timelines-90day',
    title: 'SOP 02-Jan-2026: 7d/15d/90d Rules + Appeal Ladder',
    content: 'MHA/I4C SOP (02-Jan-2026, NCRP-CFCFRMS): aggrieved account holder approaches their bank; bank verifies bona fides and submits the grievance to the CFCFRMS/GRM module within 7 days; the Investigating Officer must decide within 15 days. If no lawful direction to continue a hold is received within 90 days of the grievance being raised, the bank is instructed to remove the hold. Appeals: if rejected at police-station level, the holder can appeal to District-level and State-level Grievance Redressal Officers (police side: IO → Addl SP/Dy SP → DIG; bank side: Branch Grievance Officer → State Grievance Officer → National Nodal Officer). Letters should cite the grievance date to invoke the 90-day rule.',
    source: 'MHA/I4C SOP 02-Jan-2026 (NCRP-CFCFRMS) + 2026 press coverage',
    tags: ['grm', 'sop-2026', '90-day', 'appeal', 'official'],
  },
  {
    id: 'escalation-paths',
    title: 'Escalation for Frozen Accounts (Bank Grievance + RBI Ombudsman)',
    content: 'From real user experiences: Start by emailing your bank\'s grievance officer / nodal officer with proof of innocence and bundle. Do not pay police or lawyers "fees". If no response, escalate to RBI Ombudsman (free, online via RBI CMS). Cite RBI guidelines that only the disputed amount should be held, not the entire account. For GRM: File at bank branch per 2026 SOP. Community advice repeatedly: "Write to grievance officer. If no reply, RBI Ombudsman. Don\'t give anyone a single rupee." Useful for 3rd/5th layer innocent cases.',
    source: 'Reddit threads (r/bangalore, r/UPI comments) + X posts 2026 + RBI guidelines',
    tags: ['grievance', 'rbi-ombudsman', 'escalation', 'innocent-receiver'],
  },
  {
    id: 'long-delay-ombudsman',
    title: 'Long-term Freezes & RBI Ombudsman Resolutions (e.g. 19-month cases)',
    content: 'Real cases: Routine UPI freezes lasting 19+ months despite proofs. Resolved via RBI Ombudsman with compensation. GRM/SOP timelines (7d bank, 15d IO) often missed. Proofs: Full statements over time, declarations of innocence, timeline of contacts. Unhold tracker should flag missed deadlines and suggest Ombudsman escalation with bundle.',
    source: 'Outlook Money 19-month student case + X/Reddit long-delay reports 2026',
    tags: ['long-delay', 'ombudsman', 'compensation', 'grievance'],
  },
  {
    id: 'court-rulings-blanket-freezes',
    title: 'Court Rulings on Blanket/No-FIR Freezes (Delhi/Madras/Allahabad HC 2024-2026)',
    content: 'Courts rule: Cannot freeze entire account or without specific amount/period/FIR. Violates livelihood rights. RBI: Only disputed amount. Yet practice continues. GRM for review. Letters/bundles should cite these for "partial unfreeze" or grievance. Useful for layer cases where no direct involvement. VERIFIED 2026-07-05 via primary sources: Bombay HC (Kartik Chatur) and Delhi HC (Malabar Gold) citations/holdings are accurate, but a Supreme Court suo motu order (01-Dec-2025) has ordered both appealed as conflicting with a Kerala HC ruling and separately allows police to freeze accounts "with or without FIR" in tension with these rulings — treat as contested, not settled: hedge as "recently held by the Bombay/Delhi High Courts," never "it is settled law that."',
    source: 'Delhi HC 2026, Madras/Allahabad rulings, SC notes on SOP gaps; SC suo motu order 01-Dec-2025 (sci.gov.in, verified 2026-07-05)',
    tags: ['court', 'no-fir', 'blanket-freeze', 'partial-unfreeze'],
  },
  {
    id: 'p2p-crypto-chain-freezes',
    title: 'P2P/Crypto/Gaming Chain Freezes (Layer 3+ Innocent)',
    content: 'Innocent P2P traders/gamers in "chain freeze": Small disputed amount leads to full freeze. "Scariest notification". Proofs: Invoices, chats, source of funds. SOP GRM applies. Prevention: Separate accounts, verified merchants. Analyzer should explain "not mule if no knowledge".',
    source: 'X/Instagram 2026 P2P/crypto cases, LinkedIn "Chain Freeze" analysis',
    tags: ['p2p', 'crypto', 'mule-chain', 'layer3'],
  },
];

// Simple retrieve (bootstrap for RAG). Later: pgvector similarity + BM25 hybrid + rerank.
export function retrieveGrKnowledge(query: string, max = 3): GrKnowledgeChunk[] {
  const q = query.toLowerCase();
  return GRM_KNOWLEDGE
    .filter(c => c.content.toLowerCase().includes(q) || c.tags.some(t => q.includes(t)) || c.title.toLowerCase().includes(q))
    .slice(0, max);
}
