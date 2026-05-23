import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import {
  isChannelAllowedForPlan,
  channelRestrictionMessage,
} from '@/lib/plans';
import { getUsageState } from '@/lib/usage';
import type { CreateProjectRequest, Channel, PlanName } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const db = getAdminSupabase();

  if (req.method === 'GET') {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const offset = (page - 1) * limit;

    const { data: projects, error, count } = await db
      .from('projects')
      .select(`
        id, title, channels, brand_voice, status, source_text, source_url,
        created_at, updated_at
      `, { count: 'exact' })
      .eq('user_id', payload.sub)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects.' });
    }

    return res.status(200).json({
      projects: projects || [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    });
  }

  if (req.method === 'POST') {
    const { title, source_text, source_url, channels, brand_voice } = req.body as CreateProjectRequest;

    if (!source_text || source_text.trim().length < 50) {
      return res.status(400).json({ error: 'Source text must be at least 50 characters.' });
    }
    if (!channels || channels.length === 0) {
      return res.status(400).json({ error: 'At least one channel must be selected.' });
    }

    const validChannels = ['twitter', 'linkedin', 'instagram', 'email'];
    if (!channels.every((c) => validChannels.includes(c))) {
      return res.status(400).json({ error: 'Invalid channel specified.' });
    }

    let usage;
    try {
      usage = await getUsageState(db, payload.sub);
    } catch (userError) {
      console.error('Error loading usage:', userError);
      return res.status(500).json({ error: 'Failed to verify plan limits.' });
    }

    if (usage.projectsThisMonth >= usage.planLimit) {
      return res.status(403).json({
        error: `You have reached your plan limit of ${usage.planLimit} projects/month. Upgrade your plan to continue.`,
        code: 'PLAN_LIMIT_REACHED',
      });
    }

    if (!isChannelAllowedForPlan(usage.planName as PlanName, channels as Channel[])) {
      return res.status(403).json({
        error: channelRestrictionMessage(usage.planName as PlanName),
        code: 'CHANNEL_NOT_ALLOWED',
      });
    }

    const { data: project, error: createError } = await db
      .from('projects')
      .insert({
        user_id: payload.sub,
        title: (title?.trim() || source_text.slice(0, 60).trim() + '…'),
        source_text: source_text.trim(),
        source_url: source_url?.trim() || null,
        channels,
        brand_voice: brand_voice || 'professional',
        status: 'pending',
      })
      .select()
      .single();

    if (createError || !project) {
      console.error('Error creating project:', createError);
      return res.status(500).json({ error: 'Failed to create project.' });
    }

    // Monthly quota increments only after successful AI generation (see /api/generate)
    return res.status(201).json({ project });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
