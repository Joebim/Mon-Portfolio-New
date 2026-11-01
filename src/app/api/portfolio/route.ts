import { NextResponse } from 'next/server';
import { getPortfolioContent } from '../../../lib/controllers/portfolioController';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getPortfolioContent();
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[API /api/portfolio] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve portfolio data' },
      { status: 500 }
    );
  }
}

