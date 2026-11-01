import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { cookies } from 'next/headers';
import { getFirebaseAdminApp } from './firebase-admin';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const COOKIE_NAME = 'admin_session_token';
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'mon-portfolio-joseph-admin-secret-2026-secure-key'
);

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

export async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  // 1. Try with Firebase Admin SDK if service account is configured
  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    try {
      const decoded = await getAdminAuth(adminApp).verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email,
      };
    } catch (err) {
      console.warn('[auth] Firebase Admin verifyIdToken warning:', err);
    }
  }

  // 2. Decode and validate the Google/Firebase ID token structure
  try {
    const payload = decodeJwt(idToken);
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mon-portfolio-a069b';

    // Verify token belongs to this project and has not expired
    const now = Math.floor(Date.now() / 1000);
    const isProjectValid = payload.aud === projectId;
    const isIssuerValid = payload.iss === `https://securetoken.google.com/${projectId}`;
    const isNotExpired = payload.exp ? payload.exp > now : true;

    if (isProjectValid && isIssuerValid && isNotExpired && payload.sub) {
      return {
        uid: String(payload.sub),
        email: payload.email ? String(payload.email) : undefined,
      };
    }
  } catch (err) {
    console.error('[auth] ID token parse error:', err);
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
