// lib/rag/grm-knowledge.ts
// Conservative public-source knowledge for citizen-facing explanations.
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
    content: 'MHA has confirmed that an SOP exists for handling grievances connected with NCRP/CFCFRMS holds. The public cybercrime.gov.in portal is for citizen cybercrime reporting and tracking; staff-only CFCFRMS/GRM login pages must never be presented as citizen filing routes. For an account-holder restriction, first ask the bank for the exact amount, restriction type, ordering authority and reference in writing.',
    source: 'MHA parliamentary responses and cybercrime.gov.in citizen FAQ',
    tags: ['grm', 'unfreeze', 'official'],
  },
  {
    id: 'grm-what-to-submit',
    title: 'What GRM Typically Wants',
    content: 'Useful documents depend on the authority and selected route. Keep the bank notice, relevant transaction proof, complaint/FIR/NCRP reference if available, written bank replies, and proof of submission. Do not collect PAN, Aadhaar, full statements or unrelated chats unless the selected official step actually requires them.',
    source: 'cybercrime.gov.in citizen FAQ; conservative preparation guidance',
    tags: ['grm', 'documents', 'evidence'],
  },
  {
    id: 'mrm-overview',
    title: 'MRM for Victims',
    content: 'The public Money Restoration Module is for eligible cyber-fraud victims seeking restoration of reported lost money. It is not a general route for an account holder to remove a restriction on their own account. Check the current public eligibility information before directing a user there.',
    source: 'I4C public MRM FAQ',
    tags: ['mrm', 'victim', 'official'],
  },
  {
    id: 'sbi-innocent-tips',
    title: 'SBI / Common Bank Response Pattern',
    content: 'Use only the bank’s currently published grievance contacts. Ask for the written restriction details and a complaint acknowledgement. Do not infer a bank-specific outcome, required document set or response time from anecdotes.',
    source: 'Bank-published grievance channels',
    tags: ['sbi', 'innocent-receiver'],
  },
  {
    id: 'small-amount-trail',
    title: 'Tiny Unknown UPI Test Transfers (₹1–₹10)',
    content: 'If the user reports a small or unknown UPI credit, record it as the user’s statement, not as proof of fraud or innocence. Ask the bank to confirm the exact amount held, ordering authority and reference. Never claim that a small credit automatically caused the restriction or that a universal partial-release rule applies.',
    source: 'User-provided facts; verification required from bank/authority',
    tags: ['grm', 'small-amount', 'innocent-receiver', 'upi-chain'],
  },
  {
    id: 'sop-2026-timelines-90day',
    title: 'SOP existence confirmed; detailed timelines require verification',
    content: 'MHA parliamentary responses confirm an SOP for handling NCRP/CFCFRMS grievances, but the detailed SOP text and universal 7/15/90-day rules have not been established from a public primary source in this product. Do not promise these timelines or automatic release. Use the date and acknowledgement from each actual filing and follow the current published route.',
    source: 'MHA parliamentary responses; detailed public SOP not verified',
    tags: ['grm', 'sop-2026', '90-day', 'appeal', 'official'],
  },
  {
    id: 'escalation-paths',
    title: 'Escalation for Frozen Accounts (Bank Grievance + RBI Ombudsman)',
    content: 'For bank-service failures, use the bank’s published grievance channel and keep proof. RBI CMS may review eligible complaints after the bank’s complaint process; it cannot replace a police or court decision. Never advise unofficial payments or imply that an Ombudsman complaint guarantees release.',
    source: 'RBI Integrated Ombudsman Scheme and bank-published grievance channels',
    tags: ['grievance', 'rbi-ombudsman', 'escalation', 'innocent-receiver'],
  },
  {
    id: 'long-delay-ombudsman',
    title: 'Long-term Freezes & RBI Ombudsman Resolutions (e.g. 19-month cases)',
    content: 'Long delays can occur, but individual media reports do not establish a normal timeline or likely outcome. Track the user’s actual submissions and replies. Suggest RBI CMS only for an eligible bank-service complaint and independent legal help for disputed authority action.',
    source: 'Individual reports are context only; use current official eligibility rules',
    tags: ['long-delay', 'ombudsman', 'compensation', 'grievance'],
  },
  {
    id: 'court-rulings-blanket-freezes',
    title: 'Court Rulings on Blanket/No-FIR Freezes (Delhi/Madras/Allahabad HC 2024-2026)',
    content: 'Judicial decisions on account restrictions are fact-specific and may conflict or be under appeal. Unhold must not convert one judgment into a universal rule. Identify the order and jurisdiction, label legal propositions as contested where appropriate, and direct the user to independent legal advice for applying a ruling to their facts.',
    source: 'Delhi HC 2026, Madras/Allahabad rulings, SC notes on SOP gaps; SC suo motu order 01-Dec-2025 (sci.gov.in, verified 2026-07-05)',
    tags: ['court', 'no-fir', 'blanket-freeze', 'partial-unfreeze'],
  },
  {
    id: 'p2p-crypto-chain-freezes',
    title: 'P2P/Crypto/Gaming Chain Freezes (Layer 3+ Innocent)',
    content: 'P2P, crypto or gaming transactions may require different evidence and legal advice. Do not label the user innocent, a mule, or involved based only on a transaction pattern. Record the source of funds and relevant transaction records, and ask the named authority what it requires.',
    source: 'Risk context only; case-specific verification required',
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
