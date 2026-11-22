import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import {
  getAllBlogArticles,
  createBlogArticle,
  saveBlogArticle,
  deleteBlogArticle,
} from '../../../../lib/controllers/blogController';
import { sendArticleToSubscribers } from '../../../../lib/controllers/newsletterController';

/** GET /api/admin/blogs — list all blogs */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await getAllBlogArticles();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /api/admin/blogs] GET error:', error);
    return NextResponse.json({ source: 'empty', articles: [], error: 'Failed to fetch blogs' }, { status: 200 });
  }
}

/**
 * POST /api/admin/blogs
 * Body: { mode: 'create' | 'save', sendNewsletter?: boolean, ...data }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { mode = 'save', sendNewsletter = false, ...data } = body;

    if (mode === 'create') {
      // createBlogArticle immediately publishes to DEV.to and dispatches the newsletter to subscribers
      const result = await createBlogArticle(data);
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Default: save / update (also updates DEV.to if linked and pulls back DEV.to cover image)
    const saved = await saveBlogArticle(data);
    return NextResponse.json({ success: true, article: saved });
  } catch (error) {
    console.error('[API /api/admin/blogs] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid blog data' },
      { status: 400 }
    );
  }
}

/** DELETE /api/admin/blogs?slug=xxx */
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });

    await deleteBlogArticle(slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/admin/blogs] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete' },
      { status: 500 }
    );
  }
}
