import { revalidatePath } from 'next/cache';
import { getFirestoreDb } from '../firebase-admin';
import {
  getArticles,
  getArticle,
  articleCover,
  publishToDevTo,
  updateDevToArticle,
  type DevToArticle,
} from '../devto';
import { toDevToCompatibleImageUrl } from '../cloudinary';
import { getMediumArticles } from '../medium';
import { sendArticleToSubscribers } from './newsletterController';
import { getPortfolioContent, updatePortfolioContent } from './portfolioController';
import { BlogArticleSchema, type BlogArticle } from '../schemas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Automatically updates the Featured Blog Post (`latestArticle`) on the Hero / Header page
 * whenever a blog is created, published, cross-posted to DEV.to, or synced from DEV.to.
 */
export async function syncLatestArticleToHero(article: BlogArticle): Promise<void> {
  if (article.isDraft) return;
  try {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://josephakinwole.com').replace(/\/$/, '');
    const formattedDate = new Date(article.publishedAt || Date.now())
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .toUpperCase();

    const latestArticle = {
      id: article.devtoId || article.id,
      slug: article.slug,
      title: article.title,
      description: article.description,
      platform:
        article.devtoUrl || (article.publishedTo || []).includes('devto')
          ? 'DEV.TO'
          : 'BLOG',
      readingTime: `${article.readingTimeMinutes || 5} MIN READ`,
      publishedAt: article.publishedAt,
      date: formattedDate,
      tags: article.tagList || [],
      url: article.devtoUrl || article.url || `${siteUrl}/blog/${article.slug}`,
      coverImage: article.coverImage,
    };

    const current = await getPortfolioContent();
    await updatePortfolioContent({
      ...current.data,
      latestArticle,
    });

    try {
      revalidatePath('/');
      revalidatePath('/blog');
    } catch {
      // ignore if outside Next.js request context
    }
  } catch (err) {
    console.warn('[blogController] syncLatestArticleToHero warning:', err);
  }
}

function devToToBlogArticle(article: DevToArticle): BlogArticle {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    description: article.description,
    coverImage: articleCover(article),
    socialImage: article.social_image,
    publishedAt: article.published_at || new Date().toISOString(),
    readingTimeMinutes: article.reading_time_minutes || 5,
    tagList: article.tag_list,
    url: article.url,
    canonicalUrl: article.canonical_url,
    bodyMarkdown: article.body_markdown ?? '',
    isDraft: !article.published_at,
    devtoId: article.id,
    devtoUrl: article.url,
    publishedTo: ['devto'],
  };
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function withTimeout<T>(promise: Promise<T>, ms = 4000, label = 'Firestore operation'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getAllBlogArticles(): Promise<{
  source: 'firestore' | 'devto';
  articles: BlogArticle[];
}> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const snapshot = await withTimeout(
        db.collection('blogs').orderBy('publishedAt', 'desc').get(),
        4000,
        'Firestore blogs query'
      );
      if (!snapshot.empty) {
        const articles: BlogArticle[] = [];
        snapshot.forEach((doc) => {
          const parsed = BlogArticleSchema.safeParse(doc.data());
          if (parsed.success) articles.push(parsed.data);
        });
        if (articles.length > 0) return { source: 'firestore', articles };
      }
    } catch (err) {
      console.warn('[blogController] Firestore query failed, falling back to DEV.to:', err);
    }
  }

  try {
    const devToArticles = await withTimeout(getArticles(), 4000, 'DEV.to articles fetch');
    return { source: 'devto', articles: devToArticles.map(devToToBlogArticle) };
  } catch (err) {
    console.error('[blogController] Failed to fetch articles:', err);
    return { source: 'devto', articles: [] };
  }
}

