import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type AdminClient = SupabaseClient<Database>;

export function getNextMonthReset(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getUsageState(db: AdminClient, userId: string) {
  const { data: user, error } = await db
    .from('users')
    .select(`
      projects_this_month, month_reset_at,
      plan:plans(name, project_limit)
    `)
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw error ?? new Error('User not found.');
  }

  let projectsThisMonth = user.projects_this_month;

  if (new Date(user.month_reset_at) <= new Date()) {
    projectsThisMonth = 0;
    await db
      .from('users')
      .update({
        projects_this_month: 0,
        month_reset_at: getNextMonthReset(),
      })
      .eq('id', userId);
  }

  const plan = user.plan as { name?: string; project_limit?: number } | null;
  const planName = (plan?.name ?? 'free') as 'free' | 'pro' | 'business';
  const planLimit = plan?.project_limit ?? 3;

  return { projectsThisMonth, planLimit, planName };
}

export async function incrementProjectUsage(db: AdminClient, userId: string): Promise<void> {
  const { projectsThisMonth } = await getUsageState(db, userId);
  await db
    .from('users')
    .update({ projects_this_month: projectsThisMonth + 1 })
    .eq('id', userId);
}
