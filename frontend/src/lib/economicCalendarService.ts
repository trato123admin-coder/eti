export interface EconomicEvent {
  id: string;
  title: string;
  category: 'INFLATION' | 'EMPLOYMENT' | 'MONETARY' | 'GROWTH' | 'COMMODITIES' | 'MANUFACTURING';
  date: string;
  time: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  country: 'US';
  unit: '%' | 'K' | 'B' | 'PTS' | 'USD';
  previous: number;
  expected: number;
  actual: number | null;
  status: 'PUBLISHED' | 'UPCOMING';
  description: string;
  primaryCausalTransmission: {
    layer0: string; // Geopolítica / Evento
    layer1: string; // Tasas / Rendimiento 10Y / Dólar
    layer2: string; // Economía Real / Inflación
    layer3: string; // Volatilidad VIX / Net Gamma GEX
    layer4: string; // Sectores Tech vs Defensivos
    layer5: string; // Mandato ADUANA O-13 & Opciones 0DTE
  };
  historicalContext: string;
}

export interface CausalMarketImpact {
  eventTitle: string;
  actualValue: number;
  expectedValue: number;
  surpriseShock: number;
  shockDirection: 'HAWKISH' | 'DOVISH' | 'NEUTRAL';
  macroRegime: 'DECELERATION' | 'EXPANSION' | 'INFLATION_SURPRISE' | 'NEUTRAL_RANGE' | 'STAGFLATION';
  coherencePct: number;
  transmissionSteps: Array<{
    layer: number;
    layerName: string;
    node: string;
    shockValue: string;
    signal: 'BEARISH' | 'BULLISH' | 'NEUTRAL' | 'EXTREME_VOLATILITY';
    explanation: string;
  }>;
  robotMandate: {
    mode: string;
    aduanaCode: string;
    recommendedStrategy: string;
    tacticalAdvice: string;
    allowedActions: string[];
    blockedActions: string[];
  };
  assetProjections: {
    spx: { symbol: 'SPX'; projectedPrice: number; deltaPct: number; optionBias: 'PUT 0DTE' | 'CALL 0DTE' | 'IRON CONDOR'; triggerLevel: number; stopLevel: number };
    spy: { symbol: 'SPY'; projectedPrice: number; deltaPct: number; optionBias: 'PUT 0DTE' | 'CALL 0DTE' | 'RANGE'; triggerLevel: number; stopLevel: number };
    qqq: { symbol: 'QQQ'; projectedPrice: number; deltaPct: number; optionBias: 'PUT 0DTE' | 'CALL 0DTE' | 'RANGE'; triggerLevel: number; stopLevel: number };
    meta: { symbol: 'META'; projectedPrice: number; deltaPct: number; optionBias: 'PUT 0DTE' | 'CALL 0DTE' | 'RANGE'; triggerLevel: number; stopLevel: number };
    nvda: { symbol: 'NVDA'; projectedPrice: number; deltaPct: number; optionBias: 'PUT 0DTE' | 'CALL 0DTE' | 'RANGE'; triggerLevel: number; stopLevel: number };
  };
}

