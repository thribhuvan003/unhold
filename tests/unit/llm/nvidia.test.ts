import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractJsonText, nvidiaChatCompletion } from '@/lib/llm/nvidia';

describe('nvidia llm client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NVIDIA_API_KEY;
  });

  it('extractJsonText strips markdown fences', () => {
    expect(extractJsonText('```json\n{"ok":true}\n```')).toBe('{"ok":true}');
  });

  it('returns null when API key missing', async () => {
    const result = await nvidiaChatCompletion({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result).toBeNull();
  });

  it('parses chat completion content', async () => {
    process.env.NVIDIA_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"freeze_reason":"cyber_upi_chain"}' } }],
        }),
      }),
    );

    const result = await nvidiaChatCompletion({
      messages: [{ role: 'user', content: 'classify' }],
    });
    expect(result).toContain('cyber_upi_chain');
  });
});