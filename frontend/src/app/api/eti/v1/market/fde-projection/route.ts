import { NextResponse } from 'next/server';
import { getFdeProjectionFromSupabase } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getFdeProjectionFromSupabase();
  return NextResponse.json(data);
}
