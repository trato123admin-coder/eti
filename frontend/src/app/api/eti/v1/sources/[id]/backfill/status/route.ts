import { NextRequest, NextResponse } from 'next/server';
import { getBackfillStatusForSource } from '@/lib/ingestionService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sp = request.nextUrl.searchParams;
  const title = sp.get('title') || undefined;
  const handle = sp.get('handle') || undefined;
  const discovered = sp.get('discovered') ? Number(sp.get('discovered')) : undefined;

  const status = await getBackfillStatusForSource(params.id, {
    title,
    handle,
    discovered,
  });

  return NextResponse.json(status);
}
