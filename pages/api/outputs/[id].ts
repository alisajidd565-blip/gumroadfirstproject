// @ts-nocheck - Supabase type inference issues with complex queries
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  const { id } = req.query as { id: string };
  const { content } = req.body as { content: string };

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content cannot be empty.' });
  }

  const db = getAdminSupabase();

  // Verify output belongs to the authenticated user via join
  const { data: output, error: fetchError } = await db
    .from('outputs')
    .select('id, project_id, projects(user_id)')
    .eq('id', id)
    .single();

  if (fetchError || !output) {
    return res.status(404).json({ error: 'Output not found.' });
  }

  const ownerUserId = (output.projects as any)?.user_id;
  if (ownerUserId !== payload.sub) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const { data: updated, error: updateError } = await db
    .from('outputs')
    .update({ content: content.trim(), edited: true })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update output.' });
  }

  return res.status(200).json({ output: updated });
}
