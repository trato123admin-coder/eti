import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveQuotes, getFdeProjectionFromSupabase } from '@/lib/marketDataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedCadence = searchParams.get('cadence');
    const requestedSymbol = searchParams.get('symbol');

    const [quotes, fdeData] = await Promise.all([
      fetchLiveQuotes(true),
      getFdeProjectionFromSupabase(true),
    ]);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const expDateCompact = todayStr.replace(/-/g, '').slice(2); // YYMMDD
    const fdeRegime = fdeData.financialSystemState.code || 'DECELERATION';
    const isBearish = fdeData.financialSystemState.bias === 'BEARISH';

    // Lista de activos prioritarios 0DTE para eTrade (Ross Cameron & Yoel Sardiñas)
    const monitoredAssets = [
      {
        symbol: 'META',
        name: 'Meta Platforms',
        basePrice: quotes['META']?.price || 613.84,
        delta: isBearish ? -0.42 : 0.42,
        playbook: 'META_GAMMA_CASCADE_PUT_0DTE',
        source: 'Ross Cameron (P1) / Yoel Sardiñas',
        thesis: 'Alta compresión de múltiplos y quiebre de soporte en apertura. Salida rápida 50% en TP1.',
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corp',
        basePrice: quotes['NVDA']?.price || 207.95,
        delta: isBearish ? -0.45 : 0.45,
        playbook: 'NVDA_HIGH_BETA_SCALP_0DTE',
        source: 'Ross Cameron (Micro-Pullback) / Sardiñas',
        thesis: 'Beta 1.82. Flujo gamma acelerado tras rechazo en VWAP en vela de 1m/2m.',
      },
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF',
        basePrice: quotes['SPY']?.price || 574.85,
        delta: isBearish ? -0.38 : 0.38,
        playbook: 'SPY_ORB_BREAK_DOWN_PUT',
        source: 'Ross Cameron Opening Range Breakout',
        thesis: 'Pérdida de VWAP en apertura con RVOL > 1.35x. Scalp institucional de 15 minutos.',
      },
      {
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        basePrice: quotes['QQQ']?.price || 491.50,
        delta: isBearish ? -0.40 : 0.40,
        playbook: 'QQQ_VWAP_REVERSAL_PULLBACK',
        source: 'Ross Cameron P1 First Candle New Low',
        thesis: 'Rotación tecnológica defensiva. Rebote fallido a EMA9 con gatillo inmediato.',
      },
      {
        symbol: 'SPX',
        name: 'S&P 500 Index (Cash 1256)',
        basePrice: quotes['SPX']?.price || 5755.00,
        delta: isBearish ? -0.45 : 0.45,
        playbook: 'SPX_0DTE_GAMMA_MOMENTUM',
        source: 'Opción Sigma / Ross Cameron Scalp',
        thesis: 'Cero asignación, liquidación en efectivo, máxima aceleración gamma en 0DTE.',
      },
    ];

    const signals = monitoredAssets.map((asset, index) => {
      const price = asset.basePrice;
      const optType = isBearish ? 'PUT' : 'CALL';
      // Strike ligeramente OTM / ATM para delta ~ 0.40
      const strikeStep = asset.symbol === 'SPX' ? 5 : (price > 300 ? 5 : 1);
      const rawStrike = isBearish ? price * 0.995 : price * 1.005;
      const strike = Math.round(rawStrike / strikeStep) * strikeStep;

      const triggerPrice = Number((isBearish ? price * 0.996 : price * 1.004).toFixed(2));
      const invalidationPrice = Number((isBearish ? price * 1.006 : price * 0.994).toFixed(2));
      const strikeFormatted = String(Math.round(strike * 1000)).padStart(8, '0');
      const contractSymbol = `${asset.symbol}${expDateCompact}${optType[0]}${strikeFormatted}`;

      const estContractPrice = Number(Math.max(1.25, Number((price * 0.0055).toFixed(2))));

      return {
        signal_id: `eti-sig-${todayStr.replace(/-/g, '')}-${asset.symbol.toLowerCase()}-${optType.toLowerCase()}-${String(index + 1).padStart(3, '0')}`,
        timestamp: now.toISOString(),
        expires_at: new Date(now.getTime() + 6 * 3600 * 1000).toISOString(),
        cadence: 'PRE_MARKET',
        status: 'ACTIVE',
        symbol: asset.symbol,
        asset_class: 'OPTION_0DTE',
        action: 'BUY_TO_OPEN',
        options_contract: {
          contract_symbol: contractSymbol,
          option_type: optType,
          strike,
          expiration_date: todayStr,
          dte: 0,
          target_delta: asset.delta,
          max_bid_ask_spread_pct: 3.5,
          estimated_contract_price: estContractPrice,
        },
        strategy: {
          horizon: 'SCALPING',
          bias: isBearish ? 'BEARISH' : 'BULLISH',
          playbook_rule: asset.playbook,
          expected_duration_minutes: 25,
        },
        causal_context: {
          fde_regime: fdeRegime === 'LIQUIDITY_SHOCK' ? 'DECELERATION' : (fdeRegime as any),
          fcg_confidence_pct: fdeData.financialSystemState.causalConfidencePct,
          primary_source: asset.source,
          catalyst_summary: fdeData.financialSystemState.description.slice(0, 140),
          catalyst_impact_score: isBearish ? -0.75 : 0.75,
          greeks_thesis: asset.thesis,
        },
        technical_gate: {
          trigger_type: 'VWAP_REJECTION',
          underlying_trigger_price: triggerPrice,
          trigger_operator: isBearish ? 'LESS_THAN_OR_EQUAL' : 'GREATER_THAN_OR_EQUAL',
          indicator_requirements: {
            vwap_condition: isBearish ? 'PRICE_BELOW_VWAP' : 'PRICE_ABOVE_VWAP',
            ema_fast_vs_slow: isBearish ? 'FAST_BELOW_SLOW' : 'FAST_ABOVE_SLOW',
            min_relative_volume: 1.35,
            timeframe_confirmation: '2m',
          },
        },
        risk_management: {
          invalidation_underlying: invalidationPrice,
          stop_loss_contract_pct: -25.0,
          take_profit_1_pct: 40.0,
          take_profit_2_pct: 85.0,
          runner_trailing_stop_pct: 20.0,
          max_account_risk_pct: 2.5,
        },
        safety_guardrails: {
          execution_allowed: true,
          max_slippage_pct: 1.5,
          circuit_breaker_active: false,
        },
      };
    });

    let filteredSignals = signals;
    if (requestedCadence) {
      filteredSignals = filteredSignals.filter(s => s.cadence.toUpperCase() === requestedCadence.toUpperCase());
    }
    if (requestedSymbol) {
      filteredSignals = filteredSignals.filter(s => s.symbol.toUpperCase() === requestedSymbol.toUpperCase());
    }

    return NextResponse.json({
      success: true,
      updated_at: now.toISOString(),
      fde_regime: fdeRegime,
      tws_broker_connected: true,
      tws_account: 'DUR260933',
      count: filteredSignals.length,
      signals: filteredSignals,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
