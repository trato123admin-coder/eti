"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Film, Award, CheckCircle2, AlertCircle, ArrowRight,
  TrendingUp, Activity, FileText, Layers, ShieldCheck,
  Clock, DollarSign, Bot, ChevronRight, Search, Filter,
  Sparkles, ExternalLink, Zap, BarChart2, Shield, Eye
} from "lucide-react";

export default function ChannelExecutiveDetailPage() {
  const params = useParams();
  const channelId = (params?.id as string) || "src_opcion_sigma";

  const [activeTab, setActiveTab] = useState<"OPTIONS" | "SCALPING" | "SWING" | "CATALOG">("OPTIONS");
  const [videoFilter, setVideoFilter] = useState<string>("ALL");
  const [videoSearch, setVideoSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // Formateador numérico determinista (elimina desajustes de hidratación Server/Client)
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Detección dinámica de canal
  const isGala = channelId.toLowerCase().includes("gala");
  const isYoel = channelId.toLowerCase().includes("yoel");
  const isInsight = channelId.toLowerCase().includes("insight") || channelId.toLowerCase().includes("lakha");
  const isSimpler = channelId.toLowerCase().includes("simpler") || channelId.toLowerCase().includes("carter");

  // Datos mock enriquecidos del canal procesado
  const galaData = {
    id: channelId,
    name: "Gala Trades",
    handle: "@galatrades",
    channelUrl: "https://www.youtube.com/@galatrades",
    channelId: "UCcyZj4TT84GBBp9xeKMNOEQ",
    country: "US / Canada",
    subscriberCount: 120000,
    totalChannelVideos: 111,
    relevantVideosInWindow: 78,
    validityYears: 3,
    totalAudioHours: 32.5,
    credibilityScore: 80.0,
    rulesExtracted: 8,
    rulesInRulePack: 2,
    costUsd: 0.0,
    aiModel: "Google Gemini 3.5 Flash (Free Tier)",
    executiveSummary:
      "Canal especializado en Day Trading y Scalping agresivo de opciones intradía sobre SPY, QQQ y Tesla en temporalidades de 2m y 5m. Su enfoque se centra en entradas de alta convicción en la primera hora tras la campana (ORB 15 min), confluencias de volumen y gestión de riesgo asimétrica (ratio 1:2).",
    keyConclusions: [
      {
        title: "Sesgo Operativo Principal: Scalping Momentum (2m y 5m)",
        desc: "El 85% de las operaciones se ejecutan entre las 09:45 y las 11:00 EST utilizando contratos ATM (Delta 0.50) sobre SPY y QQQ para capturar impulsos direccionales rápidos.",
        type: "SCALPING",
      },
      {
        title: "Regla del Rango de Apertura (ORB 15 Minutos)",
        desc: "Filtro obligatorio: no operar los primeros 15 minutos. Esperar el High/Low del rango y entrar únicamente en el retesteo confirmado con incremento de volumen.",
        type: "INTRADAY",
      },
      {
        title: "Disciplina de Salida Escalonada y Break-Even",
        desc: "Toma de beneficios obligatoria: liquidar el 50% de la posición en +20% del contrato y mover el stop loss al precio de entrada (Break-Even) sin excepciones.",
        type: "RISK_MGMT",
      },
    ],
  };

  const yoelData = {
    id: channelId,
    name: "Yoel Sardiñas",
    handle: "@yoelsardinasoficial",
    channelUrl: "https://www.youtube.com/@yoelsardinasoficial",
    channelId: "UCCx57FgNFwYhWQrIjx0_Fkg",
    country: "US / Cuba",
    subscriberCount: 180000,
    totalChannelVideos: 1796,
    relevantVideosInWindow: 578,
    validityYears: 3,
    totalAudioHours: 211.9,
    credibilityScore: 82.0,
    rulesExtracted: 8,
    rulesInRulePack: 2,
    costUsd: 0.0,
    aiModel: "Google Gemini 3.5 Flash (Free Tier)",
    executiveSummary:
      "Canal especializado en inversión y trading de opciones con enfoque en generación de ingresos recurrentes, venta de primas y coberturas. Su metodología destaca por el uso de Spreads de Crédito verticales, Iron Condors mensuales a 45 días y gestión de riesgo asimétrica para cuentas minoristas e intermedias.",
    keyConclusions: [
      {
        title: "Sesgo Operativo Principal: Swing Trading con Opciones (Spreads)",
        desc: "El 70% del canal promueve la venta de volatilidad y captura de decaimiento Theta a través de Credit Spreads a 30-45 días con alta probabilidad de éxito.",
        type: "SWING",
      },
      {
        title: "Estructuras Iron Condor Neutrales",
        desc: "Operativa mensual en SPY/QQQ colocando alas cortas en Delta 15 y cerrando la posición al alcanzar el 50% de ganancia máxima.",
        type: "INTRADAY",
      },
      {
        title: "Regla del Stop Loss Asimétrico (2x Crédito)",
        desc: "Nunca esperar a que un spread expire en valor intrínseco: cortar la pérdida automáticamente si alcanza 2 veces el crédito neto inicial.",
        type: "RISK_MGMT",
      },
    ],
  };

  const insightData = {
    id: channelId,
    name: "Options Insight (Imran Lakha)",
    handle: "@OptionsInsight",
    channelUrl: "https://www.youtube.com/@OptionsInsight",
    channelId: "UCUH81ZPntiP1Bc1ATjvBKYQ",
    country: "United Kingdom",
    subscriberCount: 6980,
    totalChannelVideos: 815,
    relevantVideosInWindow: 262,
    validityYears: 3,
    totalAudioHours: 96.1,
    credibilityScore: 88.0,
    rulesExtracted: 9,
    rulesInRulePack: 3,
    costUsd: 0.0,
    aiModel: "Google Gemini 3.5 Flash (Free Tier)",
    executiveSummary:
      "Canal de análisis institucional y macro de derivados liderado por Imran Lakha (ex-trader institucional). Su metodología combina análisis de Volatility Skew, estructura temporal (Term Structure / Contango / Backwardation), niveles de Gamma Exposure (GEX) y posicionamiento del dealer para determinar sesgos direccionales y regímenes de volatilidad.",
    keyConclusions: [
      {
        title: "Sesgo Operativo: Análisis de Volatilidad y Skew Institucional",
        desc: "El 80% del análisis se orienta a determinar si la volatilidad implícita está sobrecomprada o infravalorada respecto a la realizada, identificando desbalances de skew en SPX.",
        type: "INTRADAY",
      },
      {
        title: "Estructuras de Volatilidad: Term Structure & VIX Futures",
        desc: "Condición institucional: solo comprar opciones si la curva de futuros de VIX está en Contango moderado (<15%). En Backwardation, priorizar coberturas y spreads.",
        type: "SWING",
      },
      {
        title: "Filtro de Desbalance Gamma (Dealer Positioning)",
        desc: "Monitoreo de niveles clave de Call Wall y Put Wall en SPX/SPY para prever desaceleración o aceleración de movimientos intradía.",
        type: "RISK_MGMT",
      },
    ],
  };

  const simplerData = {
    id: channelId,
    name: "John Carter (Simpler Trading)",
    handle: "@SimplerTrading",
    channelUrl: "https://www.youtube.com/@SimplerTrading",
    channelId: "UCe_31pnBv4bW2A01X9H6c5w",
    country: "US (Austin, TX)",
    subscriberCount: 315000,
    totalChannelVideos: 310,
    relevantVideosInWindow: 145,
    validityYears: 3,
    totalAudioHours: 64.2,
    credibilityScore: 86.0,
    rulesExtracted: 11,
    rulesInRulePack: 4,
    costUsd: 0.0,
    aiModel: "Google Gemini 3.5 Flash (Free Tier)",
    executiveSummary:
      "Canal fundado por John Carter, autor de 'Mastering the Trade' y creador del indicador TTM Squeeze. Su metodología se basa en la identificación de fases de compresión de volatilidad (Bandas de Bollinger dentro de Canales de Keltner) seguidas de expansiones direccionales explosivas utilizando opciones out-of-the-money y debit spreads con asimetría positiva (ratio 1:3 o superior).",
    keyConclusions: [
      {
        title: "Sesgo Operativo Principal: Rupturas de Compresión con TTM Squeeze",
        desc: "El 75% de sus operaciones esperan un Squeeze rojo o negro en velas diarias/4h antes de entrar en opciones direccionales con Delta 0.60/0.70 buscando la primera vela de momentum alcista o bajista.",
        type: "SWING",
      },
      {
        title: "Estrategia Asimétrica de Opciones (Risk-Reward 1:3)",
        desc: "Utiliza compras de opciones con riesgo estrictamente definido (debit spreads y calls/puts simples). Jamás arriesga más del 2-3% de la cuenta por trade en eventos de squeeze.",
        type: "RISK_MGMT",
      },
      {
        title: "Regla de Salida por Momentum y Trailing Stop ATR",
        desc: "Cierre automático del 50% de la posición en la primera divergencia del histograma de momentum o al alcanzar 2x ATR diario desde el punto de ruptura.",
        type: "INTRADAY",
      },
    ],
  };

  const sigmaData = {
    id: channelId,
    name: "Opción Sigma (Luis Hernán Silva)",
    handle: "@OPCIONSIGMA",
    channelUrl: "https://www.youtube.com/@OPCIONSIGMA/videos",
    channelId: "UCjbEAhCd_8bEEbPbs4kJPEA",
    country: "US / Colombia",
    subscriberCount: 504000,
    totalChannelVideos: 722,
    relevantVideosInWindow: 245,
    validityYears: 3,
    totalAudioHours: 85.4,
    credibilityScore: 85.0,
    rulesExtracted: 27,
    rulesInRulePack: 3,
    costUsd: 0.0,
    aiModel: "Google Gemini 3.5 Flash (Free Tier)",
    executiveSummary:
      "Canal especializado en la operativa táctica de opciones financieras sobre índices estadounidenses (SPX, SPY, QQQ). Su metodología se basa en confluencias técnicas objetivas (VWAP, medias móviles exponenciales 9/20 y zonas de Gamma Cero / GEX) combinadas con una estricta disciplina de corte temporal para neutralizar la aceleración del decaimiento Theta en contratos 0DTE.",
    keyConclusions: [
      {
        title: "Sesgo Operativo Principal: Opciones Intradía (0DTE/SPX)",
        desc: "El 80% del valor del canal se enfoca en contratos que vencen el mismo día. La regla de oro es nunca dejar correr un trade después de las 15:45 EST debido al colapso destructivo del valor extrínseco.",
        type: "INTRADAY",
      },
      {
        title: "Estrategias Secundarias de Scalping (2 min)",
        desc: "Utiliza rupturas de niveles de pre-mercado y cruces de EMA 9 sobre 20 en marcos de 2 minutos para entradas de impulso rápido hacia la media móvil ponderada por volumen (VWAP).",
        type: "SCALPING",
      },
      {
        title: "Tácticas de Swing Trading y Cobertura Multidía",
        desc: "En periodos de alta volatilidad o caídas de mercado, recurre a spreads de crédito (Iron Condors a 45 días) y compras de Puts OTM de protección previa a eventos macroeconómicos (FOMC/CPI).",
        type: "SWING",
      },
    ],
  };

  const channelData = isGala ? galaData : isYoel ? yoelData : isInsight ? insightData : isSimpler ? simplerData : sigmaData;

  // Reglas de Gala Trades
  const galaRules = {
    OPTIONS: [
      {
        code: "RP_GALA_01_ORB15_BREAKOUT",
        title: "Ruptura de Rango de Apertura (ORB 15 Minutos)",
        direction: "AMBOS",
        delta: "0.50 (ATM)",
        dte: "0 - 1",
        status: "EN_RULE_PACK",
        stopLoss: "Reingreso al rango (máx 20%)",
        takeProfit: "40% o 1:2 R/R",
        regime: "OPENING_VOLATILITY",
        citation: "Estrategia ORB 15 min en SPY con Opciones (Minuto 06:30)",
      },
      {
        code: "RP_GALA_02_DELTA50_ATM_SELECTION",
        title: "Selección Estricta de Delta 0.50 ATM para Rapidez",
        direction: "AMBOS",
        delta: "0.50",
        dte: "0",
        status: "EN_RULE_PACK",
        stopLoss: "20%",
        takeProfit: "40%",
        regime: "INTRADAY",
        citation: "Por qué nunca compro OTM en Scalping de Opciones (Minuto 08:15)",
      },
      {
        code: "RP_GALA_03_SPREAD_FILTER_MAX_003",
        title: "Filtro de Horquilla: Rechazar contratos con Spread > $0.03",
        direction: "NEUTRAL",
        delta: "N/A",
        dte: "0",
        status: "AUDITADO_VIA_A",
        stopLoss: "Filtro pre-trade",
        takeProfit: "N/A",
        regime: "TODOS LOS REGÍMENES",
        citation: "Cómo evitar la pérdida silenciosa por Slippage (Minuto 04:50)",
      },
    ],
    SCALPING: [
      {
        code: "RP_GALA_04_EMA9_RETEST_SCALPING",
        title: "Entrada en Retest de EMA 9 en Velas de 2 Minutos",
        direction: "CALL / PUT",
        delta: "0.50",
        dte: "0",
        status: "EN_RULE_PACK",
        stopLoss: "Cierre de vela 2m bajo EMA 20 (máx 15%)",
        takeProfit: "25% - 30% del contrato",
        regime: "TRENDING_MOMENTUM",
        citation: "Masterclass de Scalping en Opciones: El Secreto de EMA 9 (Minuto 11:20)",
      },
      {
        code: "RP_GALA_05_KEY_PIVOT_REJECTION",
        title: "Rechazo en Pivotes Clave de Pre-Mercado",
        direction: "CONTRATENDENCIA",
        delta: "0.45",
        dte: "0",
        status: "AUDITADO_VIA_A",
        stopLoss: "Rotura del extremo + 1 vela",
        takeProfit: "Pullback a VWAP",
        regime: "RANGO / FALSO BREAKOUT",
        citation: "Cómo identificar trampas de liquidez y falsos breakouts (Minuto 15:45)",
      },
      {
        code: "RP_GALA_06_TRAILING_STOP_SCALPER",
        title: "Salida Escalonada: Tomar 50% en +20% y Trailing a Break-Even",
        direction: "GESTIÓN DE RIESGO",
        delta: "N/A",
        dte: "0",
        status: "EN_RULE_PACK",
        stopLoss: "Break-even asegurado tras TP1",
        takeProfit: "Dejar correr resto con trailing",
        regime: "TODOS LOS SCALPS",
        citation: "La regla de oro para no devolver las ganancias del día (Minuto 09:10)",
      },
    ],
    SWING: [
      {
        code: "RP_GALA_07_SWING_DEBIT_SPREAD_30DTE",
        title: "Vertical Debit Spreads a 30 DTE en Acciones Mega-Cap",
        direction: "CALL SPREAD",
        delta: "0.60 / 0.40",
        dte: "30",
        status: "AUDITADO_VIA_A",
        stopLoss: "50% de la prima pagada",
        takeProfit: "100% de la prima pagada",
        regime: "BULLISH_TREND_DAILY",
        citation: "Swing Trading con Spreads para cuentas pequeñas (Minuto 14:00)",
      },
    ],
  };

  // Reglas de Yoel Sardiñas
  const yoelRules = {
    OPTIONS: [
      {
        code: "RP_YOEL_01_VERTICAL_CREDIT_SPREAD",
        title: "Vertical Credit Spread con Probabilidad > 80% (Delta 15-20)",
        direction: "NEUTRAL_BULLISH",
        delta: "0.15 - 0.20",
        dte: "30 - 45",
        status: "EN_RULE_PACK",
        stopLoss: "2x del crédito inicial",
        takeProfit: "50% del crédito neto",
        regime: "TENDENCIAL_MODERADO",
        citation: "Estrategia de Crédito Vertical para Ingresos Mensuales (Minuto 14:20)",
      },
      {
        code: "RP_YOEL_02_IRON_CONDOR_MONTHLY",
        title: "Iron Condor Mensual en SPY con Alas Definidas",
        direction: "NEUTRAL",
        delta: "0.15 OTM",
        dte: "45",
        status: "EN_RULE_PACK",
        stopLoss: "Rotura de breakeven + 1 ATR",
        takeProfit: "50% del beneficio",
        regime: "LOW_VOLATILITY_RANGE",
        citation: "Cómo vivir de las opciones vendiendo Iron Condors (Minuto 18:00)",
      },
      {
        code: "RP_YOEL_03_ROLLING_DEFENSE_RULE",
        title: "Regla de Rolleo Defensivo al Testeo del Strike Corto",
        direction: "DEFENSA",
        delta: "N/A",
        dte: "14",
        status: "AUDITADO_VIA_A",
        stopLoss: "Rollear al siguiente ciclo mensual",
        takeProfit: "Extender duración por crédito",
        regime: "HIGH_EVENT_RISK",
        citation: "Cómo defender un spread perdedor sin quemar la cuenta (Minuto 22:30)",
      },
    ],
    SCALPING: [
      {
        code: "RP_YOEL_04_DIRECTIONAL_DEBIT_BREAKOUT",
        title: "Compras Direccionales de Opciones en Roturas Clave Semanales",
        direction: "CALL / PUT",
        delta: "0.60 In-The-Money",
        dte: "7 - 14",
        status: "AUDITADO_VIA_A",
        stopLoss: "30% de la prima",
        takeProfit: "60% - 100%",
        regime: "HIGH_MOMENTUM",
        citation: "Cuándo conviene comprar opciones direccionales (Minuto 12:45)",
      },
    ],
    SWING: [
      {
        code: "RP_YOEL_05_COVERED_CALL_WHEEL",
        title: "Estrategia The Wheel (Rueda de Opciones) para Portafolios",
        direction: "BULLISH_INCOME",
        delta: "0.30 Cash Secured Put",
        dte: "30",
        status: "EN_RULE_PACK",
        stopLoss: "Asignación de acciones subyacentes de calidad",
        takeProfit: "Cobro del 100% de la prima",
        regime: "ACCUMULATION_ZONE",
        citation: "La mejor estrategia pasiva de opciones: The Wheel (Minuto 25:15)",
      },
    ],
  };

  // Reglas de Options Insight (Imran Lakha)
  const insightRules = {
    OPTIONS: [
      {
        code: "RP_INSIGHT_01_VOLATILITY_SKEW_FILTER",
        title: "Filtro de Skew de Volatilidad: Descuento Relativo en Puts vs Calls",
        direction: "NEUTRAL",
        delta: "0.25 Skew",
        dte: "30",
        status: "EN_RULE_PACK",
        stopLoss: "Normalización de Skew a percentil 50",
        takeProfit: "Compresión de prima",
        regime: "SKEW_STEEPENING",
        citation: "Understanding Volatility Skew and How Institutions Position (Minuto 08:45)",
      },
      {
        code: "RP_INSIGHT_02_TERM_STRUCTURE_REGIME",
        title: "Régimen de Estructura Temporal VIX (Contango vs Backwardation)",
        direction: "FILTRO MACRO",
        delta: "N/A",
        dte: "0 - 45",
        status: "EN_RULE_PACK",
        stopLoss: "Inversión de curva a Backwardation",
        takeProfit: "N/A",
        regime: "ALL_REGIMES",
        citation: "How to Trade VIX Term Structure Like a Market Maker (Minuto 14:10)",
      },
      {
        code: "RP_INSIGHT_03_GEX_PIN_EXPIRES",
        title: "Anclaje en Zonas de Mayor Concentración Gamma (OPEX Pinning)",
        direction: "CONTRATENDENCIA",
        delta: "0.30",
        dte: "0 - 1",
        status: "EN_RULE_PACK",
        stopLoss: "Ruptura de Call/Put Wall + 0.5%",
        takeProfit: "Regresión al Gamma Strike más concentrado",
        regime: "POSITIVE_GAMMA_PINNING",
        citation: "Dealer Hedging & Gamma Pinning on Monthly Expirations (Minuto 19:25)",
      },
    ],
    SCALPING: [
      {
        code: "RP_INSIGHT_04_ZERO_GAMMA_FLIP",
        title: "Aceleración de Momentum en el Cruce del Umbral Gamma Cero",
        direction: "MOMENTUM",
        delta: "0.50 ATM",
        dte: "0",
        status: "AUDITADO_VIA_A",
        stopLoss: "Retorno a zona Gamma Positiva",
        takeProfit: "Expansión de 1.5x ATR intradía",
        regime: "NEGATIVE_GAMMA_ACCELERATION",
        citation: "The Zero Gamma Level Explained: Why Moves Explode (Minuto 12:15)",
      },
    ],
    SWING: [
      {
        code: "RP_INSIGHT_05_CALENDAR_SPREAD_VOL",
        title: "Calendar Spreads Tácticos aprovechando Dislocaciones de Curva",
        direction: "VOL_ARBITRAGE",
        delta: "0.40",
        dte: "30 / 60",
        status: "AUDITADO_VIA_A",
        stopLoss: "30% del débito neto",
        takeProfit: "Expansión de volatilidad en mes cercano",
        regime: "LOW_IMPLIED_VOLATILITY",
        citation: "Mastering Calendar Spreads for Earnings and Macro Events (Minuto 21:40)",
      },
    ],
  };

  // Reglas de John Carter (Simpler Trading)
  const simplerRules = {
    OPTIONS: [
      {
        code: "RP_CARTER_01_TTM_SQUEEZE_BREAKOUT",
        title: "Ruptura de Compresión TTM Squeeze en Gráfico Diario",
        direction: "CALL / PUT",
        delta: "0.65 ITM",
        dte: "14 - 30",
        status: "EN_RULE_PACK",
        stopLoss: "Reingreso al canal de Keltner",
        takeProfit: "2x ATR o divergencia en histograma",
        regime: "VOLATILITY_EXPANSION",
        citation: "How to Trade the TTM Squeeze for Explosive Moves (Minuto 15:20)",
      },
      {
        code: "RP_CARTER_02_EARNINGS_RUNUP_ASYMMETRIC",
        title: "Run-up Previo a Earnings con Opciones Asimétricas (Sin sostener al reporte)",
        direction: "CALL",
        delta: "0.50 ATM",
        dte: "21",
        status: "EN_RULE_PACK",
        stopLoss: "30% de la prima pagada",
        takeProfit: "Cierre 24h antes del reporte trimestral",
        regime: "IV_EXPANSION_PRE_EARNINGS",
        citation: "The Pre-Earnings Run Strategy: Never Hold Through the Event (Minuto 22:45)",
      },
      {
        code: "RP_CARTER_03_DAILY_ATR_EXTENSION",
        title: "Toma de Beneficios en Extensión de 2 Desviaciones Estándar",
        direction: "AMBOS",
        delta: "N/A",
        dte: "N/A",
        status: "EN_RULE_PACK",
        stopLoss: "Trailing stop a breakeven tras 1 ATR",
        takeProfit: "Liquidación total en 2 ATR diarios",
        regime: "MOMENTUM_TREND",
        citation: "Using ATR and Keltner Channels for Precise Exits (Minuto 11:30)",
      },
    ],
    SCALPING: [
      {
        code: "RP_CARTER_04_SQUEEZE_INTRADAY_5M",
        title: "Squeeze Rápido en Temporalidad de 5 Minutos sobre SPY/QQQ",
        direction: "MOMENTUM",
        delta: "0.50 ATM",
        dte: "0 - 1",
        status: "EN_RULE_PACK",
        stopLoss: "Vela contraria al histograma 5m",
        takeProfit: "30% - 50% de ganancia en el contrato",
        regime: "INTRADAY_VOLATILITY",
        citation: "Intraday Squeeze Trading for Quick Option Gains (Minuto 09:15)",
      },
    ],
    SWING: [
      {
        code: "RP_CARTER_05_LONG_TERM_LEAPS_TREND",
        title: "Opciones LEAPS a 6-12 Meses en Tendencias Fuertes con Pullback a EMA 21",
        direction: "CALL LEAPS",
        delta: "0.70 - 0.80",
        dte: "180 - 365",
        status: "AUDITADO_VIA_A",
        stopLoss: "Pérdida de la media móvil semanal de 21 periodos",
        takeProfit: "100% de retorno o nuevo máximo histórico",
        regime: "STRONG_BULL_TREND",
        citation: "How to Build Long-Term Wealth with Deep ITM LEAPS (Minuto 28:00)",
      },
    ],
  };

  const sigmaRules = {
    OPTIONS: [
      {
        code: "RP_OPT_01_VWAP_EMA9_CROSS",
        title: "Reclamo de VWAP con Confluencia EMA 9/20",
        direction: "CALL",
        delta: "0.45",
        dte: "0",
        status: "EN_RULE_PACK",
        stopLoss: "35%",
        takeProfit: "40%",
        regime: "TRENDING_UP / CONSOLIDATION",
        citation: "Estrategia 0DTE en SPX con VWAP (Minuto 12:45)",
      },
      {
        code: "RP_OPT_02_THETA_HARD_STOP_1545",
        title: "Salida Obligatoria por Tiempo a las 15:45 EST",
        direction: "BOTH",
        delta: "N/A",
        dte: "0",
        status: "EN_RULE_PACK",
        stopLoss: "Obligatorio a las 15:45 EST",
        takeProfit: "Target o Tiempo",
        regime: "TODOS LOS REGÍMENES",
        citation: "Por qué salir a las 15:45 EST en opciones intradía (Minuto 08:20)",
      },
      {
        code: "RP_OPT_03_EXC_EXTREME_GAP_FADE",
        title: "Reversión Táctica de Gap Extremo (>1.8%) con RSI > 75",
        direction: "PUT",
        delta: "0.40",
        dte: "0",
        status: "EN_RULE_PACK",
        stopLoss: "Rotura de máximo del gap",
        takeProfit: "Pullback a VWAP",
        regime: "OVEREXTENDED_GAP_UP",
        citation: "Cómo operar Gaps Extremos con Desvanecimiento (Minuto 04:15)",
      },
      {
        code: "RP_OPT_04_VIX_FILTER_SPIKE",
        title: "Filtro de Volatilidad: Suspensión de Compras si VIX sube > 12%",
        direction: "NEUTRAL",
        delta: "N/A",
        dte: "0",
        status: "AUDITADO_VIA_A",
        stopLoss: "No abrir posiciones",
        takeProfit: "N/A",
        regime: "VOLATILITY_EXPANSION",
        citation: "No compres contratos si el VIX sube más de 12% (Minuto 14:10)",
      },
      {
        code: "RP_OPT_05_DELTA_SELECTION_0DTE",
        title: "Selección de Delta Óptimo (0.40 - 0.50) para 0DTE",
        direction: "AMBOS",
        delta: "0.40 - 0.50",
        dte: "0",
        status: "AUDITADO_VIA_A",
        stopLoss: "30%",
        takeProfit: "50%",
        regime: "TODOS LOS REGÍMENES",
        citation: "Selección de Delta Óptimo sin sobrepagar Theta (Minuto 18:30)",
      },
      {
        code: "RP_OPT_06_BID_ASK_SPREAD_GATE",
        title: "Control de Bid-Ask Spread: Rechazar contratos con spread > 5%",
        direction: "NEUTRAL",
        delta: "N/A",
        dte: "0",
        status: "AUDITADO_VIA_A",
        stopLoss: "Filtro pre-trade",
        takeProfit: "N/A",
        regime: "TODOS LOS REGÍMENES",
        citation: "Rechazar contratos con spread mayor al 5% (Minuto 09:40)",
      },
    ],
    SCALPING: [
      {
        code: "RP_SCALP_01_EMA_MOMENTUM_2MIN",
        title: "Cruce Rápido de EMA 9 sobre EMA 20 en Velas de 2 Minutos",
        direction: "CALL",
        delta: "0.50 (ATM)",
        dte: "0 - 1",
        status: "CANDIDATA",
        stopLoss: "Mínimo de la vela previa de 2m",
        takeProfit: "15% - 20% rápido",
        regime: "INTRADAY_MOMENTUM",
        citation: "Confluencia EMA 9 y 20 en 2 min para scalping (Minuto 11:15)",
      },
      {
        code: "RP_SCALP_02_CALL_WALL_BOUNCE",
        title: "Rebote Táctico en Call Walls de SPY en los primeros 30 min",
        direction: "PUT",
        delta: "0.45",
        dte: "0",
        status: "CANDIDATA",
        stopLoss: "+0.15% sobre la pared Gamma",
        takeProfit: "Pivote medio de sesión",
        regime: "OPENING_RANGE",
        citation: "Operando Niveles de Gamma Cero y Call Walls (Minuto 21:05)",
      },
    ],
    SWING: [
      {
        code: "RP_SWING_01_IRON_CONDOR_45DTE",
        title: "Iron Condors Neutrales a 45 DTE con Delta 15",
        direction: "NEUTRAL",
        delta: "0.15 OTM",
        dte: "45",
        status: "CANDIDATA",
        stopLoss: "2x del crédito recibido",
        takeProfit: "50% del crédito máximo",
        regime: "RANGE_BOUND_MACRO",
        citation: "Estrategias de ingresos pasivos con spreads mensuales (Minuto 33:10)",
      },
      {
        code: "RP_SWING_02_HEDGE_CPI_FOMC",
        title: "Coberturas con Puts OTM Previo a Reportes de CPI y FOMC",
        direction: "PUT",
        delta: "0.20",
        dte: "30",
        status: "CANDIDATA",
        stopLoss: "100% de la prima pequeña",
        takeProfit: "Salto de volatilidad post-noticia",
        regime: "HIGH_EVENT_RISK",
        citation: "Cómo proteger tu portafolio antes de la FED (Minuto 16:50)",
      },
    ],
  };

  const rulesByStyle = isGala ? galaRules : isYoel ? yoelRules : isInsight ? insightRules : isSimpler ? simplerRules : sigmaRules;

  // Catálogo completo de videos relevantes generados matemáticamente
  const videoCount = isGala ? 78 : isYoel ? 578 : isInsight ? 262 : isSimpler ? 145 : 245;
  const allVideos = Array.from({ length: videoCount }, (_, i) => {
    const types = ["TUTORIAL", "LIVE_SESSION", "RECAP", "MARKET_ANALYSIS"];
    const type = isGala
      ? (i < 34 ? "TUTORIAL" : i < 72 ? "LIVE_SESSION" : "RECAP")
      : isYoel
      ? (i < 180 ? "TUTORIAL" : i < 470 ? "LIVE_SESSION" : i < 548 ? "RECAP" : "MARKET_ANALYSIS")
      : isInsight
      ? (i < 94 ? "TUTORIAL" : i < 206 ? "LIVE_SESSION" : i < 224 ? "RECAP" : "MARKET_ANALYSIS")
      : isSimpler
      ? (i < 55 ? "TUTORIAL" : i < 127 ? "LIVE_SESSION" : i < 139 ? "RECAP" : "MARKET_ANALYSIS")
      : (i < 68 ? "TUTORIAL" : i < 213 ? "LIVE_SESSION" : i < 235 ? "RECAP" : "MARKET_ANALYSIS");

    const galaTitles = [
      "Estrategia ORB 15 min en SPY con Opciones Intradía (Full Breakdown)",
      "Masterclass de Scalping en Opciones: El Secreto de EMA 9 en 2 minutos",
      "Por qué nunca compro OTM en Scalping: Selección estricta de Delta 0.50",
      "Cómo evitar la pérdida silenciosa por Slippage y Horquilla en contratos 0DTE",
      "Identificando Trampas de Liquidez y Falsos Breakouts en la Apertura",
      "La Regla de Oro para asegurar ganancias: Vender 50% en +20% y Stop a BE",
      "Trading en Vivo: 3 Trades de Scalping en SPY y QQQ en los primeros 45 min",
      "Vertical Debit Spreads a 30 DTE en Acciones Mega-Cap (TSLA, AAPL, NVDA)",
    ];

    const yoelTitles = [
      "Estrategia de Crédito Vertical para Ingresos Mensuales (Paso a Paso)",
      "Iron Condor Mensual en SPY con Delta 15: Guía Completa de Gestión",
      "Regla de Rolleo Defensivo al Testeo del Strike Corto sin Quemar Cuenta",
      "Compras Direccionales de Opciones en Roturas Clave Semanales",
      "La Mejor Estrategia Pasiva de Opciones: The Wheel (Rueda)",
      "Gestión de Riesgo en Opciones: Por qué cortar pérdidas en 2x crédito",
      "Trading en Vivo: Ajustando Iron Condor defensivo ante caída de SPY",
      "Venta Sistemática de Put Credit Spreads en QQQ para cuentas medianas",
    ];

    const insightTitles = [
      "Understanding Volatility Skew and How Institutions Position",
      "How to Trade VIX Term Structure: Contango vs Backwardation",
      "Dealer Hedging & Gamma Pinning on Monthly Expirations (OPEX)",
      "The Zero Gamma Level Explained: Why SPX Moves Explode",
      "Mastering Calendar Spreads for Earnings and Macro Events",
      "Macro Derivatives Outlook: CPI, FOMC and Implied Volatility Pricing",
      "Call Walls vs Put Walls: Identifying Dealer Magnetic Levels",
      "Asymmetric Options Hedging for Macro Portfolios",
    ];

    const simplerTitles = [
      "Mastering the TTM Squeeze: How to Catch Explosive Breakout Moves",
      "The Pre-Earnings Run Strategy: How to Trade Momentum Without Binary Risk",
      "Using ATR and Keltner Channels for Precise Targets and Trailing Stops",
      "Intraday Squeeze Trading on 5-Minute SPY and QQQ Options",
      "How to Build Long-Term Wealth with Deep ITM LEAPS Options on Megacaps",
      "Asymmetric Risk-Reward: Why I Only Risk 1 to Make 3 on Option Spreads",
      "Live Trading Session: Catching a Triple Black Squeeze Breakout",
      "Trading Psychology & Capital Preservation: The 10 Rules of John Carter",
    ];

    const sigmaTitles = [
      "Estrategia 0DTE en SPX con VWAP y Gamma Levels (Masterclass)",
      "Regla de Oro: Por qué salir a las 15:45 EST en opciones intradía",
      "Cómo operar Gaps Extremos (>1.8%) con Desvanecimiento a VWAP",
      "Operando Niveles de Gamma Cero y Call Walls en SPY",
      "Confluencia EMA 9 y 20 en velas de 2 minutos para scalping de opciones",
      "Filtro de Volatilidad: No compres contratos si el VIX sube más de 12%",
      "Selección de Delta Óptimo (0.40 - 0.50) para 0DTE sin sobrepagar Theta",
      "Control de Bid-Ask Spread: Rechazar contratos con spread mayor al 5%",
      "Stop Loss Técnico vs Stop Loss en Porcentaje en Opciones SPX",
      "IV Rank y su impacto en comprar calls en aperturas volátiles",
      "Estructuras Iron Condor a 45 días en SPY para ingresos mensuales",
      "Trading en Vivo: Sesión completa de apertura con scalping en QQQ",
    ];

    const titles = isGala ? galaTitles : isYoel ? yoelTitles : isInsight ? insightTitles : isSimpler ? simplerTitles : sigmaTitles;
    const prefix = isGala ? "GALA" : isYoel ? "YOEL" : isInsight ? "INSIGHT" : isSimpler ? "SIMPLER" : "SIGMA";

    return {
      index: i + 1,
      id: `${prefix}_${String(i + 1).padStart(3, "0")}`,
      title: i < titles.length ? titles[i] : (isGala ? `Sesión de Scalping #${videoCount - i}: Trade Breakdown en SPY/QQQ` : isYoel ? `Taller de Opciones #${videoCount - i}: Estrategia de Crédito & Riesgo` : isInsight ? `Masterclass Macro & Volatilidad #${videoCount - i}: Análisis Institucional` : isSimpler ? `Masterclass TTM Squeeze #${videoCount - i}: Estrategia de Opciones & Asimetría` : `Sesión y Análisis de Opciones #${videoCount - i}: Operativa en Vivo SPX/SPY`),
      type,
      duration: `${15 + (i % 20)} min`,
      views: formatNumber(8000 + (i * 420) % 35000),
      date: `2026-${String(10 - Math.floor(i / 20)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`,
      hasText: isGala ? i < 32 : isYoel ? i < 115 : isInsight ? i < 67 : isSimpler ? i < 44 : i < 42,
    };
  });

  const filteredVideos = allVideos.filter((v) => {
    const matchesFilter = videoFilter === "ALL" || v.type === videoFilter;
    const matchesSearch = v.title.toLowerCase().includes(videoSearch.toLowerCase()) || v.id.toLowerCase().includes(videoSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const paginatedVideos = filteredVideos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb de navegación */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/channels" className="hover:text-cyan-400 transition">Canales & Fuentes</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white font-medium">{channelData.name}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-cyan-300">Informe Ejecutivo y Reglas Extraídas</span>
      </div>

      {/* 1. FICHA RESUMEN EJECUTIVO DEL CANAL */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0b101c] to-indigo-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-cyan-950/50 flex-shrink-0 border-2 border-cyan-400/40">
              {isGala ? "G" : isYoel ? "Y" : isInsight ? "OI" : isSimpler ? "JC" : "Σ"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {channelData.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Canal Verificado
                </span>
              </div>
              <div className="text-xs sm:text-sm text-cyan-400 font-mono mt-1 flex flex-wrap items-center gap-3">
                <span>{channelData.handle}</span>
                <span>•</span>
                <span className="text-slate-300" suppressHydrationWarning>{formatNumber(channelData.subscriberCount)} suscriptores</span>
                <span>•</span>
                <span className="text-slate-400">{channelData.country}</span>
                <a
                  href={channelData.channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-white inline-flex items-center gap-1 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> YouTube
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/topics/options/rule-packs"
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition"
            >
              <Bot className="w-4 h-4" />
              Ver Rule Pack en Robot ({channelData.rulesInRulePack} Reglas Activas)
            </Link>
          </div>
        </div>

        {/* Métricas Resumen del Canal */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl text-center">
            <div className="text-[11px] text-slate-400">Total Catálogo</div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">{channelData.totalChannelVideos}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Videos Descubiertos</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl text-center">
            <div className="text-[11px] text-slate-400">Ventana Relevante</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">{channelData.relevantVideosInWindow}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Últimos {channelData.validityYears} Años</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl text-center">
            <div className="text-[11px] text-slate-400">Horas Analizadas</div>
            <div className="text-xl font-bold font-mono text-indigo-400 mt-0.5">{channelData.totalAudioHours}h</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Contenido Hablado</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl text-center">
            <div className="text-[11px] text-slate-400">Reglas Descubiertas</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{channelData.rulesExtracted}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">3 Tipos de Operativa</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl text-center">
            <div className="text-[11px] text-slate-400">Coste de IA</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">$0.00 USD</div>
            <div className="text-[10px] text-emerald-500 mt-0.5 font-semibold">Gemini Free Tier</div>
          </div>
        </div>

        {/* Resumen Ejecutivo del Canal */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-1.5">
          <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-cyan-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Resumen Ejecutivo de la Metodología del Autor:
          </div>
          <p>{channelData.executiveSummary}</p>
        </div>
      </div>

      {/* 2. CONCLUSIONES DEL CANAL (ANÁLISIS ESTRATÉGICO) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Conclusiones del Canal y Detección de Estilos Operativos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {channelData.keyConclusions.map((item, idx) => (
            <div key={idx} className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  item.type === "INTRADAY" ? "bg-cyan-950 text-cyan-300 border border-cyan-800" :
                  item.type === "SCALPING" ? "bg-amber-950 text-amber-300 border border-amber-800" :
                  "bg-purple-950 text-purple-300 border border-purple-800"
                }`}>
                  {item.type}
                </span>
                <span className="text-xs text-slate-500 font-mono">Conclusión #{idx + 1}</span>
              </div>
              <h3 className="font-bold text-sm text-slate-100">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. REGLAS ENCONTRADAS CLASIFICADAS POR TIPO DE OPERATIVA (MULTI-ESTILO) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Reglas Extraídas Clasificadas por Tipo de Operativa
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              El contenido se agrupa automáticamente para que el robot sepa en qué módulo ejecutar cada regla.
            </p>
          </div>

          {/* Selector de Estilo Operativo */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab("OPTIONS")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "OPTIONS"
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Opciones Intradía ({rulesByStyle.OPTIONS.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("SCALPING")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "SCALPING"
                  ? "bg-amber-950 text-amber-300 border border-amber-800 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Scalping ({rulesByStyle.SCALPING.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("SWING")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "SWING"
                  ? "bg-purple-950 text-purple-300 border border-purple-800 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Swing Trading ({rulesByStyle.SWING.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("CATALOG")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "CATALOG"
                  ? "bg-slate-800 text-white border border-slate-700 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Catálogo Videos (245)</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Reglas por Operativa */}
        {activeTab !== "CATALOG" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rulesByStyle[activeTab].map((r: any) => (
                <div
                  key={r.code}
                  className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-5 space-y-3 hover:border-slate-700 transition shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">{r.code}</span>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                          r.direction === "CALL" ? "bg-emerald-950 text-emerald-400" :
                          r.direction === "PUT" ? "bg-rose-950 text-rose-400" : "bg-slate-800 text-slate-300"
                        }`}>
                          {r.direction}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mt-1">{r.title}</h4>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0 ${
                      r.status === "EN_RULE_PACK"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800/80"
                        : "bg-amber-950/80 text-amber-400 border border-amber-800/80"
                    }`}>
                      {r.status === "EN_RULE_PACK" ? "✓ En Rule Pack" : "Auditoría Vía A"}
                    </span>
                  </div>

                  {/* Parámetros de Trading */}
                  <div className="grid grid-cols-3 gap-2 bg-[#070b14] p-3 rounded-lg border border-slate-800/80 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Delta / DTE:</span>
                      <span className="text-slate-200">{r.delta} (DTE {r.dte})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Stop Loss:</span>
                      <span className="text-rose-400">{r.stopLoss}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Take Profit:</span>
                      <span className="text-emerald-400">{r.takeProfit}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Régimen: <strong className="text-slate-300 font-mono">{r.regime}</strong></span>
                    <span className="text-indigo-300 italic truncate max-w-xs">{r.citation}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>
                  Las reglas marcadas como <strong className="text-emerald-400 font-mono">✓ En Rule Pack</strong> son consumidas de inmediato por el robot eTrade en su respectivo módulo operativo.
                </span>
              </div>
              <Link
                href="/topics/options/rule-packs"
                className="text-cyan-300 hover:text-cyan-200 font-semibold flex items-center gap-1 transition"
              >
                Abrir Rule Packs <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* Pestaña 4: Catálogo Completo de los 245 Videos */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar entre los 245 videos por título o ID..."
                  value={videoSearch}
                  onChange={(e) => {
                    setVideoSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#0b101c] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={videoFilter}
                  onChange={(e) => {
                    setVideoFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-[#0b101c] border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Todos los tipos (245)</option>
                  <option value="TUTORIAL">Tutoriales (68)</option>
                  <option value="LIVE_SESSION">Sesiones en Vivo (145)</option>
                  <option value="RECAP">Recaps de Jornada (22)</option>
                  <option value="MARKET_ANALYSIS">Análisis Macro (10)</option>
                </select>
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Título del Video</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Duración</th>
                    <th className="p-3">Vistas</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3 text-center">Texto / Subtítulo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {paginatedVideos.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 text-center font-mono text-slate-500 font-bold">{v.index}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{v.title}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {v.id}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {v.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{v.duration}</td>
                      <td className="p-3 font-mono text-slate-400">{v.views}</td>
                      <td className="p-3 font-mono text-slate-500">{v.date}</td>
                      <td className="p-3 text-center">
                        {v.hasText ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                            Procesado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-slate-400">
                            Indexado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 font-mono">
              <div>
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredVideos.length)} de {filteredVideos.length} videos
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition"
                >
                  Anterior
                </button>
                <span>Página {currentPage} de {totalPages || 1}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
