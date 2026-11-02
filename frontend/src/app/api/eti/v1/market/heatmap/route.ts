import { NextResponse } from 'next/server';
import { CANONICAL_HEATMAP } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    sectors: CANONICAL_HEATMAP,
    count: CANONICAL_HEATMAP.length,
    updatedAt: new Date().toISOString(),
  });
}
