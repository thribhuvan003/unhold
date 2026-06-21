import 'server-only';

export type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type NvidiaChatOptions = {
  model?: string;
  messages: LlmMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
};

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'minimaxai/minimax-m3';

function resolveApiKey(): string | null {
  return process.env.NVIDIA_API_KEY ?? process.env.NVIDIA_NIM_API_KEY ?? null;
}

function resolveBaseUrl(): string {
  return process.env.NVIDIA_API_BASE_URL ?? DEFAULT_BASE_URL;
}

function resolveModel(override?: string): string {
  return override ?? process.env.NVIDIA_MODEL ?? process.env.LLM_MODEL ?? DEFAULT_MODEL;
}

/** Strip markdown JSON fences if the model wraps output. */
export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

/**
 * OpenAI-compatible chat completions via NVIDIA Integrate API.
 * @see https://integrate.api.nvidia.com/v1/chat/completions
 */
export async function nvidiaChatCompletion(
  options: NvidiaChatOptions,
): Promise<string | null> {
  const apiKey = resolveApiKey();
  if (!apiKey) return null;

  const response = await fetch(resolveBaseUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolveModel(options.model),
      messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options.max_tokens ?? 8192,
      temperature: options.temperature ?? 1,
      top_p: options.top_p ?? 0.95,
      stream: false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[nvidia-llm] request failed', response.status, detail.slice(0, 500));
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : null;
}

export function isNvidiaLlmConfigured(): boolean {
  return Boolean(resolveApiKey());
}