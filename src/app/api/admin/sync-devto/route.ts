import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { syncFromDevTo } from '../../../../lib/controllers/blogController';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncFromDevTo();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API /api/admin/sync-devto] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

