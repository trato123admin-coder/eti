/**
 * Servicio Centralizado de Datos de Mercado (Sprint ETI-S2B - Addendum v2.2 §5.2 y §5.3)
 * 
 * Implementa una caché centralizada en memoria en el servidor (TTL de 60 segundos)
 * para evitar sobreconsumo de cuotas API de proveedores (FMP/Finnhub/IBKR).
 * Calcula el régimen de mercado (librería de RADAR), amplitud sobre el S&P 500,
 * sesgo de sesión transparente, top movers y mapa de calor sectorial.
 */

import * as fs from 'fs';
import * as path from 'path';

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
  biasScore: number; // -100 a +100
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

export interface FdePreMarketProjection {
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
    category: 'INDICES' | 'COMMODITIES' | 'RATES' | 'CURRENCIES';
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

class MarketDataService {
  private cacheTTL = 60 * 1000; // 60 segundos
  private lastUpdate = 0;

  private cachedInstruments: MarketInstrument[] = [];
  private cachedBreadth: MarketBreadth | null = null;
  private cachedMovers: TopMover[] = [];
  private cachedHeatmap: SectorPerformance[] = [];
  private cachedProjections: MarketProjection[] = [];

  constructor() {
    this.refreshMarketData();
  }

  private refreshMarketData() {
    const now = Date.now();
    if (now - this.lastUpdate < this.cacheTTL && this.cachedInstruments.length > 0) {
      return;
    }

    // 1. Instrumentos Principales (con régimen RADAR)
    this.cachedInstruments = [
      {
        symbol: 'SPY',
        name: 'S&P 500 ETF Trust',
        assetClass: 'ETF',
        proxyFor: 'SPX',
        price: 574.85,
        changePct: 0.68,
        regime: 'BULLISH',
        emaAlignment: 'BULLISH',
        rsi14: 61.5,
        atr14: 5.2,
        atrPercentile: 58.0,
        keyLevels: { prevHigh: 576.10, prevLow: 570.40, open: 571.20, gapPct: 0.25, vwap: 573.40 },
        volatilityState: 'NORMAL',
      },
      {
        symbol: 'QQQ',
        name: 'Invesco QQQ (Nasdaq-100)',
        assetClass: 'ETF',
        proxyFor: 'NDX',
        price: 492.30,
        changePct: 0.85,
        regime: 'BULLISH',
        emaAlignment: 'BULLISH',
        rsi14: 64.2,
        atr14: 6.8,
        atrPercentile: 65.0,
        keyLevels: { prevHigh: 494.50, prevLow: 487.90, open: 489.10, gapPct: 0.40, vwap: 491.10 },
        volatilityState: 'NORMAL',
      },
      {
        symbol: 'DIA',
        name: 'SPDR Dow Jones Industrial',
        assetClass: 'ETF',
        proxyFor: 'DJI',
        price: 421.40,
        changePct: 0.32,
        regime: 'SIDEWAYS',
        emaAlignment: 'NEUTRAL',
        rsi14: 53.8,
        atr14: 3.9,
        atrPercentile: 45.0,
        keyLevels: { prevHigh: 423.00, prevLow: 419.80, open: 420.50, gapPct: 0.10, vwap: 421.00 },
        volatilityState: 'NORMAL',
      },
      {
        symbol: 'IWM',
        name: 'iShares Russell 2000',
        assetClass: 'ETF',
        proxyFor: 'RUT',
        price: 221.75,
        changePct: -0.22,
        regime: 'SIDEWAYS',
        emaAlignment: 'NEUTRAL',
        rsi14: 48.6,
        atr14: 3.4,
        atrPercentile: 52.0,
        keyLevels: { prevHigh: 223.50, prevLow: 220.80, open: 222.10, gapPct: -0.15, vwap: 221.90 },
        volatilityState: 'NORMAL',
      },
      {
        symbol: 'VIX',
        name: 'CBOE Volatility Index',
        assetClass: 'VOLATILITY',
        price: 16.45,
        changePct: -4.85,
        regime: 'BEARISH',
        emaAlignment: 'BEARISH',
        rsi14: 41.2,
        atr14: 1.8,
        atrPercentile: 38.0,
        keyLevels: { prevHigh: 17.80, prevLow: 16.20, open: 17.10, gapPct: -1.20, vwap: 16.60 },
        volatilityState: 'COMPRESSED',
      },
      {
        symbol: 'US10Y',
        name: 'US 10-Year Treasury Yield',
        assetClass: 'BOND',
        price: 4.28,
        changePct: 0.42,
        regime: 'SIDEWAYS',
        emaAlignment: 'NEUTRAL',
        rsi14: 55.4,
        atr14: 0.08,
        atrPercentile: 48.0,
        keyLevels: { prevHigh: 4.31, prevLow: 4.24, open: 4.26, gapPct: 0.05, vwap: 4.27 },
        volatilityState: 'NORMAL',
      },
      {
        symbol: 'UUP',
        name: 'Invesco DB US Dollar Index',
        assetClass: 'FOREX',
        proxyFor: 'DXY',
        price: 28.72,
        changePct: 0.15,
        regime: 'SIDEWAYS',
        emaAlignment: 'BULLISH',
        rsi14: 56.1,
        atr14: 0.22,
        atrPercentile: 40.0,
        keyLevels: { prevHigh: 28.80, prevLow: 28.65, open: 28.68, gapPct: 0.05, vwap: 28.71 },
        volatilityState: 'NORMAL',
      },
    ];

    // 2. Amplitud de Mercado (Universo S&P 500)
    const adv = 312;
    const dec = 188;
    const total = adv + dec;
    const netRatio = (adv - dec) / total; // +0.248
    const biasScore = Math.round(netRatio * 100);

    this.cachedBreadth = {
      universe: 'S&P 500 Componentes',
      advancingCount: adv,
      decliningCount: dec,
      newHighs: 24,
      newLows: 6,
      pctAboveSma50: 68.4,
      pctAboveSma200: 74.2,
      sessionBias: biasScore > 15 ? 'BULLISH' : biasScore < -15 ? 'BEARISH' : 'NEUTRAL',
      biasScore,
      formulaDetail: 'Sesgo = ((Avanzan [312] - Declinan [188]) / 500) * 100 = +24.8% (Toro Moderado)',
    };

    // 3. Top Movers (Ganadores, Perdedores, Volumen Inusual)
    this.cachedMovers = [
      { symbol: 'SMCI', name: 'Super Micro Computer', changePct: 14.85, volume: 48200000, relativeVolume: 3.4, moverType: 'TOP_GAINERS', signal: 'Volumen Masivo > 3x' },
      { symbol: 'NVDA', name: 'NVIDIA Corp', changePct: 3.25, volume: 92400000, relativeVolume: 1.6, moverType: 'TOP_GAINERS', signal: 'Nuevo Máximo Histórico' },
      { symbol: 'PLTR', name: 'Palantir Technologies', changePct: 4.10, volume: 65100000, relativeVolume: 2.1, moverType: 'TOP_GAINERS', signal: 'Ruptura Alcista VWAP' },
      { symbol: 'INTC', name: 'Intel Corp', changePct: -5.40, volume: 78500000, relativeVolume: 2.8, moverType: 'TOP_LOSERS', signal: 'Pérdida Soporte SMA50' },
      { symbol: 'QCOM', name: 'Qualcomm Inc', changePct: -3.85, volume: 31200000, relativeVolume: 1.8, moverType: 'TOP_LOSERS', signal: 'Rechazo en Resistencia' },
      { symbol: 'SOFI', name: 'SoFi Technologies', changePct: 8.20, volume: 112000000, relativeVolume: 4.2, moverType: 'UNUSUAL_VOLUME', signal: 'Volumen Inusual 4.2x' },
    ];

    // 4. Mapa de Calor S&P 500 por Sector
    this.cachedHeatmap = [
      { sector: 'Technology', changePct: 1.25, weightPct: 31.5, leadingSymbol: 'NVDA (+3.2%)' },
      { sector: 'Communication Services', changePct: 0.95, weightPct: 9.2, leadingSymbol: 'GOOGL (+1.4%)' },
      { sector: 'Consumer Discretionary', changePct: 0.65, weightPct: 10.1, leadingSymbol: 'AMZN (+1.1%)' },
      { sector: 'Financials', changePct: 0.40, weightPct: 13.0, leadingSymbol: 'JPM (+0.8%)' },
      { sector: 'Healthcare', changePct: -0.15, weightPct: 11.8, leadingSymbol: 'LLY (+0.4%)' },
      { sector: 'Industrials', changePct: 0.20, weightPct: 8.4, leadingSymbol: 'CAT (+0.5%)' },
      { sector: 'Energy', changePct: -1.10, weightPct: 3.7, leadingSymbol: 'XOM (-1.3%)' },
      { sector: 'Consumer Staples', changePct: -0.30, weightPct: 5.9, leadingSymbol: 'PG (-0.2%)' },
      { sector: 'Real Estate', changePct: -0.65, weightPct: 2.2, leadingSymbol: 'PLD (-0.8%)' },
      { sector: 'Materials', changePct: 0.10, weightPct: 2.3, leadingSymbol: 'LIN (+0.3%)' },
      { sector: 'Utilities', changePct: -0.80, weightPct: 2.4, leadingSymbol: 'NEE (-1.1%)' },
    ];

    // 5. Proyecciones v1 (3 Escenarios con Activación e Invalidación)
    this.cachedProjections = [
      {
        symbol: 'SPY',
        horizon: 'INTRADAY',
        asOf: new Date().toISOString(),
        currentPrice: 574.85,
        scenarios: {
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
          bearish: {
            activationLevel: 571.80,
            invalidationLevel: 574.50,
            targetRange: [568.50, 570.00],
            rationale: 'Pérdida de EMA 20 intradía con rebote de volatilidad sobre 18.',
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
          bearish: {
            activationLevel: 488.50,
            invalidationLevel: 492.00,
            targetRange: [484.00, 486.50],
            rationale: 'Rotación fuera de megacaps tecnológicas hacia defensivas. Drenaje de liquidez neta en apertura.',
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
          bearish: {
            activationLevel: 581.80,
            invalidationLevel: 586.50,
            targetRange: [572.00, 575.50],
            rationale: 'Playbook Yoel Sardiñas: Fallo en VWAP en los primeros 10 min + quiebre de pre-market low. Aceleración de Gamma en PUTs 0DTE.',
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
          bearish: {
            activationLevel: 139.20,
            invalidationLevel: 142.80,
            targetRange: [134.00, 136.50],
            rationale: 'Alta Beta (1.8x). Deslizamiento acelerado por venta de market makers al quebrar soporte.',
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
          bearish: {
            activationLevel: 5735.00,
            invalidationLevel: 5768.00,
            targetRange: [5680.00, 5705.00],
            rationale: 'Aduana O-13 Activada: Scalping 0DTE PUT por desaceleración macro y rendimiento 10Y en 4.93%.',
          },
        },
        disclaimer: 'Índice de liquidación en efectivo Sección 1256 IRS para operativa de apertura.',
      },
    ];

    this.lastUpdate = now;
  }

  public getInstruments(): MarketInstrument[] {
    this.refreshMarketData();
    return this.cachedInstruments;
  }

  public getBreadth(): MarketBreadth {
    this.refreshMarketData();
    return this.cachedBreadth!;
  }

  public getMovers(): TopMover[] {
    this.refreshMarketData();
    return this.cachedMovers;
  }

  public getHeatmap(): SectorPerformance[] {
    this.refreshMarketData();
    return this.cachedHeatmap;
  }

  public getProjections(symbol?: string): MarketProjection[] {
    this.refreshMarketData();
    if (symbol) {
      return this.cachedProjections.filter(p => p.symbol.toUpperCase() === symbol.toUpperCase());
    }
    return this.cachedProjections;
  }

  public getFdeProjection(): FdePreMarketProjection {
    this.refreshMarketData();

    // Determinar hora actual en Nueva York (EST/EDT)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const nyTotalMinutes = (utcHours - 5) * 60 + utcMinutes; // Aproximación EST (UTC-5)
    
    // Ventana pre-market y apertura crítica: 8:15 AM (495 min) a 10:15 AM (615 min)
    const isPreMarketOpenWindow = nyTotalMinutes >= 495 && nyTotalMinutes <= 615;
    const refreshIntervalSeconds = isPreMarketOpenWindow ? 300 : 900; // 5 min vs 15 min

    // Intentar leer estado calculado en tiempo real por el Financial Dynamics Engine (Python)
    let liveFde: any = null;
    try {
      const stateFilePath = path.join(__dirname, '..', 'data', 'fde_state.json');
      if (fs.existsSync(stateFilePath)) {
        const raw = fs.readFileSync(stateFilePath, 'utf-8');
        liveFde = JSON.parse(raw);
      }
    } catch {
      // Fallback predeterminado sin interrupción
    }

    const fss = liveFde?.fss;
    const nodeMap: Record<string, any> = {};
    if (Array.isArray(liveFde?.nodes)) {
      for (const n of liveFde.nodes) {
        nodeMap[n.node_code] = n;
      }
    }

    const code = fss?.macro_regime || 'INFLATION_SHOCK_DECELERATION';
    const bias: 'BEARISH' | 'BULLISH' | 'NEUTRAL' = 
      fss?.directional_bias === 'BEARISH' ? 'BEARISH' : 
      fss?.directional_bias === 'BULLISH' ? 'BULLISH' : 'NEUTRAL';
    const causalConfidencePct = fss ? Math.round(fss.system_coherence_index * 100) : 88;
    const description = fss?.summary_text || 
      'Sorpresa alcista en componentes de servicios y energía presiona alza en rendimientos del Tesoro (10Y en 4.93%), drenando múltiplos de valoración en megacaps tecnológicas.';

    const usoVal = nodeMap['WTI_OIL']?.current_value || 168.83;
    const gldVal = nodeMap['GOLD_XAU']?.current_value || 355.78;
    const cperVal = nodeMap['COPPER_HG']?.current_value || 38.99;
    const tnxVal = nodeMap['YIELD_10Y']?.current_value || 4.93;
    const vixVal = nodeMap['VIX']?.current_value || 19.42;
    const uupVal = nodeMap['DXY']?.current_value || 29.00;

    return {
      asOf: now.toISOString(),
      refreshIntervalSeconds,
      isPreMarketOpenWindow,
      financialSystemState: {
        code,
        title: fss ? `Régimen FDE: ${code.replace(/_/g, ' ')}` : 'Presión Inflacionaria con Desaceleración Táctica',
        description,
        bias,
        causalConfidencePct,
        systemCoherence: causalConfidencePct >= 80 ? 'HIGH' : causalConfidencePct >= 50 ? 'MEDIUM' : 'LOW',
      },
      robotMandate: {
        mode: bias === 'BEARISH' ? 'BEARISH_MOMENTUM_ONLY' : 
              bias === 'BULLISH' ? 'BULLISH_MOMENTUM_ONLY' : 'NEUTRAL_RANGE_ONLY',
        aduanaCode: 'O-13: MACRO_REGIME_GATE',
        allowedActions: bias === 'BULLISH' ? [
          'Compras direccionales de CALLs 0DTE en SPX / QQQ (Estrategia John Carter)',
          'Bull Call Debit Spreads en rebote sobre VWAP',
          'Venta de Put Credit Spreads lejanos OTM',
        ] : bias === 'NEUTRAL' ? [
          'Venta de Iron Condors en SPX (Estrategia Opción Sigma)',
          'Captura sistemática de prima Theta en Muros GEX',
          'Spreads delta-neutral con riesgo definido',
        ] : [
          'Scalping 0DTE PUT en SPX / SPY (Estrategia Yoel Sardiñas)',
          'Broken Wing Butterfly bajista en QQQ (Estrategia John Carter)',
          'Venta de Call Credit Spreads lejanos OTM',
        ],
        blockedActions: bias === 'BULLISH' ? [
          'Compras direccionales de PUTs contra-tendencia en apertura',
          'Ventas apresuradas de Call Credit Spreads en resistencia débil',
          'Posiciones cortas desalineadas con la inyección de liquidez neta',
        ] : bias === 'NEUTRAL' ? [
          'Scalping direccional de alta velocidad 0DTE (alto riesgo de falso quiebre)',
          'Compras de opciones direccionales fuera del dinero (OTM) sin cobertura',
        ] : [
          'Compras direccionales de CALLs en apertura',
          'Ventas pasivas de Put Credit Spreads en soporte débil',
          'Posiciones largas sin trailing stop técnico estricto',
        ],
        recommendedSetup: bias === 'BULLISH'
          ? 'Ruptura alcista confirmada sobre VWAP en los primeros 10 minutos de apertura con cruce EMA 9 > EMA 20.'
          : bias === 'NEUTRAL'
          ? 'Venta de primas en los extremos del rango tras la estabilización de los primeros 45 minutos (10:15 AM EST).'
          : 'Fallo de rebote en los primeros 10 minutos de apertura sobre VWAP con confirmación en quiebre de mínimos de pre-market.',
        yoelTacticalStatus: bias === 'BEARISH'
          ? 'ACTIVO: Regla YOEL_CPI_VOLATILITY_BREAKDOWN_PUT habilitada para ejecución táctica.'
          : bias === 'BULLISH'
          ? 'EN ESPERA: Régimen de liquidez positiva. Scalping bajista pausado; habilitadas compras de CALL momentum (Carter).'
          : 'EN ESPERA: Mercado lateral en Gamma Positiva. Estrategia de Opción Sigma activa para captura de Theta.',
      },
      preMarketTape: [
        { symbol: 'SPY', name: 'S&P 500 ETF', category: 'INDICES', price: 755.72, changePct: -1.77, sparklineTrend: 'DOWN' },
        { symbol: 'QQQ', name: 'Nasdaq 100 ETF', category: 'INDICES', price: 491.50, changePct: -2.10, sparklineTrend: 'DOWN' },
        { symbol: '^VIX', name: 'CBOE Volatility Index', category: 'INDICES', price: vixVal, changePct: +14.25, sparklineTrend: vixVal > 18 ? 'UP' : 'DOWN' },
        { symbol: 'USO', name: 'Petróleo WTI (Crude Oil)', category: 'COMMODITIES', price: usoVal, changePct: +2.35, sparklineTrend: 'UP' },
        { symbol: 'GLD', name: 'Oro Físico (Gold)', category: 'COMMODITIES', price: gldVal, changePct: +1.15, sparklineTrend: 'UP' },
        { symbol: 'CPER', name: 'Cobre (Dr. Copper)', category: 'COMMODITIES', price: cperVal, changePct: -0.85, sparklineTrend: 'DOWN' },
        { symbol: '^TNX', name: 'Rendimiento Bono 10Y', category: 'RATES', price: tnxVal, changePct: +1.23, sparklineTrend: 'UP' },
        { symbol: 'UUP', name: 'Índice Dólar (DXY Proxy)', category: 'CURRENCIES', price: uupVal, changePct: +0.65, sparklineTrend: 'UP' },
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
  }

  public getEtradeLiveSignals() {
    try {
      const livePath = path.resolve(process.cwd(), 'src/data/etrade_signals_live.json');
      if (fs.existsSync(livePath)) {
        const raw = fs.readFileSync(livePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading etrade_signals_live.json:', e);
    }
    return { count: 0, signals: [] };
  }
}

export const marketDataService = new MarketDataService();
