import { NextRequest, NextResponse } from 'next/server';
import { dispatchSignalsToEtradeWebhook } from '@/lib/etradeWebhookDispatcher';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let targetUrl: string | undefined = undefined;
    try {
      const body = await request.json();
      targetUrl = body?.targetUrl;
    } catch {
      // Body opcional
    }

    const summary = await dispatchSignalsToEtradeWebhook(targetUrl);

    return NextResponse.json(summary, {
      status: summary.successful > 0 ? 200 : (summary.failed === summary.total_signals ? 502 : 207),
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0',
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
