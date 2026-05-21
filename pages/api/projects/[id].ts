// @ts-nocheck - Supabase type inference issues with complex queries
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'Project ID is required.' });

  const db = getAdminSupabase();

  // ── GET /api/projects/[id] ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: project, error } = await db
      .from('projects')
      .select(`
        id, title, channels, brand_voice, status, source_text,
        created_at, updated_at,
        outputs(id, channel, content, edited, tokens_used, model_used, created_at, updated_at)
      `)
      .eq('id', id)
      .eq('user_id', payload.sub) // ensures ownership
      .single();

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    return res.status(200).json({ project });
  }

  // ── DELETE /api/projects/[id] ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { error } = await db
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', payload.sub);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete project.' });
    }

    return res.status(200).json({ message: 'Project deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
