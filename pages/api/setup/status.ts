import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSupabase } from '@/lib/supabase';
import { ensurePlansSeeded, mapDatabaseError } from '@/lib/plans';

/**
 * Public setup diagnostic — helps verify env + database before signup.
 * Do not expose secrets; only reports ok/missing.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const checks: Record<string, boolean | string> = {
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    jwt_secret: Boolean(process.env.JWT_SECRET),
    groq_api_key: Boolean(process.env.GROQ_API_KEY),
    paddle_api_key: Boolean(process.env.PADDLE_API_KEY),
    plans_table: false,
    free_plan: false,
    social_tables: false,
  };

  let readyForSignup = Boolean(
    checks.supabase_url &&
      checks.supabase_service_role &&
      checks.jwt_secret
  );

  try {
    const db = getAdminSupabase();
    await ensurePlansSeeded(db);
    checks.plans_table = true;

    const { data: freePlan } = await db
      .from('plans')
      .select('id')
      .eq('name', 'free')
      .maybeSingle();

    checks.free_plan = Boolean(freePlan);
    const { error: socialError } = await db
      .from('social_connections')
      .select('id')
      .limit(1);

    checks.social_tables = !socialError;
    readyForSignup = readyForSignup && checks.free_plan;
  } catch (err) {
    const message =
      mapDatabaseError(err) ??
      (err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? 'Database check failed');
    checks.database_error = message;
    readyForSignup = false;
  }

  const databaseError = typeof checks.database_error === 'string' ? checks.database_error : '';

  return res.status(200).json({
    ready_for_signup: readyForSignup,
    checks,
    hint: !readyForSignup
      ? databaseError.includes('Database tables are missing')
        ? 'Open Supabase SQL Editor and run the full contents of schema.sql.'
        : 'Set SUPABASE_* and JWT_SECRET in .env.local, then open Supabase SQL Editor and run schema.sql.'
      : undefined,
  });
}
