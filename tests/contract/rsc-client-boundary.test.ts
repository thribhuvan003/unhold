import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for a production crash on /[locale]/cases/[id]:
 *
 *   "Attempted to call isCourtOrTaxTrack() from the server but
 *    isCourtOrTaxTrack is on the client."
 *
 * The case page is a server component. A pure helper it calls during render
 * must NOT be exported from a `'use client'` module, or every case render
 * throws into the error boundary ("We hit a snag loading your case"). Keep the
 * helper in the server-safe lib module and import it from there.
 */
const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('RSC client/server boundary for case-page helpers', () => {
  const card = read('components/case/CourtTaxActionsCard.tsx');
  const unfreezePath = read('lib/case/unfreeze-path.ts');
  const page = read('app/[locale]/cases/[id]/page.tsx');

  // A `'use client'` directive is only meaningful as the file's first
  // statement — match it at line start so a mention inside a comment/string
  // (e.g. this file, or a doc comment) never counts as one.
  const hasClientDirective = (src: string) => /^\s*['"]use client['"]/m.test(src);

  it('keeps the shared type-guard in a server-safe module, not the client card', () => {
    expect(hasClientDirective(card)).toBe(true);
    // The client component must not export the server-called helper.
    expect(card).not.toMatch(/export\s+function\s+isCourtOrTaxTrack/);

    // The server-safe module owns it and carries no client directive.
    expect(hasClientDirective(unfreezePath)).toBe(false);
    expect(unfreezePath).toMatch(/export\s+function\s+isCourtOrTaxTrack/);
  });

  it('has the server page import the helper from the server-safe module', () => {
    expect(page).toMatch(
      /import\s*\{[^}]*isCourtOrTaxTrack[^}]*\}\s*from\s*['"]@\/lib\/case\/unfreeze-path['"]/,
    );
    // ...and never from the client component.
    expect(page).not.toMatch(
      /import\s*\{[^}]*isCourtOrTaxTrack[^}]*\}\s*from\s*['"]@\/components\/case\/CourtTaxActionsCard['"]/,
    );
  });
});
