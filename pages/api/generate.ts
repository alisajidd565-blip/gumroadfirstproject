import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { generateAllChannels } from '@/lib/groq';
import { incrementProjectUsage } from '@/lib/usage';
import type { Channel, BrandVoice } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  const { project_id } = req.body as { project_id: string };

  if (!project_id) {
    return res.status(400).json({ error: 'project_id is required.' });
  }

  const db = getAdminSupabase();

  const { data: project, error: projectError } = await db
    .from('projects')
    .select('id, user_id, source_text, channels, brand_voice, status')
    .eq('id', project_id)
    .eq('user_id', payload.sub)
    .single();

  if (projectError || !project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  if (project.status === 'processing') {
    return res.status(409).json({ error: 'This project is already being processed.' });
  }

  const countsTowardQuota = project.status === 'pending';

  await db
    .from('projects')
    .update({ status: 'processing' })
    .eq('id', project_id);

  try {
    const results = await generateAllChannels(
      project.channels as Channel[],
      project.source_text,
      project.brand_voice as BrandVoice
    );

    const allFailed = results.every((r) => r.error || !r.content);
    if (allFailed) {
      await db.from('projects').update({ status: 'failed' }).eq('id', project_id);
      return res.status(502).json({ error: 'AI generation failed for all channels. Please try again.' });
    }

    await db.from('outputs').delete().eq('project_id', project_id);

    const successfulOutputs = results.filter((r) => !r.error && r.content);

    const { data: insertedOutputs, error: insertError } = await db
      .from('outputs')
      .insert(
        successfulOutputs.map((r) => ({
          project_id,
          channel: r.channel,
          content: r.content,
          tokens_used: r.tokens_used,
          model_used: r.model_used,
        }))
      )
      .select();

    if (insertError) {
      console.error('Error inserting outputs:', insertError);
      await db.from('projects').update({ status: 'failed' }).eq('id', project_id);
      return res.status(500).json({ error: 'Failed to save generated content.' });
    }

    await db
      .from('projects')
      .update({ status: 'done' })
      .eq('id', project_id);

    if (countsTowardQuota) {
      await incrementProjectUsage(db, payload.sub);
    }

    const failedChannels = results.filter((r) => r.error).map((r) => r.channel);

    return res.status(200).json({
      outputs: insertedOutputs,
      ...(failedChannels.length > 0 && {
        warnings: `Generation failed for: ${failedChannels.join(', ')}`,
      }),
    });
  } catch (err) {
    console.error('Generation error:', err);
    await db.from('projects').update({ status: 'failed' }).eq('id', project_id);
    const message = err instanceof Error ? err.message : 'Generation failed. Please try again.';
    if (message.includes('GROQ_API_KEY')) {
      return res.status(503).json({
        error: 'AI is not configured. Add GROQ_API_KEY to your environment.',
        code: 'GROQ_NOT_CONFIGURED',
      });
    }
    return res.status(500).json({ error: message });
  }
}
