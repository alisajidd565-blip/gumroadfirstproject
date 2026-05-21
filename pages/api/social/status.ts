import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { getProviderConfig, getProviderLabel } from '@/lib/social';
import type { SocialProviderStatus } from '@/types';

function buildProviders(
  connections: Array<{ provider: string; display_name: string | null; username: string | null; expires_at: string | null }> = [],
  disabledReason?: string
): SocialProviderStatus[] {
  const connected = new Map(connections.map((connection) => [connection.provider, connection]));

  return [
    {
      provider: 'linkedin',
      channel: 'linkedin',
      label: getProviderLabel('linkedin'),
      configured: Boolean(getProviderConfig('linkedin')) && !disabledReason,
      connected: connected.has('linkedin'),
      display_name: connected.get('linkedin')?.display_name,
      username: connected.get('linkedin')?.username,
      expires_at: connected.get('linkedin')?.expires_at,
      disabled_reason: disabledReason,
    },
    {
      provider: 'twitter',
      channel: 'twitter',
      label: getProviderLabel('twitter'),
      configured: Boolean(getProviderConfig('twitter')) && !disabledReason,
      connected: connected.has('twitter'),
      display_name: connected.get('twitter')?.display_name,
      username: connected.get('twitter')?.username,
      expires_at: connected.get('twitter')?.expires_at,
      disabled_reason: disabledReason,
    },
    {
      provider: 'instagram',
      channel: 'instagram',
      label: getProviderLabel('instagram'),
      configured: false,
      connected: false,
      disabled_reason: 'Instagram publishing requires a media asset flow before captions can be posted.',
    },
  ];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ providers: SocialProviderStatus[] } | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  const db = getAdminSupabase();
  const { data: connections, error } = await db
    .from('social_connections')
    .select('provider, display_name, username, expires_at')
    .eq('user_id', payload.sub);

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || error.message.includes('schema cache')) {
      return res.status(200).json({
        providers: buildProviders([], 'Run the updated schema.sql to enable connected apps.'),
      });
    }
    return res.status(500).json({ error: 'Failed to load connected apps.' });
  }

  return res.status(200).json({ providers: buildProviders(connections ?? []) });
}
