import { NextRequest, NextResponse } from 'next/server';
import { calculatePreviewEstimate } from '@/lib/ingestionService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const estimate = calculatePreviewEstimate({
      channel_id: body?.channel_id || 'UC_UNKNOWN',
      total_videos: Number(body?.total_videos) || 722,
      validity_window_years: Number(body?.validity_window_years) || 3,
      avg_minutes_per_video: Number(body?.avg_minutes_per_video) || 22,
    });
    return NextResponse.json(estimate);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error calculando estimación previa.' },
      { status: 500 }
    );
  }
}
