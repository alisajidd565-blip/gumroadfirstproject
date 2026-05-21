import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import {
  createCodeChallenge,
  getCallbackUrl,
  getProviderConfig,
  isSupportedSocialProvider,
  normalizeReturnTo,
  randomUrlSafeString,
  setOAuthStateCookie,
} from '@/lib/social';

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

  const config = getProviderConfig(provider);
  if (!config) {
    return res.redirect(`/settings?social_error=${provider}_not_configured`);
  }

  const state = randomUrlSafeString();
  const codeVerifier = provider === 'twitter' ? randomUrlSafeString(64) : undefined;
  const returnTo = normalizeReturnTo(req.query.return_to);
  const redirectUri = getCallbackUrl(req, provider);

  setOAuthStateCookie(res, provider, {
    provider,
    state,
    userId: payload.sub,
    returnTo,
    codeVerifier,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const authUrl = new URL(
    provider === 'linkedin'
      ? 'https://www.linkedin.com/oauth/v2/authorization'
      : 'https://x.com/i/oauth2/authorize'
  );

  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  if (provider === 'linkedin') {
    authUrl.searchParams.set('scope', 'openid profile w_member_social');
  } else {
    authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
    authUrl.searchParams.set('code_challenge', createCodeChallenge(codeVerifier ?? ''));
    authUrl.searchParams.set('code_challenge_method', 'S256');
  }

  return res.redirect(authUrl.toString());
}

