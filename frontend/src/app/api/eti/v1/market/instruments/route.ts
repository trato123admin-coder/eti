import { NextResponse } from 'next/server';
import { CANONICAL_INSTRUMENTS } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    instruments: CANONICAL_INSTRUMENTS,
    count: CANONICAL_INSTRUMENTS.length,
    updatedAt: new Date().toISOString(),
  });
}
