import { NextResponse } from 'next/server';
import { addSubscriber } from '../../../../lib/controllers/newsletterController';

/**
 * POST /api/newsletter/subscribe
 * Public endpoint called by the frontend CurvedInput newsletter widget.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body?.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const { subscriber, isNew } = await addSubscriber(email, {
      name: body?.name,
      source: 'frontend',
      sendWelcome: true,
    });

    return NextResponse.json({
      success: true,
      isNew,
      subscriber,
      message: isNew
        ? 'Subscribed! New articles will arrive straight in your inbox.'
        : 'You are already subscribed to the newsletter!',
    });
  } catch (error) {
    console.error('[API /api/newsletter/subscribe] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to subscribe.' },
      { status: 500 }
    );
  }
}

