import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { serialize, parse } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { JwtPayload, PlanName } from '@/types';
import { COOKIE_NAME } from '@/types';

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable.');
  }
  return secret;
}

// ─── Password ─────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain a number.';
  return null;
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export function signToken(payload: {
  sub: string;
  email: string;
  plan: PlanName;
}): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Cookie ───────────────────────────────────────────────────────────────────

export function setAuthCookie(res: NextApiResponse, token: string): void {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
  );
}

export function clearAuthCookie(res: NextApiResponse): void {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  );
}

export function getTokenFromRequest(req: NextApiRequest): string | null {
  // 1. Try cookie
  const cookies = parse(req.headers.cookie || '');
  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];

  // 2. Try Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

// ─── Route Guard ──────────────────────────────────────────────────────────────

/**
 * Extracts and verifies the JWT from the request.
 * Returns the decoded payload or sends a 401 and returns null.
 */
export function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): JwtPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return null;
  }

  return payload;
}

// ─── Input Validation ─────────────────────────────────────────────────────────

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
