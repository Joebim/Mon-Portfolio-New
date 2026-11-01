import { NextResponse } from 'next/server';
import { verifyFirebaseIdToken, createSessionToken, setSessionCookie } from '../../../../lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing Firebase ID token' },
        { status: 400 }
      );
    }

    const verified = await verifyFirebaseIdToken(idToken);
    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid or expired Firebase authentication token' },
        { status: 401 }
      );
    }

    const sessionToken = await createSessionToken({
      uid: verified.uid,
      email: verified.email,
    });
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      success: true,
      uid: verified.uid,
      email: verified.email,
    });
  } catch (error) {
    console.error('[API /api/auth/login] Error:', error);
    return NextResponse.json({ error: 'Internal authentication error' }, { status: 500 });
  }
}
