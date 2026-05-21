import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { providerFromChannel } from '@/lib/social';
import { publishToProvider, refreshConnectionToken } from '@/lib/socialProviders';

type PublishResponse =
  | { publication: { provider: string; provider_post_id: string; provider_url: string | null } }
  | { error: string; code?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<PublishResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  const { output_id } = req.body as { output_id?: string };
  if (!output_id) {
    return res.status(400).json({ error: 'Output ID is required.' });
  }

  const db = getAdminSupabase();
  const { data: output, error: outputError } = await db
    .from('outputs')
    .select('id, channel, content, projects(user_id)')
    .eq('id', output_id)
    .single();

  if (outputError || !output) {
    return res.status(404).json({ error: 'Output not found.' });
  }

  const ownerUserId = (output.projects as { user_id?: string } | null)?.user_id;
  if (ownerUserId !== payload.sub) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const provider = providerFromChannel(output.channel);
  if (!provider) {
    return res.status(400).json({
      error: 'Direct publishing is available for LinkedIn and X/Twitter outputs.',
      code: 'PROVIDER_NOT_SUPPORTED',
    });
  }

  const { data: connection, error: connectionError } = await db
    .from('social_connections')
    .select()
    .eq('user_id', payload.sub)
    .eq('provider', provider)
    .single();

  if (connectionError || !connection) {
    return res.status(409).json({
      error: `Connect ${provider === 'twitter' ? 'X / Twitter' : 'LinkedIn'} before publishing.`,
      code: 'SOCIAL_ACCOUNT_NOT_CONNECTED',
    });
  }

  try {
    const refreshedConnection = await refreshConnectionToken(db, connection);
    const result = await publishToProvider(provider, refreshedConnection, output.content);

    await db.from('social_publications').insert({
      user_id: payload.sub,
      output_id,
      provider,
      provider_post_id: result.providerPostId,
      provider_url: result.providerUrl,
      status: 'published',
      published_at: new Date().toISOString(),
    });

    return res.status(201).json({
      publication: {
        provider,
        provider_post_id: result.providerPostId,
        provider_url: result.providerUrl,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to publish output.';

    await db.from('social_publications').insert({
      user_id: payload.sub,
      output_id,
      provider,
      status: 'failed',
      error: message,
    });

    return res.status(500).json({ error: message });
  }
}

