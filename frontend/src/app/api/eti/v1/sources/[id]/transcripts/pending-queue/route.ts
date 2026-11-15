import { NextResponse } from 'next/server';
import { initialPendingQueue } from '@/lib/ingestionService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    total_pending: initialPendingQueue.length,
    items: initialPendingQueue,
  });
}
