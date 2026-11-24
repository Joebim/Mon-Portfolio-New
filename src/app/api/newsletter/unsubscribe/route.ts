import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '../../../../lib/email';
import { unsubscribeSubscriber } from '../../../../lib/controllers/newsletterController';

function renderUnsubscribePage(input: {
  ok: boolean;
  email?: string;
  message: string;
}) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://josephakinwole.com').replace(
    /\/$/,
    ''
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${input.ok ? 'Unsubscribed' : 'Unsubscribe Error'} · Joseph Akinwole</title>
</head>
<body style="margin:0;padding:0;min-height:100vh;background:#0b0b0b;color:#eeeae5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;">
  <div style="max-width:460px;width:90%;background:#121110;border:1px solid #2a2521;border-radius:20px;padding:36px 32px;text-align:center;">
    <div style="font-family:monospace;font-size:11px;letter-spacing:0.14em;color:${
      input.ok ? '#b4d579' : '#f87171'
    };font-weight:700;text-transform:uppercase;margin-bottom:14px;">
      ${input.ok ? '✓ UNSUBSCRIBED' : '⚠ INVALID LINK'}
    </div>
    <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:600;color:#eeeae5;">
      ${input.ok ? "You've been unsubscribed" : 'Could not process unsubscribe'}
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#b0a69c;">
      ${input.message}
    </p>
    <a href="${siteUrl}/blog" style="display:inline-block;padding:12px 24px;background:#f36d45;color:#0b0b0b;text-decoration:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;border-radius:10px;text-transform:uppercase;">
      Back to Blog →
    </a>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  const token = (searchParams.get('token') || '').trim();

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return new NextResponse(
      renderUnsubscribePage({
        ok: false,
        message: 'This unsubscribe link is invalid or expired.',
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  await unsubscribeSubscriber(email);

  return new NextResponse(
    renderUnsubscribePage({
      ok: true,
      email,
      message: `${email} has been removed from future newsletter dispatches.`,
    }),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  const token = (searchParams.get('token') || '').trim();

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 400 });
  }

  await unsubscribeSubscriber(email);
  return NextResponse.json({ success: true, email, status: 'unsubscribed' });
}
