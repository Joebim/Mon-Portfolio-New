import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';
import { crossPostArticle } from '../../../../../lib/controllers/blogController';
import { getMediumStatus } from '../../../../../lib/medium';

/**
 * POST /api/admin/blogs/crosspost
 * Body: { slug: string; platform: 'devto' | 'medium' }
 *
 * Cross-posts an existing Firestore blog to the specified platform.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { slug, platform } = (await request.json()) as { slug: string; platform: 'devto' | 'medium' };

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

