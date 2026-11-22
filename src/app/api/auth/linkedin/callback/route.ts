import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeLinkedInCodeForToken,
  publishPostToLinkedInProfile,
} from '../../../../../lib/linkedin';
import {
  listSocialPosts,
  updateSocialPost,
  sendAutomationFailureAlert,
} from '../../../../../lib/automation';

/**
 * GET /api/auth/linkedin/callback
 * Receives the temporary `code` and `state` from LinkedIn after the member approves access:
 * 1) Exchanges `code`, `LINKEDIN_CLIENT_ID`, and `LINKEDIN_CLIENT_SECRET` at LinkedIn's token endpoint
 * 2) Calls `https://api.linkedin.com/v2/userinfo` to get the member's `sub` (person ID) for `urn:li:person:${sub}`
 * 3) Stores the 60-day member access token in Firestore
 * 4) If the OAuth flow was triggered to verify & publish a specific `postId`, publishes the post immediately
 *    to the member's LinkedIn profile via LinkedIn's Posts API!
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    const msg = errorDescription || error || 'LinkedIn authorization was cancelled or denied.';
    return NextResponse.redirect(
      `${origin}/admin?tab=automation&subTab=social&linkedinError=${encodeURIComponent(msg)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/admin?tab=automation&subTab=social&linkedinError=${encodeURIComponent('Missing authorization code from LinkedIn.')}`
    );
  }

  let postId = '';
  let autoPublish = false;

  try {
    const cookieStore = await cookies();
    const savedState = cookieStore.get('linkedin_oauth_state')?.value;
    cookieStore.delete('linkedin_oauth_state');

    if (!state || !savedState || savedState !== state) {
      return NextResponse.redirect(
        `${origin}/admin?tab=automation&subTab=social&linkedinError=${encodeURIComponent(
          'OAuth state verification failed or expired. Please retry the LinkedIn verification flow.'
        )}`
      );
    }

    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
    postId = decoded.postId || '';
    autoPublish = Boolean(decoded.autoPublish);
  } catch (err) {
    return NextResponse.redirect(
      `${origin}/admin?tab=automation&subTab=social&linkedinError=${encodeURIComponent(
        'Invalid LinkedIn OAuth state payload.'
      )}`
    );
  }

  try {
    // 1. Exchange code for 60-day member access token & fetch /v2/userinfo person ID
    const session = await exchangeLinkedInCodeForToken(code, origin);

    // 2. If this verification flow was initiated for a specific reviewed LinkedIn draft, publish it now!
    if (postId && autoPublish) {
      const posts = await listSocialPosts();
      const targetPost = posts.find((p) => p.id === postId);

      if (targetPost) {
        const pubRes = await publishPostToLinkedInProfile({
          text: targetPost.linkedinContent,
          imageUrl: targetPost.linkedinImageUrl,
          articleUrl: targetPost.articleUrl,
          articleTitle: targetPost.articleTitle,
          sessionOverride: session,
        });

        if (pubRes.success) {
          await updateSocialPost(targetPost.id, {
            linkedinStatus: 'published',
            linkedinPostUrl: pubRes.url,
          });
          return NextResponse.redirect(
            `${origin}/admin?tab=automation&subTab=social&linkedin=published&postId=${encodeURIComponent(targetPost.id)}`
          );
        } else {
          await sendAutomationFailureAlert({
            pipeline: 'linkedin',
            pipelineLabel: 'LinkedIn OAuth Auto-Publish',
            topicOrTitle: targetPost.articleTitle,
            failedStep: 'LINKEDIN_OAUTH_CALLBACK_PUBLISH_FAILED',
            errorMessage: pubRes.error || 'OAuth verified, but LinkedIn post publish failed.',
          });
          return NextResponse.redirect(
            `${origin}/admin?tab=automation&subTab=social&linkedinError=${encodeURIComponent(pubRes.error || 'OAuth verified, but post publish failed.')}`
          );
        }
      }
    }

    return NextResponse.redirect(
      `${origin}/admin?tab=automation&subTab=social&linkedin=connected`
    );
  } catch (err) {
    console.error('[LinkedIn Callback] Error:', err);
    const msg = err instanceof Error ? err.message : 'LinkedIn OAuth exchange failed.';
    await sendAutomationFailureAlert({
      pipeline: 'linkedin',
      pipelineLabel: 'LinkedIn OAuth Token Exchange',
      failedStep: 'LINKEDIN_OAUTH_EXCHANGE_FAILED',
      errorMessage: msg,
    });
    return NextResponse.redirect(
      `${origin}/admin?tab=automation&subTab=social&linkedinError=${encodeURIComponent(msg)}`
    );
  }
}
