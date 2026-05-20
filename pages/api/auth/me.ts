import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  try {
    const db = getAdminSupabase();

    const { data: user, error } = await db
      .from('users')
      .select(`
        id, email, full_name, brand_voice,
        projects_this_month, subscription_status, month_reset_at,
        stripe_customer_id, stripe_subscription_id, subscription_ends_at,
        created_at, updated_at,
        plan:plans(id, name, display_name, price_monthly, project_limit, features)
      `)
      .eq('id', payload.sub)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error('/api/auth/me error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
