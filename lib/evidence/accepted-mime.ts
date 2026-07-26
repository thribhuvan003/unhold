/**
 * The one source of truth for which evidence file types Unhold accepts, so the
 * client pre-check, the storage-path guard, and the API zod schema never drift
 * apart. Phone photos ARE the core evidence for our users, so iPhone HEIC/HEIF
 * and Android WebP are accepted alongside JPEG/PNG/PDF — rejecting them turned
 * away genuine freeze-notice screenshots.
 */
export const ACCEPTED_EVIDENCE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const;

export type AcceptedEvidenceMime = (typeof ACCEPTED_EVIDENCE_MIME)[number];

const EXT_TO_MIME: Record<string, AcceptedEvidenceMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
};

/**
 * Some Android file managers report an empty `file.type` for a perfectly valid
 * JPEG. Fall back to the filename extension before rejecting the file.
 */
export function mimeFromExtension(filename: string): AcceptedEvidenceMime | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  return EXT_TO_MIME[ext] ?? null;
}

/** Resolve a usable MIME for a picked file: its reported type, else by extension. */
export function resolveEvidenceMime(file: { type: string; name: string }): string {
  return file.type || mimeFromExtension(file.name) || '';
}
