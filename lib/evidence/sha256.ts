import { createHash } from 'crypto';

const SHA256_REGEX = /^[a-f0-9]{64}$/;

export function computeSha256Hex(buffer: ArrayBuffer | Buffer | Uint8Array): string {
  const data =
    buffer instanceof Buffer
      ? buffer
      : Buffer.from(buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer);
  return createHash('sha256').update(data).digest('hex');
}

export async function computeSha256HexFromBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return computeSha256Hex(buffer);
}

export function isValidSha256(value: string): boolean {
  return SHA256_REGEX.test(value);
}

export async function computeSha256HexInBrowser(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}