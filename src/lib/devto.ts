/**
 * Pure URL helper (browser & server safe):
 * Converts a Cloudinary URL (including .webp, .avif, or extensionless URLs)
 * into a DEV.to-guaranteed 1000x420 PNG URL ending with `.png`.
 */
export function toDevToCompatibleImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl || !imageUrl.trim()) return undefined;
  const trimmed = imageUrl.trim();

  const cloudMatch = trimmed.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:v\d+\/|[^/]+\/)*?([^?]+)$/
  );
  if (cloudMatch) {
    const uploadSplit = trimmed.split('/image/upload/');
    if (uploadSplit.length === 2) {
      const base = `${uploadSplit[0]}/image/upload`;
      let rest = uploadSplit[1].split('?')[0];

      const versionMatch = rest.match(/(?:^|\/)(v\d+\/.+)$/);
      if (versionMatch) {
        rest = versionMatch[1];
      }

      const withoutExt = rest.replace(/\.[a-zA-Z0-9]+$/, '');
      return `${base}/c_fill,w_1000,h_420,f_png,q_auto/${withoutExt}.png`;
    }
  }

  return trimmed;
}

export interface DevToArticle {
  id: number;
  title: string;
  slug: string;
  description: string;
  cover_image: string | null;
  social_image: string;
  published_at: string;
  reading_time_minutes: number;
  tag_list: string[];
  url: string;
  canonical_url: string;
  body_markdown?: string;
  body_html?: string;
  public_reactions_count?: number;
  comments_count?: number;
}

export interface DevToComment {
  id_code: string;
  created_at: string;
  body_html: string;
  user: {
    name: string;
    username: string;
    profile_image_90?: string;
  };
  children?: DevToComment[];
}

const BASE = 'https://dev.to/api';

function getDevToHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = process.env.DEVTO_API_KEY;
  if (apiKey) {
    headers['api-key'] = apiKey;
  }
  return headers;
}

function getDevToUsername(): string {
  return process.env.DEVTO_USERNAME || 'joebim';
}

function normalizeTags(item: any): string[] {
  if (Array.isArray(item.tag_list)) return item.tag_list;
  if (typeof item.tags === 'string')
    return item.tags
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  if (Array.isArray(item.tags)) return item.tags;
  if (typeof item.tag_list === 'string')
    return item.tag_list
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  return [];
}

/**
 * Strips leading YAML frontmatter from body_markdown if present so that
 * top-level JSON fields (`main_image`, `title`, `tags`, `description`)
 * are never overridden or ignored by Forem/DEV.to.
 */
function stripFrontmatter(md: string): string {
  if (!md) return '';
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
}

/**
 * Normalizes tags for DEV.to (lowercase alphanumeric only, max 4 tags).
 */
function sanitizeDevToTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 4);
}

export async function getArticles(): Promise<DevToArticle[]> {
  const username = getDevToUsername();
  const res = await fetch(`${BASE}/articles?username=${username}&per_page=30`, {
    headers: getDevToHeaders(),
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`DEV.to API error: ${res.status}`);
  const list = (await res.json()) as any[];
  return list.map((item) => ({
    ...item,
    tag_list: normalizeTags(item),
  }));
}

export async function getArticle(idOrSlug: string | number): Promise<DevToArticle> {
  const res = await fetch(`${BASE}/articles/${idOrSlug}`, {
    headers: getDevToHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`DEV.to API error: ${res.status}`);
  const data = (await res.json()) as any;
  return {
    ...data,
    tag_list: normalizeTags(data),
  };
}

/**
 * Publish a new article to DEV.to and pull back DEV.to's hosted cover_image.
 * Automatically transforms Cloudinary URLs into DEV.to-compatible 1000x420 PNG URLs.
 */
export async function publishToDevTo(article: {
  title: string;
  body_markdown: string;
  published?: boolean;
  main_image?: string;
  description?: string;
  tags?: string[];
}): Promise<DevToArticle | null> {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) return null;

  const compatibleMainImage = toDevToCompatibleImageUrl(article.main_image);
  const cleanMarkdown = stripFrontmatter(article.body_markdown);
  const cleanTags = sanitizeDevToTags(article.tags);

  const payload = {
    article: {
      title: article.title,
      body_markdown: cleanMarkdown,
      published: article.published ?? false,
      description: article.description,
      tags: cleanTags,
      ...(compatibleMainImage ? { main_image: compatibleMainImage } : {}),
    },
  };

  const res = await fetch(`${BASE}/articles`, {
    method: 'POST',
    headers: getDevToHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DEV.to publish error (${res.status}): ${errorText}`);
  }

  let data = (await res.json()) as any;

  // If main_image was provided but DEV.to is still processing cover_image asynchronously,
  // poll once after a short delay to pull the final DEV.to cover image storage URL.
  if (compatibleMainImage && !data.cover_image && data.id) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const refreshed = await getArticle(data.id);
      if (refreshed?.cover_image) {
        data = { ...data, cover_image: refreshed.cover_image, social_image: refreshed.social_image };
      }
    } catch {
      // ignore if draft isn't public yet
    }
  }

  return {
    ...data,
    cover_image: data.cover_image || compatibleMainImage || null,
    tag_list: normalizeTags(data),
  };
}

/**
 * Update an existing DEV.to article (including updating its cover image)
 * and pull back DEV.to's hosted cover_image URL.
 */
export async function updateDevToArticle(
  devtoId: number,
  article: {
    title?: string;
    body_markdown?: string;
    published?: boolean;
    main_image?: string;
    description?: string;
    tags?: string[];
  }
): Promise<DevToArticle | null> {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) return null;

  const compatibleMainImage = toDevToCompatibleImageUrl(article.main_image);
  const cleanMarkdown = article.body_markdown ? stripFrontmatter(article.body_markdown) : undefined;
  const cleanTags = article.tags ? sanitizeDevToTags(article.tags) : undefined;

  const payload = {
    article: {
      ...(article.title ? { title: article.title } : {}),
      ...(cleanMarkdown ? { body_markdown: cleanMarkdown } : {}),
      ...(article.published !== undefined ? { published: article.published } : {}),
      ...(article.description !== undefined ? { description: article.description } : {}),
      ...(cleanTags ? { tags: cleanTags } : {}),
      ...(compatibleMainImage !== undefined ? { main_image: compatibleMainImage } : {}),
    },
  };

  const res = await fetch(`${BASE}/articles/${devtoId}`, {
    method: 'PUT',
    headers: getDevToHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DEV.to update error (${res.status}): ${errorText}`);
  }

  let data = (await res.json()) as any;

  if (compatibleMainImage && !data.cover_image && data.id) {
    await new Promise((r) => setTimeout(r, 900));
    try {
      const refreshed = await getArticle(data.id);
      if (refreshed?.cover_image) {
        data = { ...data, cover_image: refreshed.cover_image, social_image: refreshed.social_image };
      }
    } catch {
      // non-fatal
    }
  }

  return {
    ...data,
    cover_image: data.cover_image || compatibleMainImage || null,
    tag_list: normalizeTags(data),
  };
}

/**
 * Fetch comments for a DEV.to article by its DEV.to numeric ID.
 */
export async function getDevToComments(articleId: number): Promise<DevToComment[]> {
  const res = await fetch(`${BASE}/comments?a_id=${articleId}`, {
    headers: getDevToHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Returns the best available cover image for an article */
export function articleCover(article: DevToArticle): string {
  return article.cover_image ?? article.social_image;
}
