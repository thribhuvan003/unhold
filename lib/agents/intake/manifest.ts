import type { IntakeManifestEntry } from '@/lib/agents/intake/types';

/**
 * Build citation manifest from redacted case intake fields.
 */
export function buildIntakeManifest(
  intakeJson: Record<string, unknown>,
  evidenceRows: Array<{ id: string; evidence_type: string }>,
): IntakeManifestEntry[] {
  const entries: IntakeManifestEntry[] = [];

  for (const [field, value] of Object.entries(intakeJson)) {
    if (value === null || value === undefined || value === '') continue;
    entries.push({
      source_id: 'intake_json',
      field,
      value: String(value).slice(0, 500),
    });
  }

  for (const row of evidenceRows) {
    entries.push({
      source_id: `evidence:${row.id}`,
      field: 'evidence_type',
      value: row.evidence_type,
    });
  }

  if (entries.length === 0) {
    entries.push({
      source_id: 'intake_json',
      field: 'narration',
      value: 'no intake fields provided',
    });
  }

  return entries;
}