import crypto from 'crypto';
import { parse, serialize } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { SocialProvider, SupportedSocialProvider } from '@/types';

export const SUPPORTED_SOCIAL_PROVIDERS: SupportedSocialProvider[] = ['linkedin', 'twitter'];

const OAUTH_COOKIE_PREFIX = 'cr_social_oauth_';
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

type OAuthState = {
  provider: SupportedSocialProvider;
  state: string;
  userId: string;
  returnTo: string;
  codeVerifier?: string;
  expiresAt: number;
};

export type ProviderConfig = {
  provider: SupportedSocialProvider;
  clientId: string;
  clientSecret?: string;
};

export function isSupportedSocialProvider(provider: string): provider is SupportedSocialProvider {
  return SUPPORTED_SOCIAL_PROVIDERS.includes(provider as SupportedSocialProvider);
}

export function getProviderLabel(provider: SocialProvider): string {
  if (provider === 'linkedin') return 'LinkedIn';
  if (provider === 'twitter') return 'X / Twitter';
  return 'Instagram';
}

export function providerFromChannel(channel: string): SupportedSocialProvider | null {
  if (channel === 'linkedin') return 'linkedin';
  if (channel === 'twitter') return 'twitter';
  return null;
}

export function getProviderConfig(provider: SupportedSocialProvider): ProviderConfig | null {
  if (provider === 'linkedin') {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    return clientId && clientSecret ? { provider, clientId, clientSecret } : null;
  }

  const clientId = process.env.X_CLIENT_ID ?? process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET ?? process.env.TWITTER_CLIENT_SECRET;
  return clientId ? { provider, clientId, clientSecret } : null;
}

export function getRequestOrigin(req: NextApiRequest): string {
  const forwardedProto = Array.isArray(req.headers['x-forwarded-proto'])
    ? req.headers['x-forwarded-proto'][0]
    : req.headers['x-forwarded-proto'];
  const forwardedHost = Array.isArray(req.headers['x-forwarded-host'])
    ? req.headers['x-forwarded-host'][0]
    : req.headers['x-forwarded-host'];

  const proto = forwardedProto?.split(',')[0]?.trim() || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = forwardedHost?.split(',')[0]?.trim() || req.headers.host;

  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  return `${proto}://${host}`;
}

export function getCallbackUrl(req: NextApiRequest, provider: SupportedSocialProvider): string {
  return `${getRequestOrigin(req)}/api/social/callback/${provider}`;
}

export function randomUrlSafeString(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function createCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

function getSigningSecret(): string {
  const secret = process.env.SOCIAL_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing SOCIAL_TOKEN_SECRET or JWT_SECRET environment variable.');
  }
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getSigningSecret()).update(value).digest('base64url');
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function oauthCookieName(provider: SupportedSocialProvider): string {
  return `${OAUTH_COOKIE_PREFIX}${provider}`;
}

export function setOAuthStateCookie(
  res: NextApiResponse,
  provider: SupportedSocialProvider,
  state: OAuthState
): void {
  const payload = Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
  res.setHeader(
    'Set-Cookie',
    serialize(oauthCookieName(provider), `${payload}.${sign(payload)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
      path: '/',
    })
  );
}

export function readOAuthStateCookie(
  req: NextApiRequest,
  provider: SupportedSocialProvider
): OAuthState | null {
  const cookies = parse(req.headers.cookie || '');
  const raw = cookies[oauthCookieName(provider)];
  if (!raw) return null;

  const [payload, signature] = raw.split('.');
  if (!payload || !signature || !timingSafeEqual(signature, sign(payload))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
    if (parsed.provider !== provider || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOAuthStateCookie(res: NextApiResponse, provider: SupportedSocialProvider): void {
  res.setHeader(
    'Set-Cookie',
    serialize(oauthCookieName(provider), '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  );
}

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(getSigningSecret()).digest();
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(value: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Invalid encrypted secret.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivRaw, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function normalizeReturnTo(returnTo: string | string[] | undefined): string {
  const value = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/settings';
  return value;
}

