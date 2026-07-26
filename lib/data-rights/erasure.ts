import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type ErasureStatus = 'deleted' | 'scheduled';

// Supabase signed upload URLs remain valid for two hours. The extra five
// minutes covers an upload already in flight when the capability expires.
export const ERASURE_CAPABILITY_GRACE_MS = (2 * 60 + 5) * 60 * 1000;

type StoredObject = { bucket: string; path: string };

async function listStoredObjects(bucket: string, prefix: string): Promise<StoredObject[] | null> {
  const admin = createAdminClient();
  const found: StoredObject[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) return null;

    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id || entry.metadata) {
        found.push({ bucket, path });
      } else {
        const nested = await listStoredObjects(bucket, path);
        if (!nested) return null;
        found.push(...nested);
      }
    }

    if ((data?.length ?? 0) < 100) break;
    offset += 100;
  }

  return found;
}

async function removeStoredObjects(objects: StoredObject[]): Promise<boolean> {
  const admin = createAdminClient();
  const byBucket = new Map<string, string[]>();

  for (const object of objects) {
    if (!object.bucket || !object.path) continue;
    const paths = byBucket.get(object.bucket) ?? [];
    paths.push(object.path);
    byBucket.set(object.bucket, paths);
  }

  for (const [bucket, paths] of byBucket) {
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (error) return false;
    }
  }

  return true;
}

/**
 * Delete storage first, then purge the database in one controlled transaction.
 * Every step is retry-safe; a failed deletion leaves the case blocked.
 */
export async function processCaseErasure(caseId: string): Promise<ErasureStatus> {
  const admin = createAdminClient();
  const { data: caseRow, error: caseError } = await admin
    .from('cases')
    .select('id, guest_session_id, erasure_requested_at, erasure_scheduled_at')
    .eq('id', caseId)
    .maybeSingle();

  if (caseError || !caseRow?.erasure_requested_at) return 'scheduled';
  if (
    !caseRow.erasure_scheduled_at ||
    new Date(caseRow.erasure_scheduled_at).getTime() > Date.now()
  ) {
    return 'scheduled';
  }

  await admin
    .from('agent_jobs')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('case_id', caseId)
    .in('status', ['pending', 'failed']);

  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await admin
    .from('agent_jobs')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('case_id', caseId)
    .eq('status', 'running')
    .lt('started_at', staleCutoff);

  const { data: runningJobs, error: runningError } = await admin
    .from('agent_jobs')
    .select('id')
    .eq('case_id', caseId)
    .eq('status', 'running')
    .limit(1);

  if (runningError || (runningJobs?.length ?? 0) > 0) return 'scheduled';

  const [{ data: evidence, error: evidenceError }, { data: seals, error: sealError }] =
    await Promise.all([
      admin.from('evidence').select('storage_bucket, storage_path').eq('case_id', caseId),
      admin
        .from('audit_seals')
        .select('sealed_content_bucket, sealed_content_path')
        .eq('case_id', caseId),
    ]);

  if (evidenceError || sealError) return 'scheduled';

  const objects: StoredObject[] = [
    ...(evidence ?? []).map((row) => ({
      bucket: row.storage_bucket,
      path: row.storage_path,
    })),
    ...(seals ?? [])
      .filter((row) => Boolean(row.sealed_content_path))
      .map((row) => ({
        bucket: row.sealed_content_bucket,
        path: row.sealed_content_path!,
      })),
  ];

  // A final case-prefix sweep catches an upload or bundle that completed after
  // its database write failed. No case-prefixed object may survive erasure.
  for (const bucket of ['evidence', 'bundles']) {
    const listed = await listStoredObjects(bucket, caseId);
    if (!listed) return 'scheduled';
    objects.push(...listed);
  }

  const uniqueObjects = Array.from(
    new Map(objects.map((object) => [`${object.bucket}:${object.path}`, object])).values(),
  );

  if (!(await removeStoredObjects(uniqueObjects))) return 'scheduled';

  if (caseRow.guest_session_id) {
    const { count } = await admin
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('guest_session_id', caseRow.guest_session_id)
      .neq('id', caseId);
    if ((count ?? 0) === 0) {
      await admin
        .from('guest_sessions')
        .update({
          revoked_at: new Date().toISOString(),
          revocation_reason: 'last_case_erased',
        })
        .eq('id', caseRow.guest_session_id);
    }
  }

  const { data: purged, error: purgeError } = await admin.rpc('purge_case_for_erasure', {
    p_case_id: caseId,
  });

  return !purgeError && purged ? 'deleted' : 'scheduled';
}

export async function runErasureBatch(limit = 20): Promise<{ processed: number; deleted: number }> {
  const admin = createAdminClient();
  const { data: cases } = await admin
    .from('cases')
    .select('id')
    .not('erasure_requested_at', 'is', null)
    .is('erasure_completed_at', null)
    .order('erasure_requested_at', { ascending: true })
    .limit(limit);

  let deleted = 0;
  for (const row of cases ?? []) {
    if ((await processCaseErasure(row.id)) === 'deleted') deleted += 1;
  }

  return { processed: cases?.length ?? 0, deleted };
}
