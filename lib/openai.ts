import OpenAI from 'openai';
import { buildPrompt, SYSTEM_PROMPT } from './prompts';
import type { Channel, BrandVoice } from '@/types';

// ─── Singleton client ─────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable.');
    _client = new OpenAI({ apiKey });
  }
  return _client;
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

export async function generateForChannel(
  channel: Channel,
  sourceText: string,
  brandVoice: BrandVoice
): Promise<GenerationResult> {
  const client = getClient();
  const model = 'gpt-4-turbo-preview';
  const config = CHANNEL_CONFIG[channel];
  const userPrompt = buildPrompt(channel, sourceText, brandVoice);

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      // Prevent model from truncating early
      presence_penalty: 0.1,
      frequency_penalty: 0.2,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? '';
    const tokens_used = completion.usage?.total_tokens ?? 0;

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
    const message = err instanceof Error ? err.message : 'Unknown OpenAI error';
    console.error(`[OpenAI] Error generating ${channel}:`, message);
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
  // Validate input
  if (!sourceText || sourceText.trim().length < 50) {
    throw new Error('Source text must be at least 50 characters.');
  }
  if (!channels || channels.length === 0) {
    throw new Error('At least one channel must be selected.');
  }

  // Run all generations in parallel — faster than sequential
  const results = await Promise.all(
    channels.map((ch) => generateForChannel(ch, sourceText, brandVoice))
  );

  return results;
}
