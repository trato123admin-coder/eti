import { supabase } from './supabase';

export interface MarketInstrument {
  symbol: string;
  name: string;
  assetClass: 'INDEX' | 'ETF' | 'VOLATILITY' | 'BOND' | 'FOREX';
  proxyFor?: string;
  price: number;
  changePct: number;
  regime: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'VOLATILE';
  emaAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsi14: number;
  atr14: number;
  atrPercentile: number;
  keyLevels: {
    prevHigh: number;
    prevLow: number;
    open: number;
    gapPct: number;
    vwap: number;
  };
  volatilityState: string;
}

export interface MarketBreadth {
  universe: string;
  advancingCount: number;
  decliningCount: number;
  newHighs: number;
  newLows: number;
  pctAboveSma50: number;
  pctAboveSma200: number;
  sessionBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  biasScore: number;
  formulaDetail: string;
}

export interface TopMover {
  symbol: string;
  name: string;
  changePct: number;
  volume: number;
  relativeVolume: number;
  moverType: 'TOP_GAINERS' | 'TOP_LOSERS' | 'UNUSUAL_VOLUME';
  signal: string;
}

export interface SectorPerformance {
  sector: string;
  changePct: number;
  weightPct: number;
  leadingSymbol: string;
}

export interface FdeProjectionData {
  asOf: string;
  refreshIntervalSeconds: number;
  isPreMarketOpenWindow: boolean;
  financialSystemState: {
    code: string;
    title: string;
    description: string;
    bias: 'BEARISH' | 'BULLISH' | 'NEUTRAL';
    causalConfidencePct: number;
    systemCoherence: 'HIGH' | 'MODERATE' | 'LOW';
  };
  robotMandate: {
    mode: string;
    aduanaCode: string;
    allowedActions: string[];
    blockedActions: string[];
    recommendedSetup: string;
    yoelTacticalStatus: string;
  };
  preMarketTape: Array<{
    symbol: string;
    name: string;
    category: string;
    price: number;
    changePct: number;
    sparklineTrend: 'UP' | 'DOWN' | 'FLAT';
  }>;
  causalDetails: {
    keyVariables: Array<{
      variable: string;
      category: string;
      expected: string;
      actual: string;
      surprise: string;
      direction: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'RISK_OFF';
      impact: string;
    }>;
    causalChain: Array<{
      step: number;
      from: string;
      to: string;
      mechanism: string;
      weight: number;
    }>;
    expectedSessionTimeline: Array<{
      timeWindow: string;
      phase: string;
      expectedBehavior: string;
      tacticalAdvice: string;
    }>;
  };
}

export interface MarketProjection {
  symbol: string;
  horizon: 'INTRADAY' | 'SWING';
  asOf: string;
  currentPrice: number;
  scenarios: {
    bullish: {
      activationLevel: number;
      invalidationLevel: number;
      targetRange: [number, number];
      rationale: string;
    };
    sideways: {
      activationLevel: number;
      invalidationLevel: number;
      targetRange: [number, number];
      rationale: string;
    };
    bearish: {
      activationLevel: number;
      invalidationLevel: number;
      targetRange: [number, number];
      rationale: string;
    };
  };
  disclaimer: string;
}