export const US_ECONOMIC_CALENDAR_2026: EconomicEvent[] = [
  {
    id: 'cpi-nov-2026',
    title: 'IPC Subyacente (Core CPI YoY)',
    category: 'INFLATION',
    date: '2026-11-02',
    time: '08:30 EST',
    importance: 'HIGH',
    country: 'US',
    unit: '%',
    previous: 3.2,
    expected: 3.1,
    actual: 3.4,
    status: 'PUBLISHED',
    description: 'Mide la variación en los precios de bienes y servicios excluyendo alimentos y energía. Es el catalizador de mayor volatilidad para el S&P 500 y yields del Tesoro.',
    primaryCausalTransmission: {
      layer0: 'Publicación exógena BLS a las 8:30 AM EST.',
      layer1: 'Rendimiento Bono 10Y (^TNX) absorbe presión alcista (+8 bps a 4.93%); Dólar DXY se fortalece.',
      layer2: 'Persistencia de inflación en servicios de alquiler y seguros.',
      layer3: 'Spike en VIX (+3.8 pts) y compresión del GEX de creadores de mercado a zona negativa (< 0).',
      layer4: 'Descuento de múltiplos de PER en megacaps tecnológicas (NVDA, META, MSFT).',
      layer5: 'Aduana O-13 activa: ALLOW_PUTS_ONLY. Scalping de momentum PUT 0DTE (Estrategia Yoel Sardiñas).'
    },
    historicalContext: 'En febrero 2026, una sorpresa de +0.30% en CPI causó una caída inmediata de 82 puntos en SPX en los primeros 15 minutos.'
  },
  {
    id: 'fomc-rate-decision',
    title: 'Decisión de Tasas de la Fed (FOMC)',
    category: 'MONETARY',
    date: '2026-11-04',
    time: '14:00 EST',
    importance: 'HIGH',
    country: 'US',
    unit: '%',
    previous: 5.00,
    expected: 4.75,
    actual: null,
    status: 'UPCOMING',
    description: 'Anuncio del tipo de interés interbancario de la Reserva Federal (Fed Funds Rate) acompañado por el comunicado de política monetaria y conferencia de prensa de Jerome Powell.',
    primaryCausalTransmission: {
      layer0: 'Comunicado FOMC a las 14:00 EST y conferencia de prensa a las 14:30 EST.',
      layer1: 'Impacto directo en la Curva de Rendimientos (2Y/10Y) y facilidad de repos inversos (RRP).',
      layer2: 'Costo del crédito para empresas y tasas hipotecarias.',
      layer3: 'Inyección o drenaje de volatilidad implícita en la cadena de opciones SPX.',
      layer4: 'Sector financiero (XLF) y Real Estate (XLRE).',
      layer5: 'Mandato de congelamiento preventivo O-11 durante los 15 minutos previos y posteriores al anuncio.'
    },
    historicalContext: 'Los recortes de 25 bps anticipados tienden a inducir rallies en activos de riesgo, salvo que Powell adopte un tono Hawkish en la sesión de preguntas.'
  },
  {
    id: 'nfp-jobs-report',
    title: 'Nóminas No Agrícolas (NFP)',
    category: 'EMPLOYMENT',
    date: '2026-11-06',
    time: '08:30 EST',
    importance: 'HIGH',
    country: 'US',
    unit: 'K',
    previous: 216,
    expected: 175,
    actual: null,
    status: 'UPCOMING',
    description: 'Creación de puestos de trabajo no agrícolas en EE.UU. durante el mes precedente. Mide la robustez del mercado laboral y la presión de salarios.',
    primaryCausalTransmission: {
      layer0: 'Informe del Departamento de Trabajo (BLS) el primer viernes de mes.',
      layer1: 'Tasas de descuento proyectadas para decisiones de la Fed.',
      layer2: 'Ingreso disponible y demanda agregada del consumidor estadounidense.',
      layer3: 'Posicionamiento institucional en futuros E-mini SPX.',
      layer4: 'Cíclicas vs Defensivas.',
      layer5: 'Alineación de filtros de entrada en apertura: confirmación de VWAP y breakout pre-market.'
    },
    historicalContext: 'Cifras por encima de 240K alejan recortes de tasas y suelen provocar ventas en Nasdaq; cifras por debajo de 120K reviven temores de recesión.'
  },
  {
    id: 'ppi-producer-prices',
    title: 'Índice de Precios al Productor (PPI YoY)',
    category: 'INFLATION',
    date: '2026-11-12',
    time: '08:30 EST',
    importance: 'MEDIUM',
    country: 'US',
    unit: '%',
    previous: 2.8,
    expected: 2.6,
    actual: null,
    status: 'UPCOMING',
    description: 'Refleja los precios a nivel de fábrica y mayorista. Funciona como indicador líder temprano para el CPI de los próximos meses.',
    primaryCausalTransmission: {
      layer0: 'Datos de inflación industrial al por mayor.',
      layer1: 'Expectativas de inflación de largo plazo en TIPS.',
      layer2: 'Márgenes operativos brutos de empresas S&P 500.',
      layer3: 'Movimiento de cobertura en commodities energéticas (WTI).',
      layer4: 'Sector Industrial (XLI) y Materiales Básicos (XLB).',
      layer5: 'Calibración de spreads bid/ask en el Experience Ledger.'
    },
    historicalContext: 'Un PPI por debajo de lo esperado valida la convergencia inflacionaria hacia el objetivo del 2% de la Fed.'
  },
  {
    id: 'jobless-claims-weekly',
    title: 'Peticiones Iniciales de Subsidio por Desempleo',
    category: 'EMPLOYMENT',
    date: '2026-11-05',
    time: '08:30 EST',
    importance: 'MEDIUM',
    country: 'US',
    unit: 'K',
    previous: 216,
    expected: 220,
    actual: null,
    status: 'UPCOMING',
    description: 'Solicitudes semanales de subsidio por desempleo. Frecuencia alta de detección de enfriamiento en el empleo formal.',
    primaryCausalTransmission: {
      layer0: 'Publicación semanal de los jueves a las 8:30 AM EST.',
      layer1: 'Ajuste fino de probabilidades FedWatch.',
      layer2: 'Tasa de consumo corriente.',
      layer3: 'Sesgo direccional intradiario antes del toque de campana.',
      layer4: 'Consumo Discrecional (XLY).',
      layer5: 'Determinación del sesgo de apertura (Gap Fade vs Gap Go).'
    },
    historicalContext: 'Cifras estables entre 210K y 230K señalan un aterrizaje suave (Soft Landing).'
  },
  {
    id: 'ism-manufacturing-pmi',
    title: 'ISM Manufacturero (Purchasing Managers Index)',
    category: 'MANUFACTURING',
    date: '2026-11-03',
    time: '10:00 EST',
    importance: 'HIGH',
    country: 'US',
    unit: 'PTS',
    previous: 47.2,
    expected: 48.6,
    actual: null,
    status: 'UPCOMING',
    description: 'Índice de actividad fabril basado en encuestas a directores de compras. Una lectura superior a 50 indica expansión; inferior a 50, contracción.',
    primaryCausalTransmission: {
      layer0: 'Publicación a las 10:00 AM EST (30 min después de la apertura).',
      layer1: 'Velocidad de circulación monetaria y ratio Cobre/Oro.',
      layer2: 'Cartera de pedidos nuevos, producción e inventarios.',
      layer3: 'Ruptura o rechazo en Muros GEX de Market Makers a las 10:15 AM.',
      layer4: 'Industriales (XLI) y Semiconductores (SMH).',
      layer5: 'Activación de la segunda ventana operativa (Opción Sigma - Iron Condors).'
    },
    historicalContext: 'Rebotes sobre 49.5 suelen revertir caídas matutinas si el componente de nuevos pedidos es sólido.'
  },
  {
    id: 'crude-oil-inventories',
    title: 'Inventarios de Petróleo Crudo de la AIE (EIA)',
    category: 'COMMODITIES',
    date: '2026-11-04',
    time: '10:30 EST',
    importance: 'MEDIUM',
    country: 'US',
    unit: 'B',
    previous: 2.1,
    expected: -1.2,
    actual: null,
    status: 'UPCOMING',
    description: 'Cambio semanal en el número de barriles de crudo comercial en inventarios de EE.UU.',
    primaryCausalTransmission: {
      layer0: 'Informe semanal de energía de los miércoles a las 10:30 EST.',
      layer1: 'Expectativas de inflación de corto plazo ligadas al combustible.',
      layer2: 'Cotización del WTI (USO) y gasolina RBOB.',
      layer3: 'Correlación inversa con el transporte aéreo y logístico.',
      layer4: 'Sector Energía (XLE, XOM, CVX).',
      layer5: 'Ajuste de niveles de invalidación en el robot de opciones.'
    },
    historicalContext: 'Drenajes masivos (> 4M barriles) impulsan el WTI sobre niveles de resistencia.'
  }
];

