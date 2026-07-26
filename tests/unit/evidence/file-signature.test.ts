import { describe, expect, it } from 'vitest';
import { detectEvidenceMime, evidenceMimeMatches } from '@/lib/evidence/file-signature';

describe('evidence file signatures', () => {
  it.each([
    [Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
    [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
    [Buffer.from('%PDF-1.7'), 'application/pdf'],
    [Buffer.from('RIFF\x00\x00\x00\x00WEBP'), 'image/webp'],
    [Buffer.from('\x00\x00\x00\x18ftypheic'), 'image/heic'],
    [Buffer.from('\x00\x00\x00\x18ftypmif1'), 'image/heif'],
  ])('detects supported magic bytes', (bytes, expected) => {
    expect(detectEvidenceMime(bytes)).toBe(expected);
  });

  it('rejects arbitrary bytes and declared-type mismatches', () => {
    expect(detectEvidenceMime(Buffer.from('<html>not an image</html>'))).toBeNull();
    expect(evidenceMimeMatches('image/jpeg', 'application/pdf')).toBe(false);
    expect(evidenceMimeMatches('image/heif', 'image/heic')).toBe(true);
  });
});