export const CANONICAL_FDE_PROJECTION: FdeProjectionData = {
  asOf: new Date().toISOString(),
  refreshIntervalSeconds: 300,
  isPreMarketOpenWindow: true,
  financialSystemState: {
    code: 'DECELERATION',
    title: 'Régimen FDE: DECELERATION',
    description: 'Presión sostenida por tasas de interés (Treasury 10Y en 4.93% y VIX en 19.42). Costo de capital restrictivo castiga múltiplos de crecimiento y mega-caps tecnológicas. Sesgo bajista: monitorear rebotes débiles hacia VWAP para buscar continuaciones en PUT 0DTE.',
    bias: 'BEARISH',
    causalConfidencePct: 88,
    systemCoherence: 'HIGH',
  },
  robotMandate: {
    mode: 'BEARISH_MOMENTUM_ONLY',
    aduanaCode: 'O-13: MACRO_REGIME_GATE',
    allowedActions: [
      'Scalping 0DTE PUT en SPX / SPY (Estrategia Yoel Sardiñas)',
      'Broken Wing Butterfly bajista en QQQ (Estrategia John Carter)',
      'Venta de Call Credit Spreads lejanos OTM',
    ],
    blockedActions: [
      'Compras direccionales de CALLs en apertura',
      'Ventas pasivas de Put Credit Spreads en soporte débil',
      'Posiciones largas sin trailing stop técnico estricto',
    ],
    recommendedSetup: 'Fallo de rebote en los primeros 10 minutos de apertura sobre VWAP con confirmación en quiebre de mínimos de pre-market.',
    yoelTacticalStatus: 'ACTIVO: Regla YOEL_CPI_VOLATILITY_BREAKDOWN_PUT habilitada para ejecución táctica.',
  },
  preMarketTape: [
    { symbol: 'SPY', name: 'S&P 500 ETF', category: 'INDICES', price: 574.85, changePct: -1.77, sparklineTrend: 'DOWN' },
    { symbol: 'QQQ', name: 'Nasdaq 100 ETF', category: 'INDICES', price: 491.50, changePct: -2.10, sparklineTrend: 'DOWN' },
    { symbol: '^VIX', name: 'CBOE Volatility Index', category: 'INDICES', price: 19.42, changePct: +14.25, sparklineTrend: 'UP' },
    { symbol: 'USO', name: 'Petróleo WTI (Crude Oil)', category: 'COMMODITIES', price: 168.83, changePct: +2.35, sparklineTrend: 'UP' },
    { symbol: 'GLD', name: 'Oro Físico (Gold)', category: 'COMMODITIES', price: 355.78, changePct: +1.15, sparklineTrend: 'UP' },
    { symbol: 'CPER', name: 'Cobre (Dr. Copper)', category: 'COMMODITIES', price: 38.99, changePct: -0.85, sparklineTrend: 'DOWN' },
    { symbol: '^TNX', name: 'Rendimiento Bono 10Y', category: 'RATES', price: 4.93, changePct: +1.23, sparklineTrend: 'UP' },
    { symbol: 'UUP', name: 'Índice Dólar (DXY Proxy)', category: 'CURRENCIES', price: 29.00, changePct: +0.65, sparklineTrend: 'UP' },
  ],
  causalDetails: {
    keyVariables: [
      {
        variable: 'CPI Headline YoY',
        category: 'INFLATION',
        expected: '3.1%',
        actual: '3.3%',
        surprise: '+0.2% (Sorpresa Alcista)',
        direction: 'HAWKISH',
        impact: 'Reduce probabilidad de recorte de tasas de la FED en próxima reunión a menos del 15%.',
      },
      {
        variable: 'Petróleo Crudo WTI (USO)',
        category: 'COMMODITIES',
        expected: '$165.00',
        actual: '$168.83',
        surprise: '+2.35% (Presión en Costes)',
        direction: 'HAWKISH',
        impact: 'Incrementa el costo de transporte y manufactura, retrasando la convergencia inflacionaria.',
      },
      {
        variable: 'Treasury 10Y Yield (^TNX)',
        category: 'RATES',
        expected: '4.85%',
        actual: '4.93%',
        surprise: '+8 bps',
        direction: 'RISK_OFF',
        impact: 'Aumenta la tasa de descuento para flujos futuros de megacaps (descompresión de PER en NVDA, MSFT, AAPL).',
      },
      {
        variable: 'Ratio Cobre / Oro (CPER/GLD)',
        category: 'COMMODITIES',
        expected: '0.112',
        actual: '0.109',
        surprise: '-2.6% (Divergencia Industrial)',
        direction: 'RISK_OFF',
        impact: 'El oro supera al cobre, indicando búsqueda de refugio frente a desaceleración de manufactura global.',
      },
      {
        variable: 'Net Liquidity FED',
        category: 'LIQUIDITY',
        expected: '$6.12T',
        actual: '$6.05T',
        surprise: '-$70B (Drenaje Táctico)',
        direction: 'HAWKISH',
        impact: 'Menor colchón de efectivo en repos para absorber ventas masivas en apertura.',
      },
    ],
    causalChain: [
      { step: 1, from: 'Dato Macro CPI + Petróleo WTI', to: 'Expectativas FED (Hawkish)', mechanism: 'La sorpresa alcista fuerza a la Fed a mantener tasas elevadas por más tiempo.', weight: 0.92 },
      { step: 2, from: 'Expectativas FED', to: 'Rendimientos Bonos 10Y & Dólar DXY', mechanism: 'Inversores exigen mayor rendimiento en deuda soberana; el dólar absorbe capital global.', weight: 0.88 },
      { step: 3, from: 'Rendimientos 10Y en 4.93%', to: 'Múltiplos de Valoración Megacaps', mechanism: 'El costo de capital encarece el descuento de flujos futuros en Nasdaq 100 y semiconductores.', weight: 0.90 },
      { step: 4, from: 'Presión en Megacaps', to: 'Opciones SPX / SPY (0DTE)', mechanism: 'Quiebre de soporte matutino detona compra agresiva de contratos PUT 0DTE en apertura.', weight: 0.95 },
    ],
    expectedSessionTimeline: [
      {
        timeWindow: '8:30 AM - 9:25 AM EST',
        phase: 'Digestión Pre-Market',
        expectedBehavior: 'Futuros de SPY/QQQ abren con gap bajista de -1.5% a -2.0%. Petróleo y Dólar se fortalecen.',
        tacticalAdvice: 'Monitorear niveles de pre-market low. No anticipar compras ni operar en el spread amplio de pre-apertura.',
      },
      {
        timeWindow: '9:30 AM - 9:50 AM EST',
        phase: 'Apertura Crítica & Ventana Yoel',
        expectedBehavior: 'Intento de rebote técnico débil que falla en el VWAP de 1m/2m. Disparo de volatilidad y quiebre de soporte.',
        tacticalAdvice: 'Ventana operativa de Yoel Sardiñas: Compra de 3 a 5 contratos PUT 0DTE en fallo de rebote; toma de ganancias rápida al alcanzar +30% a +40%.',
      },
      {
        timeWindow: '10:00 AM - 11:30 AM EST',
        phase: 'Estabilización & Muros GEX (Opción Sigma)',
        expectedBehavior: 'El mercado encuentra freno temporal cerca del Muro Gamma de Market Makers. Rebote de sobreventa.',
        tacticalAdvice: 'Cerrar scalping de alta velocidad. Evaluar Iron Condors o Spreads de Opción Sigma para capturar contracción de volatilidad.',
      },
      {
        timeWindow: '2:00 PM - 4:00 PM EST',
        phase: 'Sesión Vespertina & Cierre Institucional',
        expectedBehavior: 'Definición de tendencia final dependiente de flujos institucionales de fin de mes y rebalanceo de bonos.',
        tacticalAdvice: 'No abrir nuevas posiciones 0DTE después de las 2:30 PM por acelerado decaimiento de Theta (pérdida de valor temporal).',
      },
    ],
  },
};

