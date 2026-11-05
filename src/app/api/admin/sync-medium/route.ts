import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { syncFromMedium } from '../../../../lib/controllers/blogController';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let username: string | undefined;
    try {
      const body = (await request.json()) as { username?: string };
      if (body?.username) username = body.username.trim();
    } catch {
      // Body is optional
    }

    const result = await syncFromMedium(username);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API /api/admin/sync-medium] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Medium sync failed' },
      { status: 500 }
    );
  }
}

