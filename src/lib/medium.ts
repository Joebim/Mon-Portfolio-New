/**
 * Medium RSS & Feed client (Pull / Sync only)
 * Medium deprecated programmatic post creation for individual accounts.
 * This client pulls public published articles via Medium's RSS feed.
 */

import { BlogArticleSchema, type BlogArticle } from './schemas';

export interface MediumFeedItem {
  title: string;
  link: string;
  guid?: string;
  pubDate: string;
  author?: string;
  thumbnail?: string;
  description?: string;
  content?: string;
  categories?: string[];
}

export function getMediumUsername(): string {
  const raw = process.env.MEDIUM_USERNAME || 'joebim';
  return raw.replace(/^@/, '').trim();
}

export async function getMediumStatus(): Promise<{ connected: boolean; username: string }> {
  const username = getMediumUsername();
  return {
    connected: Boolean(username),
    username,
  };
}

function cleanHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirstImage(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/**
 * Fetch published Medium articles for the specified (or environment) username.
 * Tries rss2json first for clean structured data, then falls back to direct RSS XML parsing.
 */
export async function getMediumArticles(customUsername?: string): Promise<BlogArticle[]> {
  const username = (customUsername || getMediumUsername()).replace(/^@/, '').trim();
  if (!username) return [];

  const feedUrl = `https://medium.com/feed/@${username}`;
  const articles: BlogArticle[] = [];

  // Attempt 1: rss2json public endpoint
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as { status: string; items: MediumFeedItem[] };
      if (data.status === 'ok' && Array.isArray(data.items)) {
        for (const item of data.items) {
          const rawContent = item.content || item.description || '';
          const plainText = cleanHtmlToText(rawContent);
          const coverImage = item.thumbnail || extractFirstImage(rawContent);
          const title = item.title || 'Untitled Article';
          const slug = slugify(title);

          const article: BlogArticle = {
            id: `medium-${slug}`,
            slug,
            title,
            description: plainText.slice(0, 240) + (plainText.length > 240 ? '…' : ''),
            coverImage: coverImage || undefined,
            publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            readingTimeMinutes: Math.max(1, Math.ceil(plainText.split(/\s+/).length / 200)),
            tagList: item.categories || [],
            url: item.link,
            canonicalUrl: item.link,
            bodyMarkdown: rawContent,
            isDraft: false,
            mediumId: item.guid || slug,
            mediumUrl: item.link,
            publishedTo: ['medium'],
          };

          const validated = BlogArticleSchema.safeParse(article);
          if (validated.success) {
            articles.push(validated.data);
          }
        }
        if (articles.length > 0) return articles;
      }
    }
  } catch (err) {
    console.warn('[medium] rss2json fetch failed, falling back to direct RSS:', err);
  }

  // Attempt 2: Direct RSS fetch + lightweight regex parser
  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`[medium] Direct RSS feed returned status ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];

      const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const contentMatch = itemContent.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/);
      const guidMatch = itemContent.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);

      const title = (titleMatch ? titleMatch[1].trim() : 'Untitled Article')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');

      const link = linkMatch ? linkMatch[1].trim() : '';
      const rawContent = contentMatch ? contentMatch[1].trim() : '';
      const plainText = cleanHtmlToText(rawContent);
      const coverImage = extractFirstImage(rawContent);
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
      const guid = guidMatch ? guidMatch[1].trim() : '';
      const slug = slugify(title);

      // Collect categories/tags
      const categories: string[] = [];
      const catRegex = /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g;
      let catMatch: RegExpExecArray | null;
      while ((catMatch = catRegex.exec(itemContent)) !== null) {
        categories.push(catMatch[1].trim());
      }

      const article: BlogArticle = {
        id: `medium-${slug}`,
        slug,
        title,
        description: plainText.slice(0, 240) + (plainText.length > 240 ? '…' : ''),
        coverImage: coverImage || undefined,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        readingTimeMinutes: Math.max(1, Math.ceil(plainText.split(/\s+/).length / 200)),
        tagList: categories,
        url: link,
        canonicalUrl: link,
        bodyMarkdown: rawContent,
        isDraft: false,
        mediumId: guid || slug,
        mediumUrl: link,
        publishedTo: ['medium'],
      };

      const validated = BlogArticleSchema.safeParse(article);
      if (validated.success) {
        articles.push(validated.data);
      }
    }
  } catch (err) {
    console.error('[medium] Failed to parse Medium RSS feed:', err);
  }

  return articles;
}
