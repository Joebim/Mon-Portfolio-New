import { getFirestoreDb } from './firebase-admin';

export interface LinkedInAuthSession {
  accessToken: string;
  personId: string; // `sub` from /v2/userinfo
  personUrn: string; // `urn:li:person:${sub}`
  name?: string;
  email?: string;
  picture?: string;
  connectedAt: string;
  expiresAt: string; // Typically 60 days from connectedAt
  expiresInSeconds: number;
}

let memoryLinkedInAuth: LinkedInAuthSession | null = null;

/** Returns a live LinkedIn REST API version (previous month YYYYMM, always within LinkedIn's 12-month support window). */
function getActiveLinkedInApiVersion(): string {
  const now = new Date();
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const year = prevMonth.getUTCFullYear();
  const month = String(prevMonth.getUTCMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/** Ensures Cloudinary URLs resolve as JPEG/PNG instead of WebP/AVIF so LinkedIn's media uploader accepts them. */
function toLinkedInCompatibleImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    if (!/\/upload\/[^/]*f_(jpg|jpeg|png)/.test(trimmed)) {
      return trimmed.replace('/upload/', '/upload/f_jpg,q_auto:good/');
    }
  }
  return trimmed;
}

export function getLinkedInOAuthConfig(requestOrigin?: string) {
  const clientId = (process.env.LINKEDIN_CLIENT_ID || '').trim();
  const clientSecret = (process.env.LINKEDIN_CLIENT_SECRET || '').trim();
  const baseSiteUrl = (
    requestOrigin ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  )
    .trim()
    .replace(/\/$/, '');
  const redirectUri = (
    process.env.LINKEDIN_REDIRECT_URI || `${baseSiteUrl}/api/auth/linkedin/callback`
  ).trim();

  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
    scopes: ['openid', 'profile', 'email', 'w_member_social'],
  };
}

/**
 * Builds the LinkedIn OAuth 2.0 authorization URL with `openid`, `profile`, `email`, and `w_member_social` scopes.
 */
