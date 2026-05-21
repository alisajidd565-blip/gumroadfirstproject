import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import {
  clearOAuthStateCookie,
  encryptSecret,
  isSupportedSocialProvider,
  readOAuthStateCookie,
} from '@/lib/social';
import {
  exchangeAuthorizationCode,
  fetchSocialProfile,
  serializeTokenUpdate,
} from '@/lib/socialProviders';

function redirectWithError(res: NextApiResponse, returnTo: string, code: string) {
  const target = new URL(returnTo, 'http://localhost');
  target.searchParams.set('social_error', code);
  return res.redirect(`${target.pathname}${target.search}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  const { provider } = req.query as { provider: string };
  if (!isSupportedSocialProvider(provider)) {
    return res.redirect('/settings?social_error=unsupported_provider');
  }

  const oauthState = readOAuthStateCookie(req, provider);
  clearOAuthStateCookie(res, provider);

  const returnTo = oauthState?.returnTo ?? '/settings';

  if (!oauthState || oauthState.userId !== payload.sub) {
    return redirectWithError(res, returnTo, 'invalid_social_state');
  }

  const state = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;
  if (state !== oauthState.state) {
    return redirectWithError(res, returnTo, 'invalid_social_state');
  }

  const providerError = Array.isArray(req.query.error) ? req.query.error[0] : req.query.error;
  if (providerError) {
    return redirectWithError(res, returnTo, providerError);
  }

  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  if (!code) {
    return redirectWithError(res, returnTo, 'missing_social_code');
  }

  try {
    const token = await exchangeAuthorizationCode(provider, code, req, oauthState.codeVerifier);
    const profile = await fetchSocialProfile(provider, token.access_token);
    const db = getAdminSupabase();
    const tokenUpdate = serializeTokenUpdate(token);

    const { error } = await db.from('social_connections').upsert(
      {
        user_id: payload.sub,
        provider,
        provider_user_id: profile.providerUserId,
        display_name: profile.displayName,
        username: profile.username,
        access_token: encryptSecret(token.access_token),
        refresh_token: token.refresh_token ? encryptSecret(token.refresh_token) : null,
        scopes: tokenUpdate.scopes ?? null,
        expires_at: tokenUpdate.expires_at ?? null,
      },
      { onConflict: 'user_id,provider' }
    );

    if (error) throw error;

    const target = new URL(returnTo, 'http://localhost');
    target.searchParams.set('social_connected', provider);
    return res.redirect(`${target.pathname}${target.search}`);
  } catch (err) {
    console.error('Social OAuth callback failed:', err);
    return redirectWithError(res, returnTo, 'social_connection_failed');
  }
}

