import 'server-only';

import sharp from 'sharp';

/**
 * Downscale an image before sending it to a vision model (OCR).
 *
 * Phone photos of freeze notices are routinely 3–8 MB at 3000–4000 px. At full
 * resolution they cost far more vision tokens + inference latency than reading a
 * one-page notice needs, and base64 inflates the payload another ~33%. Capping
 * the long edge at 1600 px and re-encoding JPEG q80 (auto-orienting via EXIF)
 * cuts payload ~80%+ and roughly halves latency, with negligible OCR loss.
 *
 * Falls back to the original bytes/mime if sharp can't process the input.
 */
export async function downscaleForVision(
  buffer: Buffer,
  mime: string,
  maxEdge = 1600,
): Promise<{ buffer: Buffer; mime: string }> {
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { buffer: out, mime: 'image/jpeg' };
  } catch {
    return { buffer, mime };
  }
}
