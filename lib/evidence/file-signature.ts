import type { AcceptedEvidenceMime } from '@/lib/evidence/accepted-mime';

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export function detectEvidenceMime(bytes: Uint8Array): AcceptedEvidenceMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === 'PNG' &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (bytes.length >= 5 && ascii(bytes, 0, 5) === '%PDF-') {
    return 'application/pdf';
  }

  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 4) === 'WEBP'
  ) {
    return 'image/webp';
  }

  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic';
    if (['heif', 'mif1', 'msf1'].includes(brand)) return 'image/heif';
  }

  return null;
}

export function evidenceMimeMatches(
  declared: string | null,
  detected: AcceptedEvidenceMime | null,
): boolean {
  if (!declared || !detected) return false;
  if (declared === detected) return true;
  return (
    (declared === 'image/heic' || declared === 'image/heif') &&
    (detected === 'image/heic' || detected === 'image/heif')
  );
}
