import type { NextApiRequest, NextApiResponse } from 'next';
import { hashPassword, validatePasswordStrength, validateEmail, signToken, setAuthCookie } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { getFreePlanId, mapDatabaseError } from '@/lib/plans';
import type { SignupRequest, ApiError, AuthResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse | ApiError>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { email, password, full_name } = req.body as SignupRequest;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const db = getAdminSupabase();

    const { data: existing, error: existingError } = await db
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingError) {
      console.error('Signup email lookup error:', existingError);
      const mapped = mapDatabaseError(existingError);
      return res.status(500).json({
        error: mapped ?? 'Database connection failed. Check Supabase credentials in .env.local.',
      });
    }

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    let freePlanId: string;
    try {
      freePlanId = await getFreePlanId(db);
    } catch (planErr) {
      console.error('Could not fetch/seed free plan:', planErr);
      const mapped = mapDatabaseError(planErr as { code?: string; message?: string });
      return res.status(500).json({
        error:
          mapped ??
          'Failed to initialize account plan. Run schema.sql in Supabase SQL Editor, then try again.',
        code: 'PLAN_SETUP_REQUIRED',
      });
    }

    const password_hash = await hashPassword(password);

    const { data: user, error: createError } = await db
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash,
        full_name: full_name?.trim() || null,
        plan_id: freePlanId,
      })
      .select(`
        id, email, full_name, plan_id, brand_voice,
        projects_this_month, subscription_status, month_reset_at,
        stripe_customer_id, stripe_subscription_id, subscription_ends_at,
        created_at, updated_at
      `)
      .single();

    if (createError || !user) {
      console.error('Error creating user:', createError);
      const mapped = createError ? mapDatabaseError(createError) : null;
      if (mapped?.includes('already exists')) {
        return res.status(409).json({ error: mapped });
      }
      return res.status(500).json({
        error: mapped ?? 'Failed to create account. Please try again.',
      });
    }

    const token = signToken({ sub: user.id, email: user.email, plan: 'free' });
    setAuthCookie(res, token);

    return res.status(201).json({ user });
  } catch (err) {
    console.error('Signup error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error.';
    if (message.includes('JWT_SECRET')) {
      return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is not set.' });
    }
    if (message.includes('SUPABASE')) {
      return res.status(500).json({ error: `Server misconfigured: ${message}` });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
