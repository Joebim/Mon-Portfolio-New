import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { recordSiteVisit } from '../../../../lib/analytics';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === 'string' ? body.path : '/';

    const forwardedFor = request.headers.get('x-forwarded-for') || '';
    const userAgent = request.headers.get('user-agent') || 'ua';
    const rawIp = forwardedFor.split(',')[0]?.trim() || 'local';
    const visitorKey = createHash('sha256')
      .update(`${rawIp}:${userAgent}`)
      .digest('hex')
      .slice(0, 16);

    await recordSiteVisit({ path, visitorKey });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
