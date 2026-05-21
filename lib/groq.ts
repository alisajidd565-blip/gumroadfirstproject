import { buildPrompt, SYSTEM_PROMPT } from './prompts';
import type { Channel, BrandVoice } from '@/types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

function getApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY environment variable.');
  return apiKey;
}

function getModel(): string {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

// ─── Generation config per channel ───────────────────────────────────────────

const CHANNEL_CONFIG: Record<Channel, { max_tokens: number; temperature: number }> = {
  twitter:   { max_tokens: 150,  temperature: 0.75 },
  linkedin:  { max_tokens: 700,  temperature: 0.70 },
  instagram: { max_tokens: 500,  temperature: 0.80 },
  email:     { max_tokens: 1200, temperature: 0.65 },
};

// ─── Generate single channel output ──────────────────────────────────────────

export interface GenerationResult {
  channel: Channel;
  content: string;
  tokens_used: number;
  model_used: string;
  error?: string;
}

interface GroqChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
  error?: { message?: string };
}

export async function generateForChannel(
  channel: Channel,
  sourceText: string,
  brandVoice: BrandVoice
): Promise<GenerationResult> {
  const model = getModel();
  const config = CHANNEL_CONFIG[channel];
  const userPrompt = buildPrompt(channel, sourceText, brandVoice);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: config.max_tokens,
        temperature: config.temperature,
      }),
    });

    const data = (await response.json()) as GroqChatResponse;

    if (!response.ok) {
      const message = data.error?.message || `Groq API error (${response.status})`;
      throw new Error(message);
    }

    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    const tokens_used = data.usage?.total_tokens ?? 0;

    if (!content) {
      return {
        channel,
        content: '',
        tokens_used,
        model_used: model,
        error: 'Empty response from AI model.',
      };
    }

    return { channel, content, tokens_used, model_used: model };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Groq error';
    console.error(`[Groq] Error generating ${channel}:`, message);
    return {
      channel,
      content: '',
      tokens_used: 0,
      model_used: model,
      error: message,
    };
  }
}

// ─── Generate all selected channels in parallel ───────────────────────────────

export async function generateAllChannels(
  channels: Channel[],
  sourceText: string,
  brandVoice: BrandVoice
): Promise<GenerationResult[]> {
  if (!sourceText || sourceText.trim().length < 50) {
    throw new Error('Source text must be at least 50 characters.');
  }
  if (!channels || channels.length === 0) {
    throw new Error('At least one channel must be selected.');
  }

  return Promise.all(
    channels.map((ch) => generateForChannel(ch, sourceText, brandVoice))
  );
}
