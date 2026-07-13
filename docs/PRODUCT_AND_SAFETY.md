# Product and safety contract

This is the maintained public description of Unhold. Product copy, tests, and agent prompts should agree
with it. Research notes are inputs for review, not automatic user-facing truth.

## Product promise

Unhold helps a person organise a bank-account or UPI restriction case. It records facts, keeps evidence in
private storage, performs integrity and extraction checks, drafts material for the user to review, and tracks
the steps the user says they completed.

The product does not unfreeze accounts, represent users, determine guilt, contact an authority, or provide
individual legal advice. It does not guarantee an outcome or timeline.

## Non-negotiable controls

- The user sends every letter, email, form, and attachment themselves.
- Model output cannot add a legal citation outside the maintained allowlist.
- Uncertain or inconsistent extraction is labelled and can require human review.
- Case access is checked by the server before a service-role data operation.
- Browser Supabase credentials are used for authentication only, not direct application-table access.
- Uploaded evidence is stored in private buckets and addressed by signed, time-limited operations.
- Later escalation levels require the applicable earlier proof.
- Logs must not contain provider bodies, tokens, unredacted document content, or raw client IP addresses.
- Destructive data-rights operations require explicit ownership checks and an auditable request.

## Language rules

Prefer “organise”, “draft”, “request”, “may”, and “depends on the authority and facts”. Avoid “we will
unfreeze”, “guaranteed”, “the bank must”, “the cyber cell is the only authority”, and exact result timelines
unless a current primary source and the case context support the statement.

Every draft is labelled as a draft. Every legal/process page links to the disclaimer and shows that the user
must verify names, amounts, references, recipients, and deadlines before sending.

## Sources and change control

User-facing legal positions live in [`lib/legal/positions.ts`](../lib/legal/positions.ts) with their source,
review date, and status. Retrieval content in [`scripts/rag/corpus.mjs`](../scripts/rag/corpus.mjs) must keep
the same cautious framing. A research note is not promoted into either source without checking a primary
government, regulator, court, or official bank publication and adding a regression test for unsafe wording.

## Known limitations

- AI extraction and drafting can be wrong.
- A file hash proves byte integrity, not that the document or its contents are genuine.
- Processes differ by restriction type, institution, authority, location, facts, and changes in law.
- External delivery, authority response, and account-release state are outside the product's control.
