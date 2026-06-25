import 'server-only';

import { buildNoticeAnalyzerSystemPrompt, buildNoticeAnalyzerUserText } from '@/lib/agents/notice/prompt';
import { extractJsonText, isNvidiaLlmConfigured, nvidiaChatCompletion } from '@/lib/llm/nvidia';
import { NoticeAnalysisOutputSchema, type NoticeAnalysisOutput } from '@/lib/agents/schemas';
import { hasGrantedConsent } from '@/lib/consent/record';
import { retrieveRelevantContext } from '@/lib/rag/retrieve';
import { redactPiiText } from '@/lib/redaction/pii';
import { createAdminClient } from '@/lib/supabase/admin';
import { EVIDENCE_BUCKET } from '@/lib/evidence/storage-path';
import type { LlmContentPart } from '@/lib/llm/nvidia';

/** NVIDIA NIM vision input only accepts these formats — not application/pdf (D2: PDF deferred). */
const SUPPORTED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif']);

export type NoticeAnalyzerInput = {
  case_id: string;
  input_kind: 'image' | 'text';
  storage_path?: string | null;
  mime_type?: string | null;
  pasted_text?: string | null;
  frozen_amount_paise?: number | null;
};

/** Defense-in-depth: mask any PII the model echoed into free-text fields before it leaves the agent. */
function redactOutput(output: NoticeAnalysisOutput): NoticeAnalysisOutput {
  return {
    ...output,
    plain_english: redactPiiText(output.plain_english),
    what_this_means: redactPiiText(output.what_this_means),
    suggested_next: output.suggested_next.map(redactPiiText),
    extracted: {
      ...output.extracted,
      bank_name: output.extracted.bank_name ? redactPiiText(output.extracted.bank_name) : output.extracted.bank_name,
      reference: output.extracted.reference ? redactPiiText(output.extracted.reference) : output.extracted.reference,
      date_detected: output.extracted.date_detected
        ? redactPiiText(output.extracted.date_detected)
        : output.extracted.date_detected,
    },
  };
}

/**
 * Analyze a freeze notice (image via vision OCR, or pasted text). Returns null
 * — never a fabricated reason — when analysis can't be done safely: LLM not
 * configured, consent not granted (fail closed), download/parse/schema failure,
 * or unsupported input. The caller surfaces a manual-entry fallback on null.
 */
export async function analyzeNotice(input: NoticeAnalyzerInput): Promise<NoticeAnalysisOutput | null> {
  if (!isNvidiaLlmConfigured()) return null;

  // Consent is required before any notice content reaches a third-party AI. Fail closed.
  if (!(await hasGrantedConsent(input.case_id, 'ai_ocr_processing'))) return null;

  const userText = buildNoticeAnalyzerUserText(
    input.input_kind,
    input.pasted_text ?? null,
    input.frozen_amount_paise ?? null,
  );

  let content: string | LlmContentPart[];

  if (input.input_kind === 'image') {
    if (!input.storage_path || !input.mime_type || !SUPPORTED_IMAGE_MIMES.has(input.mime_type)) {
      return null;
    }
    const supabase = createAdminClient();
    const { data: fileData, error } = await supabase.storage.from(EVIDENCE_BUCKET).download(input.storage_path);
    if (error || !fileData) return null;

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const dataUri = `data:${input.mime_type};base64,${buffer.toString('base64')}`;
    content = [
      { type: 'text', text: userText },
      { type: 'image_url', image_url: { url: dataUri } },
    ];
  } else {
    const text = (input.pasted_text ?? '').trim();
    if (!text) return null;
    content = userText;
  }

  // Ground the analysis in the curated 2026 freeze/unfreeze corpus (RAG). Text
  // input is used as the retrieval query; failures are non-fatal (ungrounded).
  let grounding = '';
  const queryText = (input.pasted_text ?? '').trim();
  if (queryText) {
    try {
      const chunks = await retrieveRelevantContext(queryText, 5);
      grounding = chunks
        .map(
          (c) =>
            `- [${c.currency ?? '?'}/${c.confidence ?? '?'}] ${c.title}: ${c.content}` +
            (c.source ? ` (Source: ${c.source})` : ''),
        )
        .join('\n');
    } catch {
      // grounding is best-effort
    }
  }

  const raw = await nvidiaChatCompletion({
    max_tokens: 2048,
    temperature: 0.1,
    messages: [
      { role: 'system', content: buildNoticeAnalyzerSystemPrompt(grounding) },
      { role: 'user', content },
    ],
  });

  if (!raw) return null;

  try {
    const parsed = JSON.parse(extractJsonText(raw)) as unknown;
    return redactOutput(NoticeAnalysisOutputSchema.parse(parsed));
  } catch {
    return null;
  }
}
