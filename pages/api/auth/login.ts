// @ts-nocheck - Supabase type inference issues with complex queries
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyPassword, validateEmail, signToken, setAuthCookie } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import type { LoginRequest, ApiError, AuthResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse | ApiError>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    const db = getAdminSupabase();

    // Fetch user + plan in one join
    const { data: user, error } = await db
      .from('users')
      .select(`
        id, email, password_hash, full_name, brand_voice,
        projects_this_month, subscription_status, month_reset_at,
        created_at, updated_at,
        plan:plans(id, name, display_name, price_monthly, project_limit, features)
      `)
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      // Generic message — don't reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userData = user as any;
    const passwordValid = await verifyPassword(password, userData.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Reset monthly counter if needed
    if (new Date(userData.month_reset_at) <= new Date()) {
      await db
        .from('users')
        .update({ projects_this_month: 0, month_reset_at: getNextMonthReset() })
        .eq('id', userData.id);
      userData.projects_this_month = 0;
    }

    const planName = userData.plan?.name ?? 'free';
    const token = signToken({ sub: userData.id, email: userData.email, plan: planName });
    setAuthCookie(res, token);

    // Remove password hash from response
    const { password_hash: _, ...safeUser } = userData;

    return res.status(200).json({ user: safeUser as any, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

function getNextMonthReset(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
