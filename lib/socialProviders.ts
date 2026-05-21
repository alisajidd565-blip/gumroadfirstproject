import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { SupportedSocialProvider } from '@/types';
import {
  decryptSecret,
  encryptSecret,
  getCallbackUrl,
  getProviderConfig,
  type ProviderConfig,
} from '@/lib/social';

type Db = SupabaseClient<Database>;

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

type SocialConnectionRow = Database['public']['Tables']['social_connections']['Row'];

export type SocialProfile = {
  providerUserId: string;
  displayName: string | null;
  username: string | null;
};

export type PublishResult = {
  providerPostId: string;
  providerUrl: string | null;
};

export async function exchangeAuthorizationCode(
  provider: SupportedSocialProvider,
  code: string,
  req: Parameters<typeof getCallbackUrl>[0],
  codeVerifier?: string
): Promise<TokenResponse> {
  const config = getRequiredProviderConfig(provider);
  const redirectUri = getCallbackUrl(req, provider);

  if (provider === 'linkedin') {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret ?? '',
    });

    return postTokenRequest('https://www.linkedin.com/oauth/v2/accessToken', body);
  }

  if (!codeVerifier) {
    throw new Error('Missing X OAuth code verifier.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const headers = createXTokenHeaders(config, body);
  return postTokenRequest('https://api.x.com/2/oauth2/token', body, headers);
}

export async function refreshConnectionToken(
  db: Db,
  connection: SocialConnectionRow
): Promise<SocialConnectionRow> {
  if (!connection.refresh_token) return connection;

  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : null;
  if (expiresAt && expiresAt > Date.now() + 5 * 60 * 1000) return connection;

  const refreshToken = decryptSecret(connection.refresh_token);
  const config = getRequiredProviderConfig(connection.provider as SupportedSocialProvider);
  let token: TokenResponse;

  if (connection.provider === 'linkedin') {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret ?? '',
    });
    token = await postTokenRequest('https://www.linkedin.com/oauth/v2/accessToken', body);
  } else {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const headers = createXTokenHeaders(config, body);
    token = await postTokenRequest('https://api.x.com/2/oauth2/token', body, headers);
  }

  const update = serializeTokenUpdate(token);
  const { data, error } = await db
    .from('social_connections')
    .update(update)
    .eq('id', connection.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error('Failed to refresh social account connection.');
  }

  return data;
}

export async function fetchSocialProfile(
  provider: SupportedSocialProvider,
  accessToken: string
): Promise<SocialProfile> {
  if (provider === 'linkedin') {
    const res = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json() as { sub?: string; name?: string; given_name?: string; family_name?: string; email?: string };
      if (data.sub) {
        const fullName = data.name ?? ([data.given_name, data.family_name].filter(Boolean).join(' ') || null);
        return { providerUserId: data.sub, displayName: fullName, username: data.email ?? null };
      }
    }

    const fallback = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!fallback.ok) throw new Error('Failed to load LinkedIn profile.');
    const data = await fallback.json() as { id?: string; localizedFirstName?: string; localizedLastName?: string };
    if (!data.id) throw new Error('LinkedIn profile did not include an account id.');

    return {
      providerUserId: data.id,
      displayName: [data.localizedFirstName, data.localizedLastName].filter(Boolean).join(' ') || null,
      username: null,
    };
  }

  const res = await fetch('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Failed to load X profile.');
  const data = await res.json() as { data?: { id?: string; name?: string; username?: string } };
  if (!data.data?.id) throw new Error('X profile did not include an account id.');

  return {
    providerUserId: data.data.id,
    displayName: data.data.name ?? null,
    username: data.data.username ?? null,
  };
}

export async function publishToProvider(
  provider: SupportedSocialProvider,
  connection: SocialConnectionRow,
  content: string
): Promise<PublishResult> {
  const accessToken = decryptSecret(connection.access_token);

  if (provider === 'linkedin') {
    const author = `urn:li:person:${connection.provider_user_id}`;
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });

    if (!res.ok) {
      throw new Error(await readProviderError(res, 'LinkedIn publishing failed.'));
    }

    const postId = res.headers.get('x-restli-id') || res.headers.get('X-RestLi-Id') || 'linkedin-post';
    return {
      providerPostId: postId,
      providerUrl: postId === 'linkedin-post' ? null : `https://www.linkedin.com/feed/update/${postId}/`,
    };
  }

  const res = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: content }),
  });

  if (!res.ok) {
    throw new Error(await readProviderError(res, 'X publishing failed.'));
  }

  const data = await res.json() as { data?: { id?: string } };
  const postId = data.data?.id;
  if (!postId) throw new Error('X did not return a post id.');

  return {
    providerPostId: postId,
    providerUrl: `https://x.com/i/web/status/${postId}`,
  };
}

export function serializeTokenUpdate(token: TokenResponse) {
  return {
    access_token: encryptSecret(token.access_token),
    refresh_token: token.refresh_token ? encryptSecret(token.refresh_token) : undefined,
    scopes: token.scope ? token.scope.split(/[,\s]+/).filter(Boolean) : undefined,
    expires_at: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : undefined,
  };
}

function getRequiredProviderConfig(provider: SupportedSocialProvider): ProviderConfig {
  const config = getProviderConfig(provider);
  if (!config) throw new Error(`${provider} is not configured.`);
  return config;
}

function createXTokenHeaders(config: ProviderConfig, body: URLSearchParams): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (config.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
  } else {
    body.set('client_id', config.clientId);
  }

  return headers;
}

async function postTokenRequest(
  url: string,
  body: URLSearchParams,
  headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
): Promise<TokenResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    throw new Error(await readProviderError(res, 'Failed to exchange social authorization code.'));
  }

  return res.json() as Promise<TokenResponse>;
}

async function readProviderError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json() as { error?: string; error_description?: string; message?: string; detail?: string };
    return data.error_description || data.message || data.detail || data.error || fallback;
  } catch {
    return fallback;
  }
}