export const CANONICAL_INSTRUMENTS: MarketInstrument[] = [
  {
    symbol: 'SPY',
    name: 'S&P 500 ETF Trust',
    assetClass: 'ETF',
    proxyFor: 'SPX',
    price: 574.85,
    changePct: -1.77,
    regime: 'BEARISH',
    emaAlignment: 'BEARISH',
    rsi14: 42.1,
    atr14: 6.2,
    atrPercentile: 68.0,
    keyLevels: { prevHigh: 585.20, prevLow: 574.10, open: 576.40, gapPct: -1.15, vwap: 575.80 },
    volatilityState: 'ELEVATED',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ (Nasdaq-100)',
    assetClass: 'ETF',
    proxyFor: 'NDX',
    price: 491.50,
    changePct: -2.10,
    regime: 'BEARISH',
    emaAlignment: 'BEARISH',
    rsi14: 38.6,
    atr14: 8.4,
    atrPercentile: 74.0,
    keyLevels: { prevHigh: 502.80, prevLow: 490.50, open: 493.20, gapPct: -1.50, vwap: 492.10 },
    volatilityState: 'ELEVATED',
  },
  {
    symbol: 'DIA',
    name: 'SPDR Dow Jones Industrial',
    assetClass: 'ETF',
    proxyFor: 'DJI',
    price: 421.15,
    changePct: -0.95,
    regime: 'SIDEWAYS',
    emaAlignment: 'NEUTRAL',
    rsi14: 48.2,
    atr14: 4.1,
    atrPercentile: 46.0,
    keyLevels: { prevHigh: 425.80, prevLow: 420.30, open: 422.50, gapPct: -0.45, vwap: 421.60 },
    volatilityState: 'NORMAL',
  },
  {
    symbol: 'IWM',
    name: 'iShares Russell 2000',
    assetClass: 'ETF',
    proxyFor: 'RUT',
    price: 218.40,
    changePct: -1.85,
    regime: 'BEARISH',
    emaAlignment: 'BEARISH',
    rsi14: 41.5,
    atr14: 3.9,
    atrPercentile: 59.0,
    keyLevels: { prevHigh: 222.80, prevLow: 217.90, open: 219.50, gapPct: -0.80, vwap: 218.90 },
    volatilityState: 'NORMAL',
  },
  {
    symbol: 'VIX',
    name: 'CBOE Volatility Index',
    assetClass: 'VOLATILITY',
    price: 19.42,
    changePct: 14.25,
    regime: 'VOLATILE',
    emaAlignment: 'BULLISH',
    rsi14: 68.4,
    atr14: 2.4,
    atrPercentile: 82.0,
    keyLevels: { prevHigh: 20.15, prevLow: 16.80, open: 17.20, gapPct: 4.50, vwap: 18.90 },
    volatilityState: 'EXPANDING',
  },
  {
    symbol: 'US10Y',
    name: 'US 10-Year Treasury Yield',
    assetClass: 'BOND',
    price: 4.93,
    changePct: 1.23,
    regime: 'BULLISH',
    emaAlignment: 'BULLISH',
    rsi14: 67.2,
    atr14: 0.09,
    atrPercentile: 65.0,
    keyLevels: { prevHigh: 4.95, prevLow: 4.86, open: 4.88, gapPct: 0.12, vwap: 4.91 },
    volatilityState: 'RESTRICTIVE',
  },
  {
    symbol: 'UUP',
    name: 'Invesco DB US Dollar Index',
    assetClass: 'FOREX',
    proxyFor: 'DXY',
    price: 29.00,
    changePct: 0.65,
    regime: 'BULLISH',
    emaAlignment: 'BULLISH',
    rsi14: 62.4,
    atr14: 0.25,
    atrPercentile: 55.0,
    keyLevels: { prevHigh: 29.10, prevLow: 28.75, open: 28.82, gapPct: 0.18, vwap: 28.94 },
    volatilityState: 'STRONG',
  },
];

