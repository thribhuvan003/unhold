const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_BYTES = 25 * 1024 * 1024;

export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? 'upload';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export function buildEvidenceStoragePath(
  caseId: string,
  evidenceId: string,
  filename: string,
): string {
  return `${caseId}/${evidenceId}/${sanitizeFilename(filename)}`;
}

export function assertEvidenceUploadConstraints(mimeType: string, fileSizeBytes: number): void {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error('Unsupported mime type; allowed: jpeg, png, pdf');
  }
  if (fileSizeBytes <= 0 || fileSizeBytes > MAX_BYTES) {
    throw new Error('File size must be between 1 byte and 25MB');
  }
}

export const EVIDENCE_BUCKET = 'evidence';
export const BUNDLE_BUCKET = 'bundles';