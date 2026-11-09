import { fetchLiveQuotes, getFdeProjectionFromSupabase } from './marketDataService';

export interface ETISignalPayload {
  signal_id: string;
  timestamp: string;
  expires_at: string;
  cadence: 'PRE_MARKET' | 'INTRADAY_5M' | 'INTRADAY_15M' | 'REALTIME_ALERT';
  status: 'ACTIVE' | 'STANDBY';
  symbol: 'SPY' | 'QQQ' | 'NVDA' | 'META' | 'SPX';
  asset_class: 'OPTION_0DTE';
  action: 'BUY_TO_OPEN';
  options_contract: {
    contract_symbol: string; // Formato OCC exacto (21 caracteres)
    option_type: 'CALL' | 'PUT';
    strike: number;
    expiration_date: string; // YYYY-MM-DD
    dte: 0;
    target_delta: number;
    max_bid_ask_spread_pct: number;
    estimated_contract_price: number;
  };
  strategy: {
    horizon: 'SCALPING';
    bias: 'BULLISH' | 'BEARISH';
    playbook_rule: string;
    expected_duration_minutes: number;
  };
  causal_context: {
    fde_regime: 'DECELERATION' | 'EXPANSION' | 'STAGFLATION' | 'RECOVERY';
    fcg_confidence_pct: number;
    primary_source: string;
    catalyst_summary: string;
    catalyst_impact_score: number;
    greeks_thesis: string;
  };
  technical_gate: {
    trigger_type: 'PRICE_BREAKOUT' | 'VWAP_REJECTION' | 'EMA_PULLBACK';
    underlying_trigger_price: number;
    trigger_operator: 'GREATER_THAN_OR_EQUAL' | 'LESS_THAN_OR_EQUAL';
    indicator_requirements: {
      vwap_condition: 'PRICE_ABOVE_VWAP' | 'PRICE_BELOW_VWAP' | 'ANY';
      ema_fast_vs_slow: 'FAST_ABOVE_SLOW' | 'FAST_BELOW_SLOW' | 'ANY';
      min_relative_volume: number; // 1.35x para Ross Cameron
      timeframe_confirmation: '1m' | '2m' | '5m';
    };
  };
  risk_management: {
    invalidation_underlying: number;
    stop_loss_contract_pct: number; // -25.0
    take_profit_1_pct: number;      // 40.0 (Venta del 50% y Stop a Breakeven)
    take_profit_2_pct: number;      // 85.0
    runner_trailing_stop_pct: number; // 20.0
    max_account_risk_pct: number;   // 2.5
  };
  safety_guardrails: {
    execution_allowed: boolean;
    max_slippage_pct: number;
    circuit_breaker_active: boolean;
  };
}

/**
 * Genera el símbolo de contrato OCC estándar de 21 caracteres:
 * {SYMBOL (hasta 6 chars)}{YYMMDD}{C|P}{STRIKE * 1000 con padStart(8, '0')}
 */
export function formatOccSymbol(symbol: string, dateStr: string, optType: 'CALL' | 'PUT', strike: number): string {
  const cleanSymbol = symbol.replace('^', '').toUpperCase();
  const dateCompact = dateStr.replace(/-/g, '').slice(2); // YYMMDD
  const typeChar = optType === 'CALL' ? 'C' : 'P';
  const strikeMils = Math.round(strike * 1000);
  const strikePadded = String(strikeMils).padStart(8, '0');
  return `${cleanSymbol}${dateCompact}${typeChar}${strikePadded}`;
}

// In-Memory Hot Cache para cumplir con el SLA < 40 ms requerido por eTrade
let cachedSignals: ETISignalPayload[] = [];
let lastCacheUpdate = 0;
let isRefreshing = false;
const CACHE_TTL_MS = 20 * 1000; // 20 segundos de validez en memoria

/**
 * Recalcula las señales cuánticas 0DTE en segundo plano
 */
