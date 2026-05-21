import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import type { UpdateSettingsRequest, BrandVoice } from '@/types';
import { BRAND_VOICES } from '@/types';
import type { Database } from '@/types/database';

const VALID_VOICES = BRAND_VOICES.map((v) => v.value) as BrandVoice[];
type UserUpdate = Database['public']['Tables']['users']['Update'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  const { full_name, brand_voice } = req.body as UpdateSettingsRequest;

  // Validate
  if (brand_voice && !VALID_VOICES.includes(brand_voice)) {
    return res.status(400).json({ error: 'Invalid brand voice.' });
  }

  const updates: UserUpdate = {};
  if (full_name !== undefined) updates.full_name = full_name.trim();
  if (brand_voice !== undefined) updates.brand_voice = brand_voice;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No updates provided.' });
  }

  const db = getAdminSupabase();

  const { data: user, error } = await db
    .from('users')
    .update(updates)
    .eq('id', payload.sub)
    .select('id, email, full_name, brand_voice, subscription_status')
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to update settings.' });
  }

  return res.status(200).json({ user });
}
