import { getFirestoreDb } from '../firebase-admin';
import { getArticles, getArticle, articleCover, publishToDevTo, type DevToArticle } from '../devto';
import { publishToMedium } from '../medium';
import { BlogArticleSchema, type BlogArticle } from '../schemas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function devToToBlogArticle(article: DevToArticle): BlogArticle {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    description: article.description,
    coverImage: articleCover(article),
    socialImage: article.social_image,
    publishedAt: article.published_at,
    readingTimeMinutes: article.reading_time_minutes,
    tagList: article.tag_list,
    url: article.url,
    canonicalUrl: article.canonical_url,
    bodyMarkdown: article.body_markdown ?? '',
    isDraft: false,
    devtoId: article.id,
    devtoUrl: article.url,
    publishedTo: ['devto'],
  };
}

function generateSlug(title: string): string {
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
// Create — cross-posts to DEV.to + Medium
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
  publishTo?: Array<'devto' | 'medium'>;
}

export interface CreateBlogResult {
  article: BlogArticle;
  devto: { success: boolean; url?: string; error?: string };
  medium: { success: boolean; url?: string; error?: string };
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
  const publishTo = input.publishTo ?? ['devto', 'medium'];
  const shouldPublish = !input.isDraft;

  const article: BlogArticle = {
    id: slug,
    slug,
    title: input.title,
    description: input.description,
    bodyMarkdown: input.bodyMarkdown,
    tagList: input.tagList ?? [],
    coverImage: input.coverImage,
    publishedAt: now,
    readingTimeMinutes: Math.max(1, Math.ceil(input.bodyMarkdown.split(/\s+/).length / 200)),
    isDraft: input.isDraft ?? false,
    publishedTo: ['portfolio'],
  };

  const result: CreateBlogResult = {
    article,
    devto: { success: false },
    medium: { success: false },
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
        main_image: input.coverImage,
      });
      if (devtoPost) {
        article.devtoId = devtoPost.id;
        article.devtoUrl = devtoPost.url;
        article.url = devtoPost.url;
        article.canonicalUrl = devtoPost.canonical_url || devtoPost.url;
        article.publishedTo = [...(article.publishedTo ?? []), 'devto'];
        result.devto = { success: true, url: devtoPost.url };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[blogController] DEV.to publish failed:', msg);
      result.devto = { success: false, error: msg };
    }
  }

  // --- Medium ---
  if (publishTo.includes('medium')) {
    try {
      const mediumPost = await publishToMedium({
        title: input.title,
        contentFormat: 'markdown',
        content: input.bodyMarkdown,
        tags: input.tagList?.slice(0, 5),
        portfolioSlug: slug,
        canonicalUrl: article.canonicalUrl,
        publishStatus: shouldPublish ? 'public' : 'draft',
      });
      if (mediumPost) {
        article.mediumId = mediumPost.id;
        article.mediumUrl = mediumPost.url;
        article.publishedTo = [...(article.publishedTo ?? []), 'medium'];
        result.medium = { success: true, url: mediumPost.url };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[blogController] Medium publish failed:', msg);
      result.medium = { success: false, error: msg };
    }
  }

  // --- Save to Firestore ---
  const validated = BlogArticleSchema.parse(article);
  result.article = validated;
  await db.collection('blogs').doc(slug).set(JSON.parse(JSON.stringify(validated)), { merge: true });

  return result;
}

// ---------------------------------------------------------------------------
// Save (update existing)
// ---------------------------------------------------------------------------

export async function saveBlogArticle(data: unknown): Promise<BlogArticle> {
  const validated = BlogArticleSchema.parse(data);
  const db = getFirestoreDb();
  if (!db) {
    throw new Error(
      'Firestore is not configured. Provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }
  const docRef = db.collection('blogs').doc(String(validated.slug));
  await docRef.set(JSON.parse(JSON.stringify(validated)), { merge: true });
  return validated;
}

// ---------------------------------------------------------------------------
// Publish to specific platform (for existing articles)
// ---------------------------------------------------------------------------

export async function crossPostArticle(
  slug: string,
  platform: 'devto' | 'medium'
): Promise<{ success: boolean; url?: string; error?: string }> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore not configured');

  const snapshot = await db.collection('blogs').where('slug', '==', slug).limit(1).get();
  if (snapshot.empty) throw new Error(`Blog "${slug}" not found`);

  const article = snapshot.docs[0].data() as BlogArticle;

  if (platform === 'devto') {
    if (!article.bodyMarkdown) throw new Error('Blog has no markdown body');
    const post = await publishToDevTo({
      title: article.title,
      body_markdown: article.bodyMarkdown,
      published: !article.isDraft,
      description: article.description,
      tags: article.tagList?.slice(0, 4),
      main_image: article.coverImage,
    });
    if (!post) return { success: false, error: 'DEVTO_API_KEY not configured' };
    await db.collection('blogs').doc(slug).update({
      devtoId: post.id,
      devtoUrl: post.url,
      publishedTo: [...new Set([...(article.publishedTo ?? []), 'devto'])],
    });
    return { success: true, url: post.url };
  }

  if (platform === 'medium') {
    if (!article.bodyMarkdown) throw new Error('Blog has no markdown body');
    const post = await publishToMedium({
      title: article.title,
      contentFormat: 'markdown',
      content: article.bodyMarkdown,
      tags: article.tagList?.slice(0, 5),
      portfolioSlug: slug,
      canonicalUrl: article.canonicalUrl,
      publishStatus: article.isDraft ? 'draft' : 'public',
    });
    if (!post) return { success: false, error: 'MEDIUM_INTEGRATION_TOKEN not configured' };
    await db.collection('blogs').doc(slug).update({
      mediumId: post.id,
      mediumUrl: post.url,
      publishedTo: [...new Set([...(article.publishedTo ?? []), 'medium'])],
    });
    return { success: true, url: post.url };
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

  return { count: articles.length, articles };
}
