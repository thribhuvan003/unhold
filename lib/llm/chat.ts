import 'server-only';

import {
  extractJsonText,
  getNvidiaApiKeys,
  type LlmContentPart,
  type LlmMessage,
} from '@/lib/llm/nvidia';

export { extractJsonText };
export type { LlmContentPart, LlmMessage };

/**
 * Provider-agnostic chat completion (OpenAI-compatible).
 *
 * Routing:
 *  - text  → Groq (llama-3.3-70b-versatile, ~0.3s, reliable JSON) PRIMARY,
 *            falling back to NVIDIA (llama-3.3-70b) if Groq is unconfigured/down.
 *  - vision (image parts) → NVIDIA minimax-m3 (multimodal; Groq 70b is text-only).
 *
 * Each provider rotates across its own comma/space-separated key pool with 429
 * failover. Returns null (never throws) so callers fall back to templates.
 */
export type ChatOptions = {
  messages: LlmMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  /** OpenAI-compatible JSON mode — forces syntactically valid JSON output. */
  response_format?: { type: 'json_object' };
  /** Set true when messages contain image parts (forces a multimodal provider). */
  vision?: boolean;
  /** Per-call model override (otherwise the provider default is used). */
  model?: string;
};

type Provider = {
  name: string;
  baseUrl: string;
  model: string;
  keys: string[];
};

function splitKeys(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[\s,]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function groqKeys(): string[] {
  return splitKeys(process.env.GROQ_API_KEYS ?? process.env.GROQ_API_KEY);
}

function groqProvider(): Provider | null {
  const keys = groqKeys();
  if (keys.length === 0) return null;
  return {
    name: 'groq',
    baseUrl: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    keys,
  };
}

/** Groq multimodal model (llama-4-scout) for image OCR. */
function groqVisionProvider(): Provider | null {
  const keys = groqKeys();
  if (keys.length === 0) return null;
  return {
    name: 'groq-vision',
    baseUrl: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.GROQ_VISION_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct',
    keys,
  };
}

/** NVIDIA as a fast, strong TEXT fallback (llama-3.3-70b). */
function nvidiaTextProvider(): Provider | null {
  const keys = getNvidiaApiKeys();
  if (keys.length === 0) return null;
  return {
    name: 'nvidia-text',
    baseUrl: process.env.NVIDIA_API_BASE_URL ?? 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: process.env.NVIDIA_TEXT_MODEL ?? 'meta/llama-3.3-70b-instruct',
    keys,
  };
}

/** NVIDIA multimodal model for image OCR. */
function nvidiaVisionProvider(): Provider | null {
  const keys = getNvidiaApiKeys();
  if (keys.length === 0) return null;
  return {
    name: 'nvidia-vision',
    baseUrl: process.env.NVIDIA_API_BASE_URL ?? 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: process.env.NVIDIA_MODEL ?? 'minimaxai/minimax-m3',
    keys,
  };
}

export function isLlmConfigured(): boolean {
  return groqProvider() !== null || nvidiaTextProvider() !== null;
}

async function tryProvider(provider: Provider, options: ChatOptions): Promise<string | null> {
  const body = JSON.stringify({
    model: options.model ?? provider.model,
    messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: options.max_tokens ?? 2048,
    temperature: options.temperature ?? 0.2,
    top_p: options.top_p ?? 0.95,
    stream: false,
    ...(options.response_format ? { response_format: options.response_format } : {}),
  });

  const maxAttempts = Math.min(provider.keys.length, 5);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = provider.keys[attempt % provider.keys.length];
    try {
      const response = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string | null } }>;
        };
        const content = payload.choices?.[0]?.message?.content;
        return typeof content === 'string' ? content : null;
      }

      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 30 + Math.random() * 120));
        continue; // rotate to the next key
      }
      // auth/model/other error — don't burn the rest of this provider's keys
      console.error(`[llm:${provider.name}] request failed`, response.status);
      return null;
    } catch {
      // transient network error — rotate once
    }
  }
  return null;
}

export async function chatCompletion(options: ChatOptions): Promise<string | null> {
  // Image input → multimodal: Groq (llama-4-scout) primary, NVIDIA minimax fallback.
  // Text → Groq (llama-3.3-70b) primary, NVIDIA llama-3.3-70b fallback.
  const chain = (
    options.vision
      ? [groqVisionProvider(), nvidiaVisionProvider()]
      : [groqProvider(), nvidiaTextProvider()]
  ).filter((p): p is Provider => p !== null);

  for (const provider of chain) {
    const out = await tryProvider(provider, options);
    if (out !== null) return out;
  }
  return null;
}