async function buildFreshSignals(): Promise<ETISignalPayload[]> {
  const [quotes, fdeData] = await Promise.all([
    fetchLiveQuotes(true),
    getFdeProjectionFromSupabase(false),
  ]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const fdeRegimeRaw = fdeData.financialSystemState.code || 'DECELERATION';
  const validRegimes: Array<'DECELERATION' | 'EXPANSION' | 'STAGFLATION' | 'RECOVERY'> = [
    'DECELERATION', 'EXPANSION', 'STAGFLATION', 'RECOVERY'
  ];
  const fdeRegime = validRegimes.includes(fdeRegimeRaw as any)
    ? (fdeRegimeRaw as 'DECELERATION' | 'EXPANSION' | 'STAGFLATION' | 'RECOVERY')
    : 'DECELERATION';

  const aduanaGate = fdeData.robotMandate?.aduanaCode || '';
  const isBearish = fdeData.financialSystemState.bias === 'BEARISH' || aduanaGate.includes('PUT');
  const optType: 'CALL' | 'PUT' = isBearish ? 'PUT' : 'CALL';

  const assetsConfig = [
    {
      symbol: 'META' as const,
      basePrice: quotes['META']?.price || 613.84,
      targetDelta: isBearish ? -0.42 : 0.42,
      playbookRule: 'META_GAMMA_CASCADE_PUT_0DTE',
      source: 'Ross Cameron P1 / Yoel Sardiñas',
      thesis: 'Descompresión de múltiplos tecnológicos. Quiebre de soporte de apertura con Gamma acelerada.',
      strikeStep: 2.5,
      triggerOffsetPct: isBearish ? -0.004 : 0.004,
      invalidationOffsetPct: isBearish ? 0.006 : -0.006,
    },
    {
      symbol: 'NVDA' as const,
      basePrice: quotes['NVDA']?.price || 207.95,
      targetDelta: isBearish ? -0.45 : 0.45,
      playbookRule: 'NVDA_HIGH_BETA_SCALP_0DTE',
      source: 'Ross Cameron (Micro-Pullback) / Sardiñas',
      thesis: 'Beta 1.82. Flujo gamma hiperbólico tras rechazo en VWAP en vela de 1m/2m.',
      strikeStep: 1.0,
      triggerOffsetPct: isBearish ? -0.005 : 0.005,
      invalidationOffsetPct: isBearish ? 0.007 : -0.007,
    },
    {
      symbol: 'SPY' as const,
      basePrice: quotes['SPY']?.price || 574.85,
      targetDelta: isBearish ? -0.38 : 0.38,
      playbookRule: 'SPY_ORB_BREAK_DOWN_PUT',
      source: 'Ross Cameron Opening Range Breakout',
      thesis: 'Pérdida de VWAP en apertura con RVOL > 1.35x. Scalp institucional de alta liquidez.',
      strikeStep: 1.0,
      triggerOffsetPct: isBearish ? -0.003 : 0.003,
      invalidationOffsetPct: isBearish ? 0.005 : -0.005,
    },
    {
      symbol: 'QQQ' as const,
      basePrice: quotes['QQQ']?.price || 491.50,
      targetDelta: isBearish ? -0.40 : 0.40,
      playbookRule: 'QQQ_VWAP_REVERSAL_PULLBACK',
      source: 'Ross Cameron P1 First Candle New Low',
      thesis: 'Rotación tecnológica defensiva. Rebote fallido a EMA9 con disparo inmediato.',
      strikeStep: 1.0,
      triggerOffsetPct: isBearish ? -0.004 : 0.004,
      invalidationOffsetPct: isBearish ? 0.006 : -0.006,
    },
    {
      symbol: 'SPX' as const,
      basePrice: quotes['SPX']?.price || 5755.00,
      targetDelta: isBearish ? -0.45 : 0.45,
      playbookRule: 'SPX_0DTE_GAMMA_MOMENTUM',
      source: 'Opción Sigma / Ross Cameron Scalp',
      thesis: 'Liquidación en efectivo Sección 1256 IRS, máxima reactividad de Gamma en contratos 0DTE.',
      strikeStep: 5.0,
      triggerOffsetPct: isBearish ? -0.003 : 0.003,
      invalidationOffsetPct: isBearish ? 0.005 : -0.005,
    },
  ];

  return assetsConfig.map((item, idx) => {
    const price = item.basePrice;
    // Strike ATM o ligeramente OTM para delta ~ 0.40
    const rawStrike = isBearish ? price * 0.995 : price * 1.005;
    const strike = Math.round(rawStrike / item.strikeStep) * item.strikeStep;

    const triggerPrice = Number((price * (1 + item.triggerOffsetPct)).toFixed(2));
    const invalidationPrice = Number((price * (1 + item.invalidationOffsetPct)).toFixed(2));
    const occSymbol = formatOccSymbol(item.symbol, todayStr, optType, strike);

    // Estimación empírica de prima 0DTE: entre $1.50 y $4.50 según subyacente
    const estPrice = Number(Math.max(1.50, Math.min(4.50, Number((price * 0.005).toFixed(2)))));

    return {
      signal_id: `eti-${item.symbol.toLowerCase()}-0dte-${todayStr.replace(/-/g, '')}-${String(idx + 1).padStart(3, '0')}`,
      timestamp: now.toISOString(),
      expires_at: new Date(now.getTime() + 7 * 3600 * 1000).toISOString(),
      cadence: 'PRE_MARKET',
      status: 'ACTIVE',
      symbol: item.symbol,
      asset_class: 'OPTION_0DTE',
      action: 'BUY_TO_OPEN',
      options_contract: {
        contract_symbol: occSymbol,
        option_type: optType,
        strike,
        expiration_date: todayStr,
        dte: 0,
        target_delta: item.targetDelta,
        max_bid_ask_spread_pct: 3.5,
        estimated_contract_price: estPrice,
      },
      strategy: {
        horizon: 'SCALPING',
        bias: isBearish ? 'BEARISH' : 'BULLISH',
        playbook_rule: item.playbookRule,
        expected_duration_minutes: 25,
      },
      causal_context: {
        fde_regime: fdeRegime,
        fcg_confidence_pct: fdeData.financialSystemState.causalConfidencePct,
        primary_source: item.source,
        catalyst_summary: fdeData.financialSystemState.description.slice(0, 140),
        catalyst_impact_score: isBearish ? -0.75 : 0.75,
        greeks_thesis: item.thesis,
      },
      technical_gate: {
        trigger_type: 'VWAP_REJECTION',
        underlying_trigger_price: triggerPrice,
        trigger_operator: isBearish ? 'LESS_THAN_OR_EQUAL' : 'GREATER_THAN_OR_EQUAL',
        indicator_requirements: {
          vwap_condition: isBearish ? 'PRICE_BELOW_VWAP' : 'PRICE_ABOVE_VWAP',
          ema_fast_vs_slow: isBearish ? 'FAST_BELOW_SLOW' : 'FAST_ABOVE_SLOW',
          min_relative_volume: 1.35, // Estricto Ross Cameron
          timeframe_confirmation: '2m',
        },
      },
      risk_management: {
        invalidation_underlying: invalidationPrice,
        stop_loss_contract_pct: -25.0,
        take_profit_1_pct: 40.0, // Venta de medio lote y mover stop a breakeven
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
}

/**
 * Función principal que retorna las señales 0DTE en < 40 ms.
 * Si el caché está caliente, responde inmediatamente en < 5 ms.
 */
export async function getLiveQuantumSignals(forceRefresh = false): Promise<ETISignalPayload[]> {
  const now = Date.now();

  if (!forceRefresh && cachedSignals.length > 0 && now - lastCacheUpdate < CACHE_TTL_MS) {
    return cachedSignals;
  }

  // Si hay caché previo pero expiró, refrescar en background sin bloquear la respuesta si es posible
  if (cachedSignals.length > 0 && !forceRefresh) {
    if (!isRefreshing) {
      isRefreshing = true;
      buildFreshSignals()
        .then(fresh => {
          cachedSignals = fresh;
          lastCacheUpdate = Date.now();
        })
        .catch(err => console.error('Error refreshing signals in background:', err))
        .finally(() => { isRefreshing = false; });
    }
    return cachedSignals;
  }

  // Carga inicial síncrona
  cachedSignals = await buildFreshSignals();
  lastCacheUpdate = Date.now();
  return cachedSignals;
}
