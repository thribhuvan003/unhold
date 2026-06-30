import 'server-only';

import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Extract text from a (digital) PDF — a bank freeze notice, lien letter, or
 * statement — using unpdf's serverless pdf.js build. No native dependencies, so
 * it's safe on Vercel/serverless.
 *
 * Returns the merged text, or '' when the PDF has no extractable text (a scanned
 * / image-only PDF) or parsing fails. Callers treat '' as "couldn't read this
 * PDF" and fall back to the photo-upload path, rather than fabricating output.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return (typeof text === 'string' ? text : '').trim();
  } catch {
    return '';
  }
}
