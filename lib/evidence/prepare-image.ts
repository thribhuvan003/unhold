import 'server-only';

import sharp from 'sharp';

/**
 * Downscale an image before sending it to a vision model (OCR).
 *
 * Phone photos of freeze notices are routinely 3-8 MB at 3000-4000 px. At full
 * resolution they cost far more vision tokens + inference latency than reading a
 * one-page notice needs, and base64 inflates the payload another ~33%. Capping
 * the long edge at 1280 px and re-encoding JPEG q75 (auto-orienting via EXIF)
 * cuts payload ~85%+ while keeping bank notices / screenshots readable.
 *
 * Also normalises HEIC/HEIF/WebP to JPEG so vision providers that only accept
 * jpeg/png/gif still receive a usable image (uploads accept those phone formats).
 *
 * Falls back to the original bytes/mime if sharp can't process the input.
 */
export async function downscaleForVision(
  buffer: Buffer,
  mime: string,
  maxEdge = 1280,
): Promise<{ buffer: Buffer; mime: string }> {
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();
    return { buffer: out, mime: 'image/jpeg' };
  } catch {
    return { buffer, mime };
  }
}

/**
 * Re-encode an image before embedding it as a page in the sealed evidence bundle.
 *
 * Embedding raw phone photos makes multi-photo bundles enormous and unprintable.
 * Capping the long edge at 2200 px and re-encoding JPEG q85 (auto-orienting via
 * EXIF) keeps the bundle small while documents stay crisply readable in print -
 * which is why the cap/quality is higher than the vision path's 1280/q75.
 *
 * The manifest sha256 stays the hash of the ORIGINAL stored file (integrity is
 * over originals; the bundle page is a presentation copy).
 *
 * Falls back to the original bytes/mime if sharp can't process the input.
 */
export async function prepareForBundle(
  buffer: Buffer,
  mime: string,
): Promise<{ buffer: Buffer; mime: string }> {
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buffer: out, mime: 'image/jpeg' };
  } catch {
    return { buffer, mime };
  }
}