export async function getBlogArticleBySlug(slug: string): Promise<BlogArticle | null> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const snapshot = await withTimeout(
        db.collection('blogs').where('slug', '==', slug).limit(1).get(),
        4000,
        'Firestore blog slug query'
      );
      if (!snapshot.empty) {
        const parsed = BlogArticleSchema.safeParse(snapshot.docs[0].data());
        if (parsed.success) return parsed.data;
      }
    } catch (err) {
      console.warn('[blogController] Firestore slug query failed:', err);
    }
  }

  // Fallback to DEV.to
  try {
    const list = await withTimeout(getArticles(), 4000, 'DEV.to articles fetch');
    const meta = list.find((a) => a.slug === slug);
    if (!meta) return null;
    const full = await withTimeout(getArticle(meta.id), 4000, 'DEV.to single article fetch');
    return devToToBlogArticle(full);
  } catch (err) {
    console.error(`[blogController] Error fetching blog slug "${slug}":`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Create — cross-posts to DEV.to and pulls DEV.to cover image back
// ---------------------------------------------------------------------------

export interface CreateBlogInput {
  title: string;
  description: string;
  bodyMarkdown: string;
  tagList?: string[];
  coverImage?: string;
  isDraft?: boolean;
  /** Override slug (auto-generated from title if omitted) */
  slug?: string;
  /** Which platforms to publish to in addition to Firestore */
  publishTo?: Array<'devto'>;
}

export interface CreateBlogResult {
  article: BlogArticle;
  devto: { success: boolean; url?: string; coverImage?: string; error?: string };
  newsletter?: { success: boolean; sentCount: number; provider: string; error?: string };
}

export async function createBlogArticle(input: CreateBlogInput): Promise<CreateBlogResult> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error(
      'Firestore is not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to .env.local.'
    );
  }

  const slug = input.slug || generateSlug(input.title);
  const now = new Date().toISOString();
  const publishTo = input.publishTo ?? ['devto'];
  const shouldPublish = !input.isDraft;

  // Normalize Cloudinary cover image for DEV.to compatibility
  const compatibleCover = toDevToCompatibleImageUrl(input.coverImage);

  const article: BlogArticle = {
    id: slug,
    slug,
    title: input.title,
    description: input.description,
    bodyMarkdown: input.bodyMarkdown,
    tagList: input.tagList ?? [],
    coverImage: compatibleCover || input.coverImage,
    publishedAt: now,
    readingTimeMinutes: Math.max(1, Math.ceil(input.bodyMarkdown.split(/\s+/).length / 200)),
    isDraft: input.isDraft ?? false,
    publishedTo: ['portfolio'],
  };

  const result: CreateBlogResult = {
    article,
    devto: { success: false },
  };

  // --- DEV.to ---
  if (publishTo.includes('devto')) {
    try {
      const devtoPost = await publishToDevTo({
        title: input.title,
        body_markdown: input.bodyMarkdown,
        published: shouldPublish,
        description: input.description,
        tags: input.tagList?.slice(0, 4),
        main_image: compatibleCover,
      });
      if (devtoPost) {
        article.devtoId = devtoPost.id;
        article.devtoUrl = devtoPost.url;
        article.url = devtoPost.url;
        article.canonicalUrl = devtoPost.canonical_url || devtoPost.url;
        // Pull DEV.to's cover image storage URL directly back into our coverImage & socialImage fields!
        const devtoHostedCover = devtoPost.cover_image || devtoPost.social_image || compatibleCover;
        if (devtoHostedCover) {
          article.coverImage = devtoHostedCover;
        }
        if (devtoPost.social_image) {
          article.socialImage = devtoPost.social_image;
        }
        article.publishedTo = Array.from(new Set([...(article.publishedTo ?? []), 'devto']));
        result.devto = {
          success: true,
          url: devtoPost.url,
          coverImage: article.coverImage,
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[blogController] DEV.to publish failed:', msg);
      result.devto = { success: false, error: msg };
    }
  }

  // --- Immediately dispatch Newsletter to the subscriber email list when published ---
  if (shouldPublish) {
    try {
      const newsRes = await sendArticleToSubscribers(article);
      result.newsletter = newsRes;
      if (newsRes.success) {
        article.newsletterSentAt = new Date().toISOString();
      }
    } catch (err) {
      console.warn('[blogController] Immediate newsletter dispatch warning:', err);
    }
  }

  // --- Save to Firestore ---
  const validated = BlogArticleSchema.parse(article);
  result.article = validated;
  await db.collection('blogs').doc(slug).set(JSON.parse(JSON.stringify(validated)), { merge: true });

  // --- Automatically update Featured Blog Post on the Hero / Header page ---
  if (shouldPublish) {
    await syncLatestArticleToHero(validated);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Save (update existing) — also updates/publishes DEV.to and dispatches newsletter if newly published
// ---------------------------------------------------------------------------

export async function saveBlogArticle(data: unknown): Promise<BlogArticle> {
  const parsed = BlogArticleSchema.parse(data);
  const db = getFirestoreDb();
  if (!db) {
    throw new Error(
      'Firestore is not configured. Provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  const compatibleCover = toDevToCompatibleImageUrl(parsed.coverImage);
  if (compatibleCover) {
    parsed.coverImage = compatibleCover;
  }

  // Sync updates or newly-published draft to DEV.to and pull back DEV.to's cover URL
  if (parsed.bodyMarkdown) {
    try {
      if (parsed.devtoId) {
        const updatedDevTo = await updateDevToArticle(parsed.devtoId, {
          title: parsed.title,
          body_markdown: parsed.bodyMarkdown,
          published: !parsed.isDraft,
          description: parsed.description,
          tags: parsed.tagList?.slice(0, 4),
          main_image: compatibleCover,
        });
        if (updatedDevTo) {
          if (updatedDevTo.cover_image) parsed.coverImage = updatedDevTo.cover_image;
          if (updatedDevTo.social_image) parsed.socialImage = updatedDevTo.social_image;
          if (updatedDevTo.url) parsed.devtoUrl = updatedDevTo.url;
        }
      } else if (!parsed.isDraft) {
        const publishedDevTo = await publishToDevTo({
          title: parsed.title,
          body_markdown: parsed.bodyMarkdown,
          published: true,
          description: parsed.description,
          tags: parsed.tagList?.slice(0, 4),
          main_image: compatibleCover,
        });
        if (publishedDevTo) {
          parsed.devtoId = publishedDevTo.id;
          parsed.devtoUrl = publishedDevTo.url;
          if (publishedDevTo.cover_image) parsed.coverImage = publishedDevTo.cover_image;
          if (publishedDevTo.social_image) parsed.socialImage = publishedDevTo.social_image;
          parsed.publishedTo = Array.from(new Set([...(parsed.publishedTo ?? []), 'devto']));
        }
      }
    } catch (err) {
      console.warn('[blogController] DEV.to sync skipped/failed during save:', err);
    }
  }

  // If this article is now published (!isDraft) and hasn't been sent to the newsletter list yet, send immediately!
  if (!parsed.isDraft && !parsed.newsletterSentAt) {
    try {
      const newsRes = await sendArticleToSubscribers(parsed);
      if (newsRes.success) {
        parsed.newsletterSentAt = new Date().toISOString();
      }
    } catch (err) {
      console.warn('[blogController] Immediate newsletter send during save skipped:', err);
    }
  }

  const docRef = db.collection('blogs').doc(String(parsed.slug));
  await docRef.set(JSON.parse(JSON.stringify(parsed)), { merge: true });

  if (!parsed.isDraft) {
    await syncLatestArticleToHero(parsed);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Publish / Sync to specific platform (for existing articles)
// ---------------------------------------------------------------------------

export async function crossPostArticle(
  slug: string,
  platform: 'devto' | 'medium'
): Promise<{
  success: boolean;
  url?: string;
  coverImage?: string;
  devtoId?: number;
  newsletterSentCount?: number;
  error?: string;
}> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore not configured');

  const snapshot = await db.collection('blogs').where('slug', '==', slug).limit(1).get();
  if (snapshot.empty) throw new Error(`Blog "${slug}" not found`);

  const article = snapshot.docs[0].data() as BlogArticle;

  if (platform === 'devto') {
    if (!article.bodyMarkdown) throw new Error('Blog has no markdown body');
    const compatibleCover = toDevToCompatibleImageUrl(article.coverImage);

    const post = article.devtoId
      ? await updateDevToArticle(article.devtoId, {
          title: article.title,
          body_markdown: article.bodyMarkdown,
          published: !article.isDraft,
          description: article.description,
          tags: article.tagList?.slice(0, 4),
          main_image: compatibleCover,
        })
      : await publishToDevTo({
          title: article.title,
          body_markdown: article.bodyMarkdown,
          published: !article.isDraft,
          description: article.description,
          tags: article.tagList?.slice(0, 4),
          main_image: compatibleCover,
        });

    if (!post) return { success: false, error: 'DEVTO_API_KEY not configured' };

    const pulledCover = post.cover_image || post.social_image || compatibleCover || article.coverImage;
    const updatedArticle: BlogArticle = {
      ...article,
      devtoId: post.id,
      devtoUrl: post.url,
      ...(pulledCover ? { coverImage: pulledCover } : {}),
      ...(post.social_image ? { socialImage: post.social_image } : {}),
      publishedTo: Array.from(new Set([...(article.publishedTo ?? []), 'devto' as const])),
    };

    // Immediately send newsletter to subscribers if published and not yet emailed
    let newsletterSentCount: number | undefined;
    if (!updatedArticle.isDraft && !updatedArticle.newsletterSentAt) {
      try {
        const newsRes = await sendArticleToSubscribers(updatedArticle);
        if (newsRes.success) {
          updatedArticle.newsletterSentAt = new Date().toISOString();
          newsletterSentCount = newsRes.sentCount;
        }
      } catch (err) {
        console.warn('[blogController] Newsletter dispatch after DEV.to cross-post warning:', err);
      }
    }

    await db.collection('blogs').doc(slug).update({
      devtoId: post.id,
      devtoUrl: post.url,
      ...(pulledCover ? { coverImage: pulledCover } : {}),
      ...(post.social_image ? { socialImage: post.social_image } : {}),
      ...(updatedArticle.newsletterSentAt ? { newsletterSentAt: updatedArticle.newsletterSentAt } : {}),
      publishedTo: updatedArticle.publishedTo,
    });

    if (!updatedArticle.isDraft) {
      await syncLatestArticleToHero(updatedArticle);
    }

    return {
      success: true,
      url: post.url,
      devtoId: post.id,
      coverImage: pulledCover,
      newsletterSentCount,
    };
  }

  if (platform === 'medium') {
    return {
      success: false,
      error: 'Publishing directly to Medium is disabled. Use "Sync Medium" to pull your published Medium articles.',
    };
  }

  throw new Error(`Unknown platform: ${platform}`);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteBlogArticle(slug: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not configured.');
  await db.collection('blogs').doc(slug).delete();
  return true;
}

// ---------------------------------------------------------------------------
// Sync from DEV.to → Firestore
// ---------------------------------------------------------------------------

export async function syncFromDevTo(): Promise<{ count: number; articles: BlogArticle[] }> {
  const devToArticles = await getArticles();
  const articles: BlogArticle[] = [];

  for (const item of devToArticles) {
    try {
      const full = await getArticle(item.id);
      articles.push(devToToBlogArticle(full));
    } catch {
      articles.push(devToToBlogArticle(item));
    }
  }

  const db = getFirestoreDb();
  if (db) {
    const batch = db.batch();
    for (const article of articles) {
      const ref = db.collection('blogs').doc(article.slug);
      batch.set(ref, JSON.parse(JSON.stringify(article)), { merge: true });
    }
    await batch.commit();
  }

  // Automatically update Hero Featured Blog Post with the newest synced DEV.to article
  if (articles.length > 0) {
    const newest = [...articles]
      .filter((a) => !a.isDraft)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];
    if (newest) {
      await syncLatestArticleToHero(newest);
    }
  }

  return { count: articles.length, articles };
}

// ---------------------------------------------------------------------------
// Sync from Medium → Firestore (Pull only)
// ---------------------------------------------------------------------------

export async function syncFromMedium(username?: string): Promise<{ count: number; articles: BlogArticle[] }> {
  const articles = await getMediumArticles(username);

  // Ensure every synced Medium article cover image is mirrored to Cloudinary (if configured)
  // so the image is reliably persisted alongside the article and never broken by Medium CDN hotlink limits.
  const { isCloudinaryConfigured, uploadToCloudinary } = await import('../cloudinary');
  if (isCloudinaryConfigured()) {
    for (const article of articles) {
      if (article.coverImage && !article.coverImage.includes('res.cloudinary.com')) {
        try {
          const uploaded = await uploadToCloudinary(article.coverImage, {
            folder: 'portfolio/blogs',
            tags: ['portfolio', 'medium-sync', 'blog-cover'],
            context: { alt: article.title, caption: 'Synced from Medium' },
          });
          article.coverImage = uploaded.secureUrl;
        } catch (err) {
          console.warn(`[blogController] Medium cover Cloudinary mirror warning for "${article.slug}":`, err);
        }
      }
    }
  }

  const db = getFirestoreDb();
  if (db && articles.length > 0) {
    const batch = db.batch();
    for (const article of articles) {
      const ref = db.collection('blogs').doc(article.slug);
      batch.set(ref, JSON.parse(JSON.stringify(article)), { merge: true });
    }
    await batch.commit();
  }

  // Automatically update Hero Featured Blog Post with the newest synced article
  if (articles.length > 0) {
    const newest = [...articles]
      .filter((a) => !a.isDraft)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];
    if (newest) {
      await syncLatestArticleToHero(newest);
    }
  }

  return { count: articles.length, articles };
}
