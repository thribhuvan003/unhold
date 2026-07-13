import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/021_private_storage_buckets.sql'),
  'utf8',
);

describe('private evidence storage migration', () => {
  it('creates private buckets with explicit upload limits', () => {
    expect(migration).toContain("'evidence',\n  'evidence',\n  false,\n  26214400");
    expect(migration).toContain("VALUES ('bundles', 'bundles', false, 104857600");
    expect(migration).toContain("ARRAY['application/pdf']");
  });

  it('denies direct browser operations even if another permissive policy exists', () => {
    expect(migration.match(/AS RESTRICTIVE/g)).toHaveLength(4);
    expect(migration).toContain("bucket_id NOT IN ('evidence', 'bundles')");
    expect(migration).toContain('FOR SELECT TO anon, authenticated');
    expect(migration).toContain('FOR INSERT TO anon, authenticated');
    expect(migration).toContain('FOR UPDATE TO anon, authenticated');
    expect(migration).toContain('FOR DELETE TO anon, authenticated');
  });
});
