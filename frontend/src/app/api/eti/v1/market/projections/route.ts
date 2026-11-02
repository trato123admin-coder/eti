import { NextResponse } from 'next/server';
import { CANONICAL_PROJECTIONS } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    projections: CANONICAL_PROJECTIONS,
    count: CANONICAL_PROJECTIONS.length,
    updatedAt: new Date().toISOString(),
  });
}
