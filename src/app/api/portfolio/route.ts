import { NextResponse } from 'next/server';
import { getPortfolioContent, normalizePortfolio } from '../../../lib/controllers/portfolioController';
import staticPortfolioFallback from '../../../portfolio.json';

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
    console.error('[API /api/portfolio] GET error, serving fallback:', error);
    return NextResponse.json(
      {
        source: 'local',
        data: normalizePortfolio(staticPortfolioFallback),
        warning: 'Fallback portfolio served due to server exception',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

