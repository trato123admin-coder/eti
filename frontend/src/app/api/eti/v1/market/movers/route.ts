import { NextResponse } from 'next/server';
import { CANONICAL_MOVERS } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    movers: CANONICAL_MOVERS,
    count: CANONICAL_MOVERS.length,
    updatedAt: new Date().toISOString(),
  });
}
