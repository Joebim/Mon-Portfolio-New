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
  if (typeof item.tags === 'string') return item.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
  if (Array.isArray(item.tags)) return item.tags;
  if (typeof item.tag_list === 'string') return item.tag_list.split(',').map((s: string) => s.trim()).filter(Boolean);
  return [];
}

export async function getArticles(): Promise<DevToArticle[]> {
  const username = getDevToUsername();
  const res = await fetch(`${BASE}/articles?username=${username}&per_page=30`, {
    headers: getDevToHeaders(),
    next: { revalidate: 3600 },
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
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`DEV.to API error: ${res.status}`);
  const data = (await res.json()) as any;
  return {
    ...data,
    tag_list: normalizeTags(data),
  };
}

/**
 * Publish or update an article directly to DEV.to if DEVTO_API_KEY is configured.
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

  const res = await fetch(`${BASE}/articles`, {
    method: 'POST',
    headers: getDevToHeaders(),
    body: JSON.stringify({ article }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DEV.to publish error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as any;
  return {
    ...data,
    tag_list: normalizeTags(data),
  };
}

/** Returns the best available cover image for an article */
export function articleCover(article: DevToArticle): string {
  return article.cover_image ?? article.social_image;
}

