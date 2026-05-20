import type { NextApiRequest, NextApiResponse } from 'next';
import { hashPassword, validatePasswordStrength, validateEmail, signToken, setAuthCookie } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import type { SignupRequest, ApiError, AuthResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse | ApiError>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { email, password, full_name } = req.body as SignupRequest;

  // ── Validate input ──────────────────────────────────────────────────────────
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

    // ── Check if email already in use ───────────────────────────────────────
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // ── Get the free plan ID ────────────────────────────────────────────────
    const { data: freePlan, error: planError } = await db
      .from('plans')
      .select('id')
      .eq('name', 'free')
      .single();

    if (planError || !freePlan) {
      console.error('Could not fetch free plan:', planError);
      return res.status(500).json({ error: 'Failed to initialize account plan.' });
    }

    // ── Hash password and create user ───────────────────────────────────────
    const password_hash = await hashPassword(password);

    const { data: user, error: createError } = await db
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash,
        full_name: full_name?.trim() || null,
        plan_id: freePlan.id,
      })
      .select('id, email, full_name, plan_id, brand_voice, projects_this_month, subscription_status, created_at, updated_at')
      .single();

    if (createError || !user) {
      console.error('Error creating user:', createError);
      return res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }

    // ── Sign JWT and set cookie ─────────────────────────────────────────────
    const token = signToken({ sub: user.id, email: user.email, plan: 'free' });
    setAuthCookie(res, token);

    return res.status(201).json({
      user,
      token,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
