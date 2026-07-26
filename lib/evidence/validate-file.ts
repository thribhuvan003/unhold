/**
 * Client-side pre-upload check with plain-language errors, so a wrong pick
 * fails in one second with a fix — instead of a failed upload later.
 * Mirrors the server's accepted types (accepted-mime.ts) and 25MB limit.
 */

import { ACCEPTED_EVIDENCE_MIME, resolveEvidenceMime } from '@/lib/evidence/accepted-mime';

const MAX_BYTES = 25 * 1024 * 1024;

export function validateUploadFile(file: File): string | null {
  // Check size/empty first so an empty file never reads as a "wrong type".
  if (file.size === 0) {
    return 'That file looks empty — please pick it again.';
  }
  if (file.size > MAX_BYTES) {
    return 'This file is too big — keep it under 25MB. A fresh phone photo usually works.';
  }
  // Resolve the type from file.type, falling back to the extension (some Android
  // file managers report an empty type for valid JPEGs).
  const mime = resolveEvidenceMime(file);
  if (!ACCEPTED_EVIDENCE_MIME.includes(mime as (typeof ACCEPTED_EVIDENCE_MIME)[number])) {
    return 'Please upload a photo (JPEG, PNG, HEIC or WebP) or a PDF. A fresh photo from your phone camera works best.';
  }
  return null;
}
