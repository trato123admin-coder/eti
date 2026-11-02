import { NextRequest, NextResponse } from 'next/server';
import { getLiveInstruments } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const isRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
  const instruments = await getLiveInstruments(isRefresh);

  return NextResponse.json({
    instruments,
    count: instruments.length,
    updatedAt: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  });
}
