import { NextRequest, NextResponse } from 'next/server';
import { getFdeProjectionFromSupabase } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isRefresh = searchParams.get('refresh') === 'true';

  const data = await getFdeProjectionFromSupabase(isRefresh);

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