export function buildLinkedInAuthorizationUrl(params: {
  state: string;
  requestOrigin?: string;
}): string {
  const { clientId, redirectUri, scopes } = getLinkedInOAuthConfig(params.requestOrigin);
  if (!clientId) {
    throw new Error(
      'LINKEDIN_CLIENT_ID is not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to .env.local.'
    );
  }

  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: params.state,
    scope: scopes.join(' '),
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${query.toString()}`;
}

/**
 * Exchanges the temporary authorization `code` for a 60-day member `access_token`,
 * then calls `https://api.linkedin.com/v2/userinfo` (OpenID Connect) to retrieve the
 * member's `sub` (person ID) for `urn:li:person:${sub}`, and persists the session.
 */
export async function exchangeLinkedInCodeForToken(
  code: string,
  requestOrigin?: string
): Promise<LinkedInAuthSession> {
  const { clientId, clientSecret, redirectUri, configured } =
    getLinkedInOAuthConfig(requestOrigin);

  if (!configured) {
    throw new Error(
      'LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set in .env.local.'
    );
  }

  // 1. Exchange code at LinkedIn token endpoint
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`LinkedIn token exchange failed (${tokenRes.status}): ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const accessToken = tokenData.access_token;
  // Default to 60 days (5,184,000 seconds) if expires_in is omitted
  const expiresInSeconds = tokenData.expires_in || 60 * 24 * 60 * 60;

  // 2. Call OpenID Connect /v2/userinfo endpoint to get the member's person ID (`sub`)
  const userInfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoRes.ok) {
    const errText = await userInfoRes.text();
    throw new Error(`LinkedIn /v2/userinfo failed (${userInfoRes.status}): ${errText}`);
  }

  const userInfo = (await userInfoRes.json()) as {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
    picture?: string;
  };

  if (!userInfo.sub) {
    throw new Error('LinkedIn /v2/userinfo did not return a valid member "sub" identifier.');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

  const session: LinkedInAuthSession = {
    accessToken,
    personId: userInfo.sub,
    personUrn: `urn:li:person:${userInfo.sub}`,
    name:
      userInfo.name ||
      [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') ||
      'LinkedIn Member',
    email: userInfo.email,
    picture: userInfo.picture,
    connectedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds,
  };

  await saveLinkedInAuthSession(session);
  return session;
}

/**
 * Saves the LinkedIn member access token and person ID to Firestore (`automation/linkedin_auth`).
 */
export async function saveLinkedInAuthSession(session: LinkedInAuthSession): Promise<void> {
  memoryLinkedInAuth = session;
  const db = getFirestoreDb();
  if (db) {
    await db
      .collection('automation')
      .doc('linkedin_auth')
      .set(JSON.parse(JSON.stringify(session)), { merge: true });
  }
}

/**
 * Retrieves the stored LinkedIn member access token & person URN (or falls back to .env.local).
 */
export async function getLinkedInAuthSession(): Promise<LinkedInAuthSession | null> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const doc = await db.collection('automation').doc('linkedin_auth').get();
      if (doc.exists) {
        const data = doc.data() as LinkedInAuthSession;
        if (data?.accessToken && data?.personUrn) {
          memoryLinkedInAuth = data;
          return data;
        }
      }
    } catch (err) {
      console.warn('[linkedin.ts] Firestore getLinkedInAuthSession fallback:', err);
    }
  }

  if (memoryLinkedInAuth) return memoryLinkedInAuth;

  // Fallback if user manually pasted LINKEDIN_ACCESS_TOKEN & LINKEDIN_PERSON_URN in .env.local
  if (process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_PERSON_URN) {
    const rawUrn = process.env.LINKEDIN_PERSON_URN.trim();
    const personId = rawUrn.replace(/^urn:li:person:/, '');
    return {
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN.trim(),
      personId,
      personUrn: rawUrn.startsWith('urn:li:person:') ? rawUrn : `urn:li:person:${personId}`,
      name: 'Configured via .env.local',
      connectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      expiresInSeconds: 60 * 24 * 60 * 60,
    };
  }

  return null;
}

/**
 * Returns status and 60-day token expiration metrics for the Admin UI.
 */
export async function getLinkedInConnectionStatus(requestOrigin?: string) {
  const oauth = getLinkedInOAuthConfig(requestOrigin);
  const session = await getLinkedInAuthSession();

  if (!session) {
    return {
      oauthConfigured: oauth.configured,
      redirectUri: oauth.redirectUri,
      connected: false,
      expired: false,
      daysRemaining: 0,
    };
  }

  const now = Date.now();
  const exp = new Date(session.expiresAt).getTime();
  const msRemaining = exp - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const expired = msRemaining <= 0;

  return {
    oauthConfigured: oauth.configured,
    redirectUri: oauth.redirectUri,
    connected: !expired,
    expired,
    daysRemaining,
    personId: session.personId,
    personUrn: session.personUrn,
    name: session.name,
    email: session.email,
    picture: session.picture,
    connectedAt: session.connectedAt,
    expiresAt: session.expiresAt,
  };
}

/**
 * Publishes a post to the member's personal LinkedIn profile using LinkedIn's Posts API
 * (`/rest/posts` with fallback to `/v2/ugcPosts`) and the member's OAuth access token + person URN.
 *
 * Image rule:
 *  - If `input.imageUrl` (manually uploaded to Cloudinary and attached to the topic/post) is provided,
 *    the binary image is uploaded to LinkedIn's Images/Assets API and attached as native image media.
 *  - If `input.imageUrl` is NOT provided, the post is sent WITHOUT an image (never falls back to AI images).
 */
export async function publishPostToLinkedInProfile(input: {
  text: string;
  imageUrl?: string;
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
  sessionOverride?: LinkedInAuthSession;
}): Promise<{
  success: boolean;
  postUrn?: string;
  url?: string;
  needsOAuth?: boolean;
  error?: string;
}> {
  const session = input.sessionOverride || (await getLinkedInAuthSession());
  if (!session) {
    return {
      success: false,
      needsOAuth: true,
      error:
        'LinkedIn account is not verified yet. Click "Verify with LinkedIn OAuth & Publish" to authorize and post.',
    };
  }

  const expTime = new Date(session.expiresAt).getTime();
  if (expTime <= Date.now()) {
    return {
      success: false,
      needsOAuth: true,
      error:
        'Your 60-day LinkedIn member access token has expired. Please run the LinkedIn OAuth verification flow to refresh it.',
    };
  }

  const authorUrn = session.personUrn.startsWith('urn:li:person:')
    ? session.personUrn
    : `urn:li:person:${session.personId}`;

  // If a manual Cloudinary image was attached to this LinkedIn post/topic, fetch its binary buffer once
  let attachedImageBuffer: Buffer | null = null;
  let attachedImageMime = 'image/jpeg';
  if (input.imageUrl && input.imageUrl.trim()) {
    const resolvedImageUrl = toLinkedInCompatibleImageUrl(input.imageUrl);
    try {
      const imgFetch = await fetch(resolvedImageUrl, {
        signal: AbortSignal.timeout(25000),
      });
      if (imgFetch.ok) {
        const arrBuf = await imgFetch.arrayBuffer();
        attachedImageBuffer = Buffer.from(arrBuf);
        const rawMime = (imgFetch.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
        attachedImageMime = rawMime === 'image/png' || rawMime === 'image/gif' ? rawMime : 'image/jpeg';
      } else {
        console.warn(`[linkedin.ts] Failed to fetch attached Cloudinary image (${imgFetch.status}): ${resolvedImageUrl}`);
      }
    } catch (err) {
      console.warn('[linkedin.ts] Error fetching attached Cloudinary image:', err);
    }
  }

  const linkedInVersion = getActiveLinkedInApiVersion();

  // 1. Attempt LinkedIn Official Posts API (`POST https://api.linkedin.com/rest/posts`)
  try {
    let restImageUrn: string | undefined;

    if (attachedImageBuffer) {
      try {
        const initRes = await fetch(
          'https://api.linkedin.com/rest/images?action=initializeUpload',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
              'LinkedIn-Version': linkedInVersion,
            },
            body: JSON.stringify({
              initializeUploadRequest: {
                owner: authorUrn,
              },
            }),
          }
        );

        if (initRes.ok) {
          const initData = await initRes.json();
          const uploadUrl = initData?.value?.uploadUrl;
          const imageUrn = initData?.value?.image;
          if (uploadUrl && imageUrn) {
            const putRes = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
                'Content-Type': attachedImageMime,
              },
              body: new Uint8Array(attachedImageBuffer),
            });
            if (putRes.ok || putRes.status === 201) {
              restImageUrn = imageUrn;
            } else {
              console.warn(`[linkedin.ts] /rest/images PUT failed (${putRes.status})`);
            }
          }
        } else {
          const errTxt = await initRes.text().catch(() => '');
          console.warn(`[linkedin.ts] /rest/images initializeUpload failed (${initRes.status}): ${errTxt.slice(0, 300)}`);
        }
      } catch (err) {
        console.warn('[linkedin.ts] /rest/images upload warning (will try /v2/assets fallback if needed):', err);
      }
    }

    // Only use /rest/posts right away if either no image was attached OR restImageUrn succeeded
    if (!attachedImageBuffer || restImageUrn) {
      const restPayload: Record<string, any> = {
        author: authorUrn,
        commentary: input.text,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      };

      if (restImageUrn) {
        restPayload.content = {
          media: {
            id: restImageUrn,
            title: input.articleTitle || 'Engineering Insights',
          },
        };
      }

      const restRes = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': linkedInVersion,
        },
        body: JSON.stringify(restPayload),
      });

      if (restRes.ok || restRes.status === 201) {
        const postUrn =
          restRes.headers.get('x-restli-id') ||
          restRes.headers.get('x-linkedin-id') ||
          '';
        return {
          success: true,
          postUrn,
          url: postUrn
            ? `https://www.linkedin.com/feed/update/${postUrn}`
            : 'https://www.linkedin.com/feed/',
        };
      } else {
        const restErr = await restRes.text().catch(() => '');
        console.warn(`[linkedin.ts] /rest/posts failed (${restRes.status}): ${restErr.slice(0, 300)}`);
      }
    }
  } catch (err) {
    console.warn('[linkedin.ts] /rest/posts fallback to /v2/ugcPosts:', err);
  }

  // 2. Fallback to LinkedIn `/v2/ugcPosts` endpoint (with `/v2/assets?action=registerUpload` if image is attached)
  let ugcAssetUrn: string | undefined;
  if (attachedImageBuffer) {
    try {
      const regRes = await fetch(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: authorUrn,
              serviceRelationships: [
                {
                  relationshipType: 'OWNER',
                  identifier: 'urn:li:userGeneratedContent',
                },
              ],
            },
          }),
        }
      );

      if (regRes.ok) {
        const regData = await regRes.json();
        const uploadUrl =
          regData?.value?.uploadMechanism?.[
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
          ]?.uploadUrl;
        const assetUrn = regData?.value?.asset;

        if (uploadUrl && assetUrn) {
          const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              'Content-Type': attachedImageMime,
            },
            body: new Uint8Array(attachedImageBuffer),
          });
          if (putRes.ok || putRes.status === 201) {
            ugcAssetUrn = assetUrn;
          }
        }
      }
    } catch (err) {
      console.warn('[linkedin.ts] /v2/assets image upload warning:', err);
    }
  }

  const ugcPayload: Record<string, any> = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: input.text },
        shareMediaCategory: ugcAssetUrn ? 'IMAGE' : 'NONE',
        ...(ugcAssetUrn
          ? {
              media: [
                {
                  status: 'READY',
                  media: ugcAssetUrn,
                  title: { text: input.articleTitle || 'Engineering Insights' },
                },
              ],
            }
          : {}),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const ugcRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(ugcPayload),
  });

  if (!ugcRes.ok) {
    const errText = await ugcRes.text();
    return {
      success: false,
      needsOAuth: ugcRes.status === 401 || ugcRes.status === 403,
      error: `LinkedIn Posts API (${ugcRes.status}): ${errText}`,
    };
  }

  const data = await ugcRes.json().catch(() => ({}));
  const postUrn = data?.id || ugcRes.headers.get('x-restli-id') || '';
  return {
    success: true,
    postUrn,
    url: postUrn
      ? `https://www.linkedin.com/feed/update/${postUrn}`
      : 'https://www.linkedin.com/feed/',
  };
}

