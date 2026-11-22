import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '../../../../lib/auth';
import {
  buildLinkedInAuthorizationUrl,
  getLinkedInConnectionStatus,
} from '../../../../lib/linkedin';

/**
 * GET /api/auth/linkedin
 * - If `?mode=status`: requires active Admin session and returns LinkedIn OAuth connection & 60-day token status.
 * - Otherwise: initiates the LinkedIn OAuth 2.0 browser verification flow with
 *   scopes `openid profile email w_member_social`.
 *   Accepts optional `?postId=xxx&autoPublish=true` (triggered from the Review Email or Admin UI)
 *   so that right after you approve access on LinkedIn, the verified post is automatically published!
 *   Note: When LinkedIn redirects back to `/admin`, Next.js middleware enforces admin login
 *   if the current browser/device is not logged in.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');
  const origin = url.origin;

  if (mode === 'status') {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const status = await getLinkedInConnectionStatus(origin);
    return NextResponse.json(status);
  }

  const postId = url.searchParams.get('postId') || '';
  const autoPublish = url.searchParams.get('autoPublish') === 'true';

  try {
    const nonce = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const statePayload = JSON.stringify({
      nonce,
      postId,
      autoPublish,
    });
    const encodedState = Buffer.from(statePayload, 'utf-8').toString('base64url');

    const authUrl = buildLinkedInAuthorizationUrl({
      state: encodedState,
      requestOrigin: origin,
    });

    const cookieStore = await cookies();
    cookieStore.set('linkedin_oauth_state', encodedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'LinkedIn OAuth initiation failed';
    return NextResponse.redirect(
      `${origin}/admin?tab=automation&subTab=social&linkedinError=${encodeURIComponent(errMsg)}`
    );
  }
}
