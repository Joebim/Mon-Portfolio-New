import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';
import { crossPostArticle } from '../../../../../lib/controllers/blogController';
import { getMediumStatus } from '../../../../../lib/medium';
import { toDevToCompatibleImageUrl } from '../../../../../lib/cloudinary';
import { publishToDevTo, updateDevToArticle } from '../../../../../lib/devto';

/**
 * POST /api/admin/blogs/crosspost
 * Supports:
 * 1) { slug: string; platform: 'devto' | 'medium' } — Cross-posts an existing Firestore blog
 * 2) { action: 'sync-cover'; coverImage: string; devtoId?: number; title?: string; bodyMarkdown?: string; description?: string; tags?: string[] }
 *    — Converts a Cloudinary image to DEV.to 1000x420 PNG format, uploads/attaches it to DEV.to cover image storage,
 *      and returns DEV.to's hosted cover_image URL to pull directly into the Cover Image field.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (body.action === 'sync-cover') {
      const rawUrl = body.coverImage as string | undefined;
      if (!rawUrl || !rawUrl.trim()) {
        return NextResponse.json({ error: 'Cover image URL is required.' }, { status: 400 });
      }

      const compatibleUrl = toDevToCompatibleImageUrl(rawUrl) || rawUrl.trim();

      // If DEV.to API key is available, push to DEV.to cover storage and pull back DEV.to's hosted cover_image URL
      if (process.env.DEVTO_API_KEY) {
        if (body.devtoId) {
          const updated = await updateDevToArticle(Number(body.devtoId), {
            main_image: compatibleUrl,
          });
          const pulled = updated?.cover_image || updated?.social_image || compatibleUrl;
          return NextResponse.json({
            success: true,
            coverImage: pulled,
            devtoId: updated?.id || body.devtoId,
            devtoUrl: updated?.url,
            source: updated?.cover_image ? 'devto-storage' : 'cloudinary-devto-compatible',
          });
        } else if (body.title && body.bodyMarkdown) {
          // Create a draft on DEV.to to ingest the image into DEV.to cover storage
          const draft = await publishToDevTo({
            title: body.title,
            body_markdown: body.bodyMarkdown,
            published: false,
            description: body.description || '',
            tags: Array.isArray(body.tags) ? body.tags : [],
            main_image: compatibleUrl,
          });
          const pulled = draft?.cover_image || draft?.social_image || compatibleUrl;
          return NextResponse.json({
            success: true,
            coverImage: pulled,
            devtoId: draft?.id,
            devtoUrl: draft?.url,
            source: draft?.cover_image ? 'devto-storage' : 'cloudinary-devto-compatible',
          });
        }
      }

      return NextResponse.json({
        success: true,
        coverImage: compatibleUrl,
        source: 'cloudinary-devto-compatible',
      });
    }

    const { slug, platform } = body as { slug: string; platform: 'devto' | 'medium' };

    if (!slug || !platform) {
      return NextResponse.json({ error: 'Missing slug or platform' }, { status: 400 });
    }
    if (platform !== 'devto' && platform !== 'medium') {
      return NextResponse.json({ error: 'Invalid platform. Use "devto" or "medium".' }, { status: 400 });
    }

    const result = await crossPostArticle(slug, platform);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /api/admin/blogs/crosspost] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cross-post failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/blogs/crosspost
 * Returns platform connection status (DEV.to + Medium).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const devtoConfigured = !!process.env.DEVTO_API_KEY;
  const mediumStatus = await getMediumStatus();

  return NextResponse.json({
    devto: {
      connected: devtoConfigured,
      username: devtoConfigured ? (process.env.DEVTO_USERNAME ?? 'joebim') : undefined,
    },
    medium: mediumStatus,
  });
}
