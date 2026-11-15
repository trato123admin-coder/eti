import { NextRequest, NextResponse } from 'next/server';
import { activeRuns, getBackfillStatusForSource } from '@/lib/ingestionService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}));
  const action = body?.action as 'PAUSE' | 'RESUME' | 'CANCEL';
  const id = params.id;

  const run = activeRuns[id] || (await getBackfillStatusForSource(id));
  if (action === 'PAUSE') run.status = 'PAUSED';
  if (action === 'RESUME') run.status = 'RUNNING';
  if (action === 'CANCEL') run.status = 'CANCELLED';
  activeRuns[id] = run;

  return NextResponse.json({
    source_id: id,
    status: run.status,
    action_applied: action,
  });
}
