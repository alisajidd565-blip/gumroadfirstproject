// @ts-nocheck - Supabase type inference issues with complex queries
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import type { CreateProjectRequest } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const db = getAdminSupabase();

  // ── GET /api/projects — list user's projects ──────────────────────────────
  if (req.method === 'GET') {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const offset = (page - 1) * limit;

    const { data: projects, error, count } = await db
      .from('projects')
      .select(`
        id, title, channels, brand_voice, status, source_text,
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

  // ── POST /api/projects — create new project ───────────────────────────────
  if (req.method === 'POST') {
    const { title, source_text, channels, brand_voice } = req.body as CreateProjectRequest;

    // Input validation
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

    // ── Enforce plan limits ─────────────────────────────────────────────────
    const { data: user, error: userError } = await db
      .from('users')
      .select(`
        projects_this_month, month_reset_at,
        plan:plans(project_limit)
      `)
      .eq('id', payload.sub)
      .single();

    if (userError || !user) {
      return res.status(500).json({ error: 'Failed to verify plan limits.' });
    }

    // Reset monthly counter if month has rolled over
    let projectsThisMonth = user.projects_this_month;
    if (new Date(user.month_reset_at) <= new Date()) {
      projectsThisMonth = 0;
      await db
        .from('users')
        .update({
          projects_this_month: 0,
          month_reset_at: getNextMonthReset(),
        })
        .eq('id', payload.sub);
    }

    const planLimit = (user.plan as any)?.project_limit ?? 3;

    if (projectsThisMonth >= planLimit) {
      return res.status(403).json({
        error: `You have reached your plan limit of ${planLimit} projects/month. Upgrade your plan to continue.`,
        code: 'PLAN_LIMIT_REACHED',
      });
    }

    // ── Create the project ──────────────────────────────────────────────────
    const { data: project, error: createError } = await db
      .from('projects')
      .insert({
        user_id: payload.sub,
        title: (title?.trim() || source_text.slice(0, 60).trim() + '…'),
        source_text: source_text.trim(),
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

    // Increment monthly counter
    await db
      .from('users')
      .update({ projects_this_month: projectsThisMonth + 1 })
      .eq('id', payload.sub);

    return res.status(201).json({ project });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}

function getNextMonthReset(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
