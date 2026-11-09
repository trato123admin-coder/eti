import { NextRequest, NextResponse } from 'next/server';
import { getLiveQuantumSignals, ETISignalPayload } from '@/lib/quantumSignalsService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/eti/v1/etrade/signals/active
 * Endpoint REST Nativo de Ultra-Baja Latencia (< 40 ms) para eTrade
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const searchParams = request.nextUrl.searchParams;
  const isRefresh = searchParams.get('refresh') === 'true';
  const symbolFilter = searchParams.get('symbol');
  const cadenceFilter = searchParams.get('cadence');

  try {
    let signals: ETISignalPayload[] = await getLiveQuantumSignals(isRefresh);

    if (symbolFilter) {
      signals = signals.filter(s => s.symbol.toUpperCase() === symbolFilter.toUpperCase());
    }
    if (cadenceFilter) {
      signals = signals.filter(s => s.cadence.toUpperCase() === cadenceFilter.toUpperCase());
    }

    const elapsedMs = Math.round(performance.now() - startTime);

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        signals_count: signals.length,
        signals,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Content-Type': 'application/json',
          'X-ETI-Response-Time-Ms': String(elapsedMs),
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        signals_count: 0,
        signals: [],
        error: err.message,
      },
      { status: 500 }
    );
  }
}
