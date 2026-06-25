#!/usr/bin/env node
// Record one or more durable facts into Supermemory under the LienLiberator tag.
//
//   node --env-file=.env.local scripts/memory/record.mjs "fact one" "fact two"
//
// Reads SUPERMEMORY_API_KEY from the environment (e.g. via --env-file=.env.local).
// Mirrors the runtime wrapper in lib/memory — same cloud backend, same tag.
// NEVER pass secrets or full Aadhaar/PAN/account numbers as facts.
import Supermemory from 'supermemory';

const TAG = 'lienliberator';

const facts = process.argv.slice(2).filter((s) => s.trim());
if (facts.length === 0) {
  console.error('No facts given. Pass each fact as a quoted argument.');
  process.exit(1);
}
if (!process.env.SUPERMEMORY_API_KEY?.trim()) {
  console.error('SUPERMEMORY_API_KEY is not set (try --env-file=.env.local).');
  process.exit(1);
}

const client = new Supermemory();
for (const content of facts) {
  const doc = await client.documents.add({ content, containerTag: TAG });
  console.log(`stored ${doc.id}  ${content.slice(0, 64)}...`);
}
