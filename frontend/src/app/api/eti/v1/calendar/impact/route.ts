import { NextRequest, NextResponse } from 'next/server';
import { US_ECONOMIC_CALENDAR_2026, calculateCausalImpact } from '@/lib/economicCalendarService';
import { fetchLiveQuotes } from '@/lib/marketDataService';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const quotes = await fetchLiveQuotes();
    const basePrices = {
      spx: quotes['SPX']?.price || 7615.48,
      spy: quotes['SPY']?.price || 759.19,
      qqq: quotes['QQQ']?.price || 695.12,
      meta: quotes['META']?.price || 613.84,
      nvda: quotes['NVDA']?.price || 207.95,
    };

    const publishedEvent = US_ECONOMIC_CALENDAR_2026.find(e => e.status === 'PUBLISHED') || US_ECONOMIC_CALENDAR_2026[0];
    const initialImpact = calculateCausalImpact(publishedEvent, undefined, basePrices);

    return NextResponse.json({
      events: US_ECONOMIC_CALENDAR_2026,
      currentImpact: initialImpact,
      basePrices,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, customActual, applyToFde } = body;

    const event = US_ECONOMIC_CALENDAR_2026.find(e => e.id === eventId) || US_ECONOMIC_CALENDAR_2026[0];
    const quotes = await fetchLiveQuotes();
    const basePrices = {
      spx: quotes['SPX']?.price || 7615.48,
      spy: quotes['SPY']?.price || 759.19,
      qqq: quotes['QQQ']?.price || 695.12,
      meta: quotes['META']?.price || 613.84,
      nvda: quotes['NVDA']?.price || 207.95,
    };

    const impact = calculateCausalImpact(event, customActual, basePrices);

    if (applyToFde) {
      try {
        const stateRecord = {
          macro_regime: impact.macroRegime,
          system_coherence_index: impact.coherencePct / 100,
          directional_bias: impact.shockDirection === 'HAWKISH' ? 'BEARISH' : impact.shockDirection === 'DOVISH' ? 'BULLISH' : 'NEUTRAL',
          expected_spx_open_action: impact.shockDirection === 'HAWKISH' ? 'PUT_MOMENTUM_BREAKDOWN' : impact.shockDirection === 'DOVISH' ? 'CALL_MOMENTUM_RALLY' : 'RANGE_BOUND_NEUTRAL',
          primary_driver_node: event.title,
          shock_intensity: Math.abs(impact.surpriseShock),
          recommended_strategy: impact.robotMandate.recommendedStrategy,
          aduana_gate_action: impact.robotMandate.aduanaCode.replace('O-13: ', ''),
          state_payload: {
            source: 'ECONOMIC_CALENDAR_TRANSMISSION_ENGINE',
            event_title: event.title,
            actual: impact.actualValue,
            expected: impact.expectedValue,
            surprise_shock: impact.surpriseShock,
            summary_text: `Impacto económico calculado: ${event.title} reporta ${impact.actualValue}${event.unit} (Sorpresa: ${impact.surpriseShock > 0 ? '+' : ''}${impact.surpriseShock}${event.unit}). Régimen ${impact.macroRegime} con sesgo ${impact.shockDirection}. Mandato ADUANA: ${impact.robotMandate.aduanaCode}.`,
            timestamp: new Date().toISOString(),
          },
        };

        await supabase.from('eti_fde_system_states').insert(stateRecord);
      } catch (dbErr) {
        console.error('Error sincronizando estado FDE desde Calendario:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      impact,
      appliedToFde: !!applyToFde,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
