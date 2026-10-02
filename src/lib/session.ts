import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from './db';
import { PublicUserSession } from './types';

const SESSION_COOKIE_NAME = 'anon_session_token';
const SESSION_SECRET = process.env.SESSION_SECRET || 'anonymous_platform_super_secret_key_9283748234';

// 30 days session
const MAX_AGE = 60 * 60 * 24 * 30;

export function signToken(payload: { userId: string }): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + MAX_AGE * 1000 });
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  const buffer = Buffer.from(JSON.stringify({ data, sig: hmac })).toString('base64url');
  return buffer;
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const { data, sig } = JSON.parse(raw);
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    if (sig !== expectedSig) {
      return null;
    }
    const parsed = JSON.parse(data);
    if (Date.now() > parsed.exp) {
      return null;
    }
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<PublicUserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const verified = verifyToken(token);
  if (!verified) return null;

  const profile = db.getProfileByUserId(verified.userId);
  if (!profile) return null;

  return {
    id: profile.id,
    username: profile.username,
    country: profile.country,
    institution_id: profile.institution_id,
    institution_name: profile.institution_name || 'Selected University',
  };
}

export async function setSessionCookie(userId: string) {
  const cookieStore = cookies();
  const token = signToken({ userId });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
