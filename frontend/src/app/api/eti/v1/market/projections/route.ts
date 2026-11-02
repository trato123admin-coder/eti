import { NextRequest, NextResponse } from 'next/server';
import { getLiveProjections } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const isRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
  const projections = await getLiveProjections(isRefresh);

  return NextResponse.json({
    projections,
    count: projections.length,
    updatedAt: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  });
}