export function calculateCausalImpact(
  event: EconomicEvent,
  overrideActual?: number,
  basePrices: { spx: number; spy: number; qqq: number; meta: number; nvda: number } = {
    spx: 7615.48,
    spy: 759.19,
    qqq: 695.12,
    meta: 613.84,
    nvda: 207.95,
  }
): CausalMarketImpact {
  const actual = overrideActual !== undefined ? overrideActual : (event.actual !== null ? event.actual : event.expected);
  const diff = Number((actual - event.expected).toFixed(2));

  let shockDirection: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' = 'NEUTRAL';
  let intensity = 0; // 0 a 1

  if (event.category === 'INFLATION') {
    if (diff > 0.05) {
      shockDirection = 'HAWKISH';
      intensity = Math.min(1, diff / 0.4);
    } else if (diff < -0.05) {
      shockDirection = 'DOVISH';
      intensity = Math.min(1, Math.abs(diff) / 0.4);
    }
  } else if (event.category === 'EMPLOYMENT') {
    if (event.unit === 'K' && diff > 25) {
      shockDirection = 'HAWKISH'; // Empleo caliente -> tasas altas
      intensity = Math.min(1, diff / 100);
    } else if (event.unit === 'K' && diff < -25) {
      shockDirection = 'DOVISH'; // Enfriamiento
      intensity = Math.min(1, Math.abs(diff) / 100);
    }
  } else if (event.category === 'MONETARY') {
    if (diff > 0.05) {
      shockDirection = 'HAWKISH';
      intensity = Math.min(1, diff / 0.5);
    } else if (diff < -0.05) {
      shockDirection = 'DOVISH';
      intensity = Math.min(1, Math.abs(diff) / 0.5);
    }
  } else if (event.category === 'MANUFACTURING') {
    if (diff > 1.0) {
      shockDirection = 'DOVISH'; // Expansión sana
      intensity = Math.min(1, diff / 3.0);
    } else if (diff < -1.0) {
      shockDirection = 'HAWKISH'; // Desaceleración
      intensity = Math.min(1, Math.abs(diff) / 3.0);
    }
  }

  // Magnitudes y Deltas
  const isHawkish = shockDirection === 'HAWKISH';
  const isDovish = shockDirection === 'DOVISH';

  const tnxYieldDeltaBps = isHawkish ? +(6 + intensity * 8) : isDovish ? -(5 + intensity * 7) : 0;
  const vixShockDelta = isHawkish ? +(2.5 + intensity * 4.5) : isDovish ? -(1.8 + intensity * 2.2) : 0;
  const dxyDeltaPct = isHawkish ? +(0.4 + intensity * 0.5) : isDovish ? -(0.3 + intensity * 0.4) : 0;

  // Impacto en activos (Acciones y ETFs)
  const spxPct = isHawkish ? -(1.1 + intensity * 1.5) : isDovish ? +(0.9 + intensity * 1.3) : 0.05;
  const spyPct = Number(spxPct.toFixed(2));
  const qqqPct = isHawkish ? Number((spxPct * 1.35).toFixed(2)) : Number((spxPct * 1.3).toFixed(2));
  const metaPct = isHawkish ? Number((spxPct * 1.25).toFixed(2)) : Number((spxPct * 1.2).toFixed(2));
  const nvdaPct = isHawkish ? Number((spxPct * 1.6).toFixed(2)) : Number((spxPct * 1.55).toFixed(2));

  const spxProj = Number((basePrices.spx * (1 + spxPct / 100)).toFixed(2));
  const spyProj = Number((basePrices.spy * (1 + spyPct / 100)).toFixed(2));
  const qqqProj = Number((basePrices.qqq * (1 + qqqPct / 100)).toFixed(2));
  const metaProj = Number((basePrices.meta * (1 + metaPct / 100)).toFixed(2));
  const nvdaProj = Number((basePrices.nvda * (1 + nvdaPct / 100)).toFixed(2));

  const macroRegime = isHawkish
    ? (event.category === 'INFLATION' ? 'INFLATION_SURPRISE' : 'DECELERATION')
    : isDovish
    ? 'EXPANSION'
    : 'NEUTRAL_RANGE';

  const transmissionSteps = [
    {
      layer: 0,
      layerName: 'Capa 0: Shocks Exógenos',
      node: event.title,
      shockValue: `${diff >= 0 ? '+' : ''}${diff}${event.unit} (${shockDirection})`,
      signal: isHawkish ? ('BEARISH' as const) : isDovish ? ('BULLISH' as const) : ('NEUTRAL' as const),
      explanation: `Dato publicado de ${actual}${event.unit} vs ${event.expected}${event.unit} esperado genera una sorpresa de choque macroeconómico inmediata.`
    },
    {
      layer: 1,
      layerName: 'Capa 1: Raíz Monetaria & Yields',
      node: 'Treasury 10Y Yield (^TNX)',
      shockValue: `${tnxYieldDeltaBps >= 0 ? '+' : ''}${tnxYieldDeltaBps.toFixed(1)} bps`,
      signal: isHawkish ? ('BEARISH' as const) : isDovish ? ('BULLISH' as const) : ('NEUTRAL' as const),
      explanation: isHawkish
        ? 'Inversores exigen mayor prima en deuda soberana. Costo de capital restrictivo aumenta la tasa de descuento.'
        : 'Relajación en los rendimientos de bonos alivia condiciones financieras globales.'
    },
    {
      layer: 2,
      layerName: 'Capa 2: Economía Real & Precios',
      node: 'Índice Dólar (DXY Proxy UUP)',
      shockValue: `${dxyDeltaPct >= 0 ? '+' : ''}${dxyDeltaPct.toFixed(2)}%`,
      signal: isHawkish ? ('BEARISH' as const) : isDovish ? ('BULLISH' as const) : ('NEUTRAL' as const),
      explanation: isHawkish
        ? 'Atracción de capital hacia el billete verde, drenando liquidez de activos de riesgo y mercados emergentes.'
        : 'Debilitamiento del dólar favorece flujos de liquidez hacia activos de alta beta.'
    },
    {
      layer: 3,
      layerName: 'Capa 3: Transmisores & GEX',
      node: 'Volatilidad CBOE (VIX) & Net Gamma',
      shockValue: `${vixShockDelta >= 0 ? '+' : ''}${vixShockDelta.toFixed(1)} pts (${isHawkish ? 'Negative Gamma' : 'Positive Gamma'})`,
      signal: isHawkish ? ('EXTREME_VOLATILITY' as const) : ('BULLISH' as const),
      explanation: isHawkish
        ? 'El VIX se dispara; los creadores de mercado caen en Gamma Negativa vendiendo activos en cada caída para cubrirse.'
        : 'Contracción de volatilidad (IV Crush); el mercado entra en Gamma Positiva conteniendo oscilaciones.'
    },
    {
      layer: 4,
      layerName: 'Capa 4: Dinámica Sectorial',
      node: 'Tecnología (XLK) & Semiconductores (SMH)',
      shockValue: `${qqqPct}%`,
      signal: isHawkish ? ('BEARISH' as const) : isDovish ? ('BULLISH' as const) : ('NEUTRAL' as const),
      explanation: isHawkish
        ? 'Castigo severo en múltiplos de valoración (P/E) de empresas de crecimiento como NVDA, META y AAPL.'
        : 'Rally de compresión en tecnológicas impulsado por expansión de múltiplos.'
    },
    {
      layer: 5,
      layerName: 'Capa 5: Micro-Ejecución 0DTE',
      node: 'Mandato Robot ADUANA O-13',
      shockValue: isHawkish ? 'ALLOW_PUTS_ONLY' : isDovish ? 'ALLOW_CALLS_ONLY' : 'ALLOW_NEUTRAL_ONLY',
      signal: isHawkish ? ('BEARISH' as const) : isDovish ? ('BULLISH' as const) : ('NEUTRAL' as const),
      explanation: isHawkish
        ? 'ADUANA bloquea compras de CALLs; autoriza compras direccionales de PUTs 0DTE en fallo de rebote sobre VWAP.'
        : 'ADUANA habilita compras de CALLs en confirmación de soporte matutino y quiebre de pre-market high.'
    }
  ];

  const robotMandate = isHawkish
    ? {
        mode: 'BEARISH_MOMENTUM_ONLY',
        aduanaCode: 'O-13: ALLOW_PUTS_ONLY',
        recommendedStrategy: 'YOEL_CPI_VOLATILITY_BREAKDOWN_PUT',
        tacticalAdvice: 'Monitorear los primeros 10 minutos de apertura. Esperar intento de rebote débil hacia VWAP; entrar en PUTs 0DTE de SPX/META en cuanto se confirme el fallo con toma de ganancias rápida (+30% a +40%).',
        allowedActions: [
          'Scalping 0DTE PUT en SPX / SPY (Estrategia Yoel Sardiñas)',
          'Broken Wing Butterfly bajista en QQQ',
          'Venta de Call Credit Spreads lejanos OTM',
        ],
        blockedActions: [
          'Compras direccionales de CALLs en apertura',
          'Ventas pasivas de Put Credit Spreads en soporte débil',
          'Posiciones largas sin trailing stop técnico estricto',
        ],
      }
    : isDovish
    ? {
        mode: 'BULLISH_MOMENTUM_ONLY',
        aduanaCode: 'O-13: ALLOW_CALLS_ONLY',
        recommendedStrategy: 'CARTER_BULL_MOMENTUM_CALL_0DTE',
        tacticalAdvice: 'Apertura con sesgo expansivo. Comprar CALLs de momentum en SPX / QQQ tras consolidar sobre el VWAP de 2 minutos y confluencia de volumen institucional.',
        allowedActions: [
          'Compras direccionales de CALLs 0DTE en SPX / QQQ',
          'Bull Call Debit Spreads en rebote sobre VWAP',
          'Venta de Put Credit Spreads lejanos OTM',
        ],
        blockedActions: [
          'Compras direccionales de PUTs contra-tendencia en apertura',
          'Ventas apresuradas de Call Credit Spreads en resistencia débil',
          'Posiciones cortas desalineadas con la inyección de liquidez neta',
        ],
      }
    : {
        mode: 'NEUTRAL_RANGE_ONLY',
        aduanaCode: 'O-13: ALLOW_NEUTRAL_ONLY',
        recommendedStrategy: 'SIGMA_IRON_CONDOR_GEX_WALLS',
        tacticalAdvice: 'Dato en línea con consenso sin choques exógenos. Estrategia de Opción Sigma: vender Iron Condors de riesgo definido en los Muros GEX tras los primeros 45 min de estabilización.',
        allowedActions: [
          'Venta de Iron Condors en SPX (Estrategia Opción Sigma)',
          'Captura sistemática de prima Theta en Muros GEX',
          'Spreads delta-neutral con riesgo definido',
        ],
        blockedActions: [
          'Scalping direccional de alta velocidad 0DTE (alto riesgo de falso quiebre)',
          'Compras de opciones direccionales fuera del dinero (OTM) sin cobertura',
        ],
      };

  return {
    eventTitle: event.title,
    actualValue: actual,
    expectedValue: event.expected,
    surpriseShock: diff,
    shockDirection,
    macroRegime,
    coherencePct: Math.round(86 + intensity * 8),
    transmissionSteps,
    robotMandate,
    assetProjections: {
      spx: {
        symbol: 'SPX',
        projectedPrice: spxProj,
        deltaPct: spxPct,
        optionBias: isHawkish ? 'PUT 0DTE' : isDovish ? 'CALL 0DTE' : 'IRON CONDOR',
        triggerLevel: Number((spxProj * (isHawkish ? 0.996 : 1.004)).toFixed(2)),
        stopLevel: Number((spxProj * (isHawkish ? 1.005 : 0.995)).toFixed(2)),
      },
      spy: {
        symbol: 'SPY',
        projectedPrice: spyProj,
        deltaPct: spyPct,
        optionBias: isHawkish ? 'PUT 0DTE' : isDovish ? 'CALL 0DTE' : 'RANGE',
        triggerLevel: Number((spyProj * (isHawkish ? 0.996 : 1.004)).toFixed(2)),
        stopLevel: Number((spyProj * (isHawkish ? 1.005 : 0.995)).toFixed(2)),
      },
      qqq: {
        symbol: 'QQQ',
        projectedPrice: qqqProj,
        deltaPct: qqqPct,
        optionBias: isHawkish ? 'PUT 0DTE' : isDovish ? 'CALL 0DTE' : 'RANGE',
        triggerLevel: Number((qqqProj * (isHawkish ? 0.995 : 1.005)).toFixed(2)),
        stopLevel: Number((qqqProj * (isHawkish ? 1.006 : 0.994)).toFixed(2)),
      },
      meta: {
        symbol: 'META',
        projectedPrice: metaProj,
        deltaPct: metaPct,
        optionBias: isHawkish ? 'PUT 0DTE' : isDovish ? 'CALL 0DTE' : 'RANGE',
        triggerLevel: Number((metaProj * (isHawkish ? 0.994 : 1.006)).toFixed(2)),
        stopLevel: Number((metaProj * (isHawkish ? 1.008 : 0.992)).toFixed(2)),
      },
      nvda: {
        symbol: 'NVDA',
        projectedPrice: nvdaProj,
        deltaPct: nvdaPct,
        optionBias: isHawkish ? 'PUT 0DTE' : isDovish ? 'CALL 0DTE' : 'RANGE',
        triggerLevel: Number((nvdaProj * (isHawkish ? 0.993 : 1.007)).toFixed(2)),
        stopLevel: Number((nvdaProj * (isHawkish ? 1.01 : 0.99)).toFixed(2)),
      },
    },
  };
}
