import { NextResponse } from 'next/server';
import { CANONICAL_BREADTH } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(CANONICAL_BREADTH);
}