export const CANONICAL_BREADTH: MarketBreadth = {
  universe: 'S&P 500 Componentes',
  advancingCount: 142,
  decliningCount: 358,
  newHighs: 8,
  newLows: 32,
  pctAboveSma50: 42.1,
  pctAboveSma200: 58.4,
  sessionBias: 'BEARISH',
  biasScore: -43,
  formulaDetail: 'Sesgo = ((Avanzan [142] - Declinan [358]) / 500) * 100 = -43.2% (Presión Vendedora Dominante)',
};

export const CANONICAL_MOVERS: TopMover[] = [
  { symbol: 'SMCI', name: 'Super Micro Computer', changePct: -8.40, volume: 54100000, relativeVolume: 2.8, moverType: 'TOP_LOSERS', signal: 'Quiebre de Soporte en Pre-market' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', changePct: -2.65, volume: 88900000, relativeVolume: 1.7, moverType: 'TOP_LOSERS', signal: 'Fallo en VWAP' },
  { symbol: 'META', name: 'Meta Platforms', changePct: -2.15, volume: 42300000, relativeVolume: 1.5, moverType: 'TOP_LOSERS', signal: 'Descompresión de Múltiplos' },
  { symbol: 'USO', name: 'United States Oil Fund', changePct: 2.35, volume: 38200000, relativeVolume: 2.4, moverType: 'TOP_GAINERS', signal: 'Impulso por Tensión en Suministro' },
  { symbol: 'GLD', name: 'SPDR Gold Trust', changePct: 1.15, volume: 29400000, relativeVolume: 1.8, moverType: 'TOP_GAINERS', signal: 'Flujo de Refugio en Metales' },
  { symbol: 'VIXY', name: 'ProShares VIX Short-Term', changePct: 9.80, volume: 41200000, relativeVolume: 3.5, moverType: 'UNUSUAL_VOLUME', signal: 'Volumen Inusual en Coberturas' },
];

export const CANONICAL_HEATMAP: SectorPerformance[] = [
  { sector: 'Technology', changePct: -2.35, weightPct: 31.5, leadingSymbol: 'NVDA (-2.6%)' },
  { sector: 'Consumer Discretionary', changePct: -1.95, weightPct: 10.1, leadingSymbol: 'TSLA (-3.1%)' },
  { sector: 'Communication Services', changePct: -1.80, weightPct: 9.2, leadingSymbol: 'META (-2.1%)' },
  { sector: 'Financials', changePct: -0.90, weightPct: 13.0, leadingSymbol: 'JPM (-0.7%)' },
  { sector: 'Industrials', changePct: -0.75, weightPct: 8.4, leadingSymbol: 'CAT (-0.9%)' },
  { sector: 'Real Estate', changePct: -1.45, weightPct: 2.2, leadingSymbol: 'PLD (-1.6%)' },
  { sector: 'Materials', changePct: -0.40, weightPct: 2.3, leadingSymbol: 'LIN (-0.2%)' },
  { sector: 'Healthcare', changePct: +0.25, weightPct: 11.8, leadingSymbol: 'LLY (+0.8%)' },
  { sector: 'Consumer Staples', changePct: +0.35, weightPct: 5.9, leadingSymbol: 'PG (+0.4%)' },
  { sector: 'Utilities', changePct: +0.60, weightPct: 2.4, leadingSymbol: 'NEE (+0.9%)' },
  { sector: 'Energy', changePct: +1.85, weightPct: 3.7, leadingSymbol: 'XOM (+2.1%)' },
];

export const CANONICAL_PROJECTIONS: MarketProjection[] = [
  {
    symbol: 'SPY',
    horizon: 'INTRADAY',
    asOf: new Date().toISOString(),
    currentPrice: 574.85,
    scenarios: {
      bearish: {
        activationLevel: 571.80,
        invalidationLevel: 574.50,
        targetRange: [568.50, 570.00],
        rationale: 'Pérdida de EMA 20 intradía con rebote de volatilidad sobre 18.',
      },
      bullish: {
        activationLevel: 576.20,
        invalidationLevel: 572.50,
        targetRange: [577.50, 579.00],
        rationale: 'Superación confirmada de VWAP + apertura con sesgo alcista y VIX bajo 17.',
      },
      sideways: {
        activationLevel: 573.00,
        invalidationLevel: 571.00,
        targetRange: [572.50, 575.50],
        rationale: 'Consolidación entre el POC de la sesión previa y la banda superior de Bollinger.',
      },
    },
    disclaimer: 'Indicativa, no calibrada, no es una señal de operación. Sin probabilidades numéricas hasta calibración formal en scorecard.',
  },
  {
    symbol: 'QQQ',
    horizon: 'INTRADAY',
    asOf: new Date().toISOString(),
    currentPrice: 492.30,
    scenarios: {
      bearish: {
        activationLevel: 488.50,
        invalidationLevel: 492.00,
        targetRange: [484.00, 486.50],
        rationale: 'Rotación fuera de megacaps tecnológicas hacia defensivas. Drenaje de liquidez neta en apertura.',
      },
      bullish: {
        activationLevel: 494.50,
        invalidationLevel: 489.50,
        targetRange: [496.00, 498.50],
        rationale: 'Fuerte impulso en semiconductores (NVDA/SMCI) extendiendo el rally sobre VWAP.',
      },
      sideways: {
        activationLevel: 490.50,
        invalidationLevel: 488.00,
        targetRange: [489.00, 493.50],
        rationale: 'Rango estrecho previo a declaraciones macroeconómicas.',
      },
    },
    disclaimer: 'Indicativa, no calibrada, no es una señal de operación.',
  },
  {
    symbol: 'META',
    horizon: 'INTRADAY',
    asOf: new Date().toISOString(),
    currentPrice: 584.20,
    scenarios: {
      bearish: {
        activationLevel: 581.80,
        invalidationLevel: 586.50,
        targetRange: [572.00, 575.50],
        rationale: 'Playbook Yoel Sardiñas: Fallo en VWAP en los primeros 10 min + quiebre de pre-market low. Aceleración de Gamma en PUTs 0DTE.',
      },
      bullish: {
        activationLevel: 588.50,
        invalidationLevel: 581.00,
        targetRange: [592.00, 596.00],
        rationale: 'Superación agresiva de VWAP con inyección institucional de volumen en apertura.',
      },
      sideways: {
        activationLevel: 583.00,
        invalidationLevel: 579.00,
        targetRange: [581.50, 586.00],
        rationale: 'Absorción en rango estrecho entre niveles de soporte y resistencia previa.',
      },
    },
    disclaimer: 'Proyección causal alineada con el modelo Forrester Capa 4 (Tech Multiple Compression).',
  },
  {
    symbol: 'NVDA',
    horizon: 'INTRADAY',
    asOf: new Date().toISOString(),
    currentPrice: 141.50,
    scenarios: {
      bearish: {
        activationLevel: 139.20,
        invalidationLevel: 142.80,
        targetRange: [134.00, 136.50],
        rationale: 'Alta Beta (1.8x). Deslizamiento acelerado por venta de market makers al quebrar soporte.',
      },
      bullish: {
        activationLevel: 143.20,
        invalidationLevel: 139.80,
        targetRange: [145.00, 147.50],
        rationale: 'Ruptura alcista sobre canal de compresión TTM Squeeze con momentum positivo.',
      },
      sideways: {
        activationLevel: 140.50,
        invalidationLevel: 138.50,
        targetRange: [139.50, 142.50],
        rationale: 'Consolidación dentro del rango de valor de apertura.',
      },
    },
    disclaimer: 'Proyección causal de alta volatilidad para scalping direccional.',
  },
  {
    symbol: 'SPX',
    horizon: 'INTRADAY',
    asOf: new Date().toISOString(),
    currentPrice: 5755.00,
    scenarios: {
      bearish: {
        activationLevel: 5735.00,
        invalidationLevel: 5768.00,
        targetRange: [5680.00, 5705.00],
        rationale: 'Aduana O-13 Activada: Scalping 0DTE PUT por desaceleración macro y rendimiento 10Y en 4.93%.',
      },
      bullish: {
        activationLevel: 5770.00,
        invalidationLevel: 5735.00,
        targetRange: [5790.00, 5810.00],
        rationale: 'Régimen de expansión y absorción compradora sobre VWAP institucional.',
      },
      sideways: {
        activationLevel: 5740.00,
        invalidationLevel: 5720.00,
        targetRange: [5730.00, 5765.00],
        rationale: 'Muros de Gamma institucional contienen al índice (Viabilidad Iron Condor Opción Sigma).',
      },
    },
    disclaimer: 'Índice de liquidación en efectivo Sección 1256 IRS para operativa de apertura.',
  },
];

export async function getFdeProjectionFromSupabase(isRefresh?: boolean): Promise<FdeProjectionData> {
  try {
    const { data, error } = await supabase
      .from('eti_fde_system_states')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return {
        ...CANONICAL_FDE_PROJECTION,
        asOf: new Date().toISOString(),
      };
    }

    const state = data[0];
    const bias: 'BEARISH' | 'BULLISH' | 'NEUTRAL' = 
      state.directional_bias === 'BEARISH' ? 'BEARISH' :
      state.directional_bias === 'BULLISH' ? 'BULLISH' : 'NEUTRAL';

    const confidence = Math.round(Number(state.system_coherence_index || 0.88) * 100);

    const asOfTime = isRefresh 
      ? new Date().toISOString() 
      : (state.timestamp || new Date().toISOString());

    return {
      ...CANONICAL_FDE_PROJECTION,
      asOf: asOfTime,
      financialSystemState: {
        code: state.macro_regime || 'DECELERATION',
        title: `Régimen FDE: ${state.macro_regime || 'DECELERATION'}`,
        description: state.state_payload?.summary_text || CANONICAL_FDE_PROJECTION.financialSystemState.description,
        bias,
        causalConfidencePct: confidence,
        systemCoherence: confidence >= 80 ? 'HIGH' : confidence >= 50 ? 'MODERATE' : 'LOW',
      },
      robotMandate: {
        ...CANONICAL_FDE_PROJECTION.robotMandate,
        mode: bias === 'BEARISH' ? 'BEARISH_MOMENTUM_ONLY' : bias === 'BULLISH' ? 'BULLISH_MOMENTUM_ONLY' : 'NEUTRAL_RANGE_ONLY',
        aduanaCode: state.aduana_gate_action ? `O-13: ${state.aduana_gate_action}` : 'O-13: ALLOW_PUTS_ONLY',
      },
    };
  } catch (err) {
    console.error('Error fetching FDE state from Supabase:', err);
    return {
      ...CANONICAL_FDE_PROJECTION,
      asOf: new Date().toISOString(),
    };
  }
}
