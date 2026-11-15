import { NextRequest, NextResponse } from 'next/server';
import { startBackfillForSource } from '@/lib/ingestionService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await startBackfillForSource(params.id, body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error iniciando backfill del canal.' },
      { status: 500 }
    );
  }
}
