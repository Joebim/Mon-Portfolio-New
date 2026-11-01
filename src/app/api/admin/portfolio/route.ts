import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getPortfolioContent, updatePortfolioContent } from '../../../../lib/controllers/portfolioController';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await getPortfolioContent();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /api/admin/portfolio] GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve portfolio data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await updatePortfolioContent(body);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API /api/admin/portfolio] PUT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid data format' },
      { status: 400 }
    );
  }
}

