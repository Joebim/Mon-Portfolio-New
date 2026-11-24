import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import {
  listSubscribers,
  addSubscriber,
  addSubscribersBulk,
  removeSubscriber,
  sendArticleToSubscribers,
} from '../../../../lib/controllers/newsletterController';
import { getBlogArticleBySlug } from '../../../../lib/controllers/blogController';
import { getEmailProviderStatus } from '../../../../lib/email';

/**
 * GET /api/admin/newsletter
 * Lists all subscribers and email provider status (Gmail SMTP / Resend).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const subscribers = await listSubscribers();
    const emailStatus = getEmailProviderStatus();

    return NextResponse.json({
      subscribers,
      count: subscribers.length,
      emailStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load subscribers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/newsletter
 * Supports:
 * 1) { action: 'add', email?: string, emails?: string[] } — Add subscriber(s) from Admin
 * 2) { action: 'send-article', slug: string } — Blast an article to all active subscribers
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (body.action === 'send-article') {
      const slug = body.slug as string;
      if (!slug) {
        return NextResponse.json({ error: 'Blog slug is required' }, { status: 400 });
      }
      const article = await getBlogArticleBySlug(slug);
      if (!article) {
        return NextResponse.json({ error: `Article "${slug}" not found` }, { status: 404 });
      }
      const res = await sendArticleToSubscribers(article);
      if (!res.success) {
        return NextResponse.json(res, { status: 502 });
      }
      return NextResponse.json(res);
    }

    // Add single or multiple emails
    const rawList: string[] = [];
    if (Array.isArray(body.emails)) {
      rawList.push(...body.emails);
    }
    if (typeof body.email === 'string') {
      rawList.push(
        ...body.email
          .split(/[\n,;]+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      );
    }

    if (rawList.length === 0) {
      return NextResponse.json({ error: 'Please provide at least one email address.' }, { status: 400 });
    }

    if (rawList.length === 1) {
      await addSubscriber(rawList[0], { source: 'admin', sendWelcome: Boolean(body.sendWelcome) });
      const subscribers = await listSubscribers();
      return NextResponse.json({
        success: true,
        added: 1,
        total: subscribers.length,
        subscribers,
      });
    }

    const bulk = await addSubscribersBulk(rawList, 'admin');
    return NextResponse.json({
      success: true,
      ...bulk,
    });
  } catch (error) {
    console.error('[API /api/admin/newsletter POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Newsletter operation failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/newsletter?email=...
 * Removes a subscriber.
 */
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    await removeSubscriber(email);
    const subscribers = await listSubscribers();
    return NextResponse.json({
      success: true,
      subscribers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete subscriber' },
      { status: 500 }
    );
  }
}

