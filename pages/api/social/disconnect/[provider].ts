import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { isSupportedSocialProvider } from '@/lib/social';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  const { provider } = req.query as { provider: string };
  if (!isSupportedSocialProvider(provider)) {
    return res.status(400).json({ error: 'Unsupported provider.' });
  }

  const db = getAdminSupabase();
  const { error } = await db
    .from('social_connections')
    .delete()
    .eq('user_id', payload.sub)
    .eq('provider', provider);

  if (error) {
    return res.status(500).json({ error: 'Failed to disconnect account.' });
  }

  return res.status(200).json({ message: 'Disconnected.' });
}

