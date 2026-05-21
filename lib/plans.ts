import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Channel, PlanName } from '@/types';

type AdminClient = SupabaseClient<Database>;

const PLAN_SEEDS: Array<{
  name: PlanName;
  display_name: string;
  price_monthly: number;
  project_limit: number;
  stripe_price_id: string | null;
  features: string[];
}> = [
  {
    name: 'free',
    display_name: 'Free',
    price_monthly: 0,
    project_limit: 3,
    stripe_price_id: null,
    features: ['3 projects/month', 'Twitter & LinkedIn', 'Basic outputs'],
  },
  {
    name: 'pro',
    display_name: 'Pro',
    price_monthly: 1900,
    project_limit: 50,
    stripe_price_id: null,
    features: ['50 projects/month', 'All channels', 'Editable outputs', 'Priority AI'],
  },
  {
    name: 'business',
    display_name: 'Business',
    price_monthly: 4900,
    project_limit: 500,
    stripe_price_id: null,
    features: ['500 projects/month', 'All channels', 'Team sharing', 'API access'],
  },
];

export const ALLOWED_CHANNELS_BY_PLAN: Record<PlanName, Channel[]> = {
  free: ['twitter', 'linkedin'],
  pro: ['twitter', 'linkedin', 'instagram', 'email'],
  business: ['twitter', 'linkedin', 'instagram', 'email'],
};

export function isChannelAllowedForPlan(planName: PlanName, channels: Channel[]): boolean {
  const allowed = ALLOWED_CHANNELS_BY_PLAN[planName] ?? ALLOWED_CHANNELS_BY_PLAN.free;
  return channels.every((c) => allowed.includes(c));
}

export function channelRestrictionMessage(planName: PlanName): string {
  const allowed = ALLOWED_CHANNELS_BY_PLAN[planName] ?? ALLOWED_CHANNELS_BY_PLAN.free;
  const labels = allowed.map((c) => (c === 'twitter' ? 'Twitter/X' : c.charAt(0).toUpperCase() + c.slice(1)));
  return `Your ${planName} plan includes: ${labels.join(', ')}. Upgrade for all channels.`;
}

/** Ensures default plans exist (idempotent). Safe to call on every signup. */
export async function ensurePlansSeeded(db: AdminClient): Promise<void> {
  for (const plan of PLAN_SEEDS) {
    const { data: existing, error: selectError } = await db
      .from('plans')
      .select('id')
      .eq('name', plan.name)
      .maybeSingle();

    if (selectError) throw selectError;
    if (existing) continue;

    const { error: insertError } = await db.from('plans').insert(plan);
    if (insertError && insertError.code !== '23505') {
      throw insertError;
    }
  }
}

export async function getFreePlanId(db: AdminClient): Promise<string> {
  await ensurePlansSeeded(db);

  const { data: freePlan, error } = await db
    .from('plans')
    .select('id')
    .eq('name', 'free')
    .single();

  if (error || !freePlan) {
    throw error ?? new Error('Free plan not found after seeding.');
  }

  return freePlan.id;
}

export function mapDatabaseError(err: { code?: string; message?: string } | Error | unknown): string | null {
  const maybeError = err as { code?: string; message?: string };
  const code = maybeError?.code ?? '';
  const msg = maybeError?.message ?? (err instanceof Error ? err.message : '');

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  ) {
    return 'Database tables are missing. Run schema.sql in your Supabase SQL Editor, then try again.';
  }
  if (code === 'PGRST301' || msg.includes('JWT')) {
    return 'Invalid Supabase service role key. Check SUPABASE_SERVICE_ROLE_KEY in your environment.';
  }
  if (
    msg.includes('fetch failed') ||
    msg.includes('Failed to fetch') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('getaddrinfo') ||
    msg.includes('could not be resolved')
  ) {
    return 'Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in your environment.';
  }
  if (code === '23505') {
    return 'An account with this email already exists.';
  }
  return null;
}
