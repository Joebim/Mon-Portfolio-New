import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session_token';
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'mon-portfolio-joseph-admin-secret-2026-secure-key'
);

// Google/Firebase public JWKS for cryptographic signature verification without CJS jwks-rsa dependency
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

/**
 * Checks whether the verified Firebase user email is authorized to access the Admin Console.
 * Uses `ADMIN_ALLOWED_EMAILS` (comma-separated) if configured, otherwise falls back to
 * `ADMIN_ALERT_EMAIL`, `GMAIL_USER`, and the owner's primary admin emails.
 */
export function isAuthorizedAdminEmail(email?: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  const envAllowlist = (process.env.ADMIN_ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const fallbackAllowlist = [
    process.env.ADMIN_ALERT_EMAIL,
    process.env.GMAIL_USER,
    'joseph.akinwole.me@gmail.com',
    'akinwolejoseph01@gmail.com',
  ]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map((e) => e.trim().toLowerCase());

  const allowed = envAllowlist.length > 0 ? envAllowlist : fallbackAllowlist;
  return allowed.includes(normalized);
}

export interface AdminSession {
  uid: string;
  email?: string;
  username: string;
  role: 'admin';
}

export async function createSessionToken(session: { uid: string; email?: string }): Promise<string> {
  const username = session.email?.split('@')[0] || session.uid;
  return await new SignJWT({
    uid: session.uid,
    email: session.email,
    username,
    role: 'admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.uid && payload.role === 'admin') {
      return {
        uid: String(payload.uid),
        email: payload.email ? String(payload.email) : undefined,
        username: String(payload.username || 'admin'),
        role: 'admin',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email?: string; emailVerified?: boolean } | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mon-portfolio-a069b';

  // Cryptographic RS256 signature verification via Google's official JWKS
  // (No unsigned JWT decode fallback — prevents forged token bypass)
  try {
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (payload.sub) {
      return {
        uid: String(payload.sub),
        email: payload.email ? String(payload.email) : undefined,
        emailVerified: payload.email_verified === true,
      };
    }
  } catch (jwksErr) {
    console.warn('[auth] Google JWKS verification failed:', jwksErr);
  }

  return null;
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
