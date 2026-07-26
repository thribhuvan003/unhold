/**
 * Browser-side resize before PUT so multi‑MB phone photos (often 4–12 MB)
 * become ~150–400 KB JPEGs. That speeds storage upload, server confirm
 * re-download/hash, and vision OCR payload size.
 *
 * PDFs and already-small images pass through unchanged. HEIC that the browser
 * cannot decode falls back to the original file (server sharp still handles it).
 */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;
/** Skip work when the file is already light enough for a fast path. */
const SKIP_UNDER_BYTES = 450_000;

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isLikelyImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name);
}

/**
 * @returns A File ready to hash + upload (possibly compressed JPEG).
 */
export async function prepareFileForUpload(file: File): Promise<File> {
  if (isPdf(file)) return file;
  if (!isLikelyImage(file)) return file;
  if (file.size > 0 && file.size <= SKIP_UNDER_BYTES) return file;

  // createImageBitmap handles JPEG/PNG/WebP in modern browsers; HEIC varies.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    });
    if (!blob || blob.size === 0) return file;

    // Prefer compressed only when it actually shrinks the upload.
    if (blob.size >= file.size * 0.95) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "evidence";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    try {
      bitmap.close();
    } catch {
      // ignore
    }
    return file;
  }
}
