/**
 * Medium API v1 client
 * Docs: https://github.com/Medium/medium-api-docs
 *
 * Setup:
 *  1. Medium → Settings → Security and apps → Integration tokens → Generate
 *  2. Add MEDIUM_INTEGRATION_TOKEN to .env.local
 *  3. The first call auto-fetches and caches your authorId
 */

const BASE = 'https://api.medium.com/v1';

export type MediumPublishStatus = 'public' | 'draft' | 'unlisted';

export interface MediumPost {
  id: string;
  title: string;
  authorId: string;
  url: string;
  canonicalUrl?: string;
  publishStatus: MediumPublishStatus;
  publishedAt?: string;
  tags?: string[];
}

export interface MediumPublishOptions {
  title: string;
  contentFormat: 'markdown' | 'html';
  content: string;
  tags?: string[];
  canonicalUrl?: string;
  publishStatus?: MediumPublishStatus;
  /** Portfolio slug to use as canonical URL if canonicalUrl not set */
  portfolioSlug?: string;
}

function getMediumToken(): string | null {
  return process.env.MEDIUM_INTEGRATION_TOKEN ?? null;
}

function getMediumHeaders(): HeadersInit {
  const token = getMediumToken();
  if (!token) throw new Error('MEDIUM_INTEGRATION_TOKEN is not set');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/** Cached author ID to avoid repeated /me calls */
let _cachedAuthorId: string | null = null;

export async function getMediumAuthorId(): Promise<string> {
  if (_cachedAuthorId) return _cachedAuthorId;

  const res = await fetch(`${BASE}/me`, { headers: getMediumHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Medium /me error (${res.status}): ${body}`);
  }
  const json = await res.json() as { data: { id: string; username: string } };
  _cachedAuthorId = json.data.id;
  return _cachedAuthorId;
}

/**
 * Publish a post to Medium.
 * Returns null if MEDIUM_INTEGRATION_TOKEN is not set (graceful no-op).
 */
export async function publishToMedium(opts: MediumPublishOptions): Promise<MediumPost | null> {
  if (!getMediumToken()) return null;

  const authorId = await getMediumAuthorId();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://josephakinwole.dev';
  const canonicalUrl =
    opts.canonicalUrl ||
    (opts.portfolioSlug ? `${siteUrl}/blog/${opts.portfolioSlug}` : undefined);

  const body: Record<string, unknown> = {
    title: opts.title,
    contentFormat: opts.contentFormat,
    content: opts.content,
    publishStatus: opts.publishStatus ?? 'public',
  };
  if (opts.tags?.length) body.tags = opts.tags.slice(0, 5); // Medium max 5 tags
  if (canonicalUrl) body.canonicalUrl = canonicalUrl;

  const res = await fetch(`${BASE}/users/${authorId}/posts`, {
    method: 'POST',
    headers: getMediumHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Medium publish error (${res.status}): ${errorText}`);
  }

  const json = await res.json() as { data: MediumPost };
  return json.data;
}

/**
 * Verify the Medium token is valid and return basic user info.
 * Useful for admin dashboard status checks.
 */
export async function getMediumStatus(): Promise<{ connected: boolean; username?: string; id?: string }> {
  if (!getMediumToken()) return { connected: false };
  try {
    const authorId = await getMediumAuthorId();
    const res = await fetch(`${BASE}/me`, { headers: getMediumHeaders() });
    const json = await res.json() as { data: { id: string; username: string } };
    return { connected: true, username: json.data.username, id: authorId };
  } catch {
    return { connected: false };
  }
}