export interface LinkedInCommentItem {
  id: string;
  actorUrn: string;
  authorName: string;
  text: string;
  createdAt: string;
}

/**
 * Attempts to fetch live comments & like count for a published LinkedIn post URN/URL
 * using the stored 60-day member access token.
 * Note: LinkedIn's standard "Share on LinkedIn" product grants `w_member_social` (write-only).
 * Reading comments via `/v2/socialActions/{urn}/comments` requires LinkedIn's Community Management API (`r_member_social`).
 * If LinkedIn returns 403/401, this gracefully reports `restricted: true` without throwing.
 */
export async function fetchLinkedInPostEngagement(postUrnOrUrl: string): Promise<{
  comments: LinkedInCommentItem[];
  likesCount: number;
  restricted?: boolean;
  message?: string;
}> {
  const session = await getLinkedInAuthSession();
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return {
      comments: [],
      likesCount: 0,
      restricted: true,
      message: 'LinkedIn OAuth session not connected or expired.',
    };
  }

  const urnMatch = postUrnOrUrl.match(/urn:li:(?:share|ugcPost|activity):[A-Za-z0-9_-]+/);
  const targetUrn = urnMatch ? urnMatch[0] : postUrnOrUrl.trim();
  if (!targetUrn.startsWith('urn:li:')) {
    return {
      comments: [],
      likesCount: 0,
      restricted: true,
      message: 'No valid LinkedIn post URN found on post.',
    };
  }

  const encodedUrn = encodeURIComponent(targetUrn);
  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
  };

  let likesCount = 0;
  try {
    const likesRes = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodedUrn}/likes?count=1`,
      { headers }
    );
    if (likesRes.ok) {
      const likesData = await likesRes.json();
      likesCount = likesData?.paging?.total ?? (Array.isArray(likesData?.elements) ? likesData.elements.length : 0);
    }
  } catch {
    // ignore
  }

  try {
    const commentsRes = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodedUrn}/comments?count=20`,
      { headers }
    );

    if (commentsRes.status === 401 || commentsRes.status === 403) {
      return {
        comments: [],
        likesCount,
        restricted: true,
        message:
          'LinkedIn API read-comments requires Community Management API (r_member_social). Standard Share on LinkedIn is write-only — paste LinkedIn comments manually in the LinkedIn panel.',
      };
    }

    if (!commentsRes.ok) {
      return {
        comments: [],
        likesCount,
        message: `LinkedIn comments endpoint returned HTTP ${commentsRes.status}.`,
      };
    }

    const data = await commentsRes.json();
    const elements = Array.isArray(data?.elements) ? data.elements : [];
    const comments: LinkedInCommentItem[] = elements
      .map((el: any, idx: number) => {
        const text = el?.message?.text || '';
        if (!text) return null;
        const actorUrn = String(el?.actor || '');
        const createdMs = el?.created?.time;
        return {
          id: String(el?.id || el?.$URN || `${targetUrn}-c-${idx}`),
          actorUrn,
          authorName: actorUrn ? `LinkedIn Member (${actorUrn.split(':').pop()})` : 'LinkedIn Member',
          text,
          createdAt: createdMs ? new Date(createdMs).toISOString() : new Date().toISOString(),
        };
      })
      .filter(Boolean) as LinkedInCommentItem[];

    return { comments, likesCount };
  } catch (err) {
    return {
      comments: [],
      likesCount,
      message: err instanceof Error ? err.message : 'Failed to fetch LinkedIn comments.',
    };
  }
}
