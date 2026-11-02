"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen, ShieldAlert, CheckCircle2, ChevronRight, Activity,
  Zap, TrendingUp, Bot, ArrowRight, ShieldCheck, Layers, ExternalLink,
  BarChart2, Flame
} from "lucide-react";

export default function UnifiedPlaybooksPage() {
  const [activeTab, setActiveTab] = useState<"OPTIONS" | "SCALPING" | "SWING" | "QUANT" | "EVENTS">("OPTIONS");

  // Estrategias consolidadas del Playbook multi-estilo
  const playbookData = {
    OPTIONS: {
      title: "Playbook de Opciones Financieras (0DTE / SPX / SPY)",
      description: "Minería y consolidación de reglas para trading intradía y scalping de contratos de opciones. Módulo consumidor: APEX Options Robot.",
      status: "ACTIVO (MVP)",
      rulesCount: 27,
      rules: [
        {
          code: "RP_OPT_01_VWAP_EMA9_CROSS",
          title: "Reclamo de VWAP con Confluencia EMA 9/20",
          direction: "CALL",
          consensusLevel: "4 de 5 Creadores (80%)",
          validationStatus: "APROBADA_VIA_C",
          profitFactor: "1.64",
          sources: ["Opción Sigma", "Gala Trades", "Yoel Sardiñas", "John Carter"],
          summary: "Entrada en Call cuando el precio recupera VWAP por encima y la EMA 9 cruza al alza la EMA 20 en horario regular.",
          parameters: "Delta 0.45, DTE 0, Stop 35%, TP 40%",
        },
        {
          code: "RP_OPT_02_THETA_HARD_STOP_1545",
          title: "Salida Obligatoria por Tiempo a las 15:45 EST",
          direction: "AMBOS",
          consensusLevel: "5 de 5 Creadores (100%)",
          validationStatus: "APROBADA_VIA_C",
          profitFactor: "2.10",
          sources: ["Opción Sigma", "Gala Trades", "Yoel Sardiñas", "Imran Lakha", "John Carter"],
          summary: "Cierre forzado e innegociable de cualquier contrato intradía a las 15:45 EST para prevenir la aniquilación del valor temporal por Theta.",
          parameters: "Hora límite 15:45 EST, Razón: Anti-Theta",
        },
        {
          code: "RP_OPT_03_EXC_EXTREME_GAP_FADE",
          title: "Reversión Táctica de Gap Extremo (>1.8%) con RSI > 75",
          direction: "PUT",
          consensusLevel: "1 Creador (Excepción Especializada)",
          validationStatus: "APROBADA_VIA_C",
          profitFactor: "1.48",
          sources: ["Opción Sigma"],
          summary: "Desvanecimiento contrasentido hacia la media VWAP cuando el mercado abre con gap eufórico superior al 1.8% y RSI horario sobrecomprado.",
          parameters: "Gap > 1.8%, RSI 1h >= 75, Target: VWAP",
        },
        {
          code: "RP_OPT_04_VIX_FILTER_SPIKE",
          title: "Filtro de Volatilidad: No Comprar si VIX sube > 12%",
          direction: "NEUTRAL",
          consensusLevel: "3 Creadores (60%)",
          validationStatus: "EN_AUDITORIA",
          profitFactor: "1.38",
          sources: ["Opción Sigma", "Imran Lakha", "Yoel Sardiñas"],
          summary: "Suspensión de compras direccionales cuando el VIX experimenta una expansión violenta matutina.",
          parameters: "VIX delta 1D > +12%",
        },
      ],
    },
    SCALPING: {
      title: "Playbook de Scalping de Alta Frecuencia (2m - 5m)",
      description: "Estrategias de momentum rápido orientadas a capturar recorridos cortos en subyacentes de alta liquidez. Módulo consumidor: APEX Momentum Scalper.",
      status: "ACTIVO",
      rulesCount: 2,
      rules: [
        {
          code: "RP_SCALP_01_EMA_MOMENTUM_2MIN",
          title: "Cruce Rápido de EMA 9 sobre EMA 20 en Velas de 2 Minutos",
          direction: "CALL / PUT",
          consensusLevel: "Opción Sigma & Gala Trades",
          validationStatus: "EN_EVALUACION",
          profitFactor: "1.52",
          sources: ["Opción Sigma", "Gala Trades"],
          summary: "Entrada rápida a favor de la tendencia inmediata con stop ceñido al mínimo de la vela de ruptura.",
          parameters: "Gráfico 2m, Delta ATM, Stop: vela previa, TP: +15%",
        },
        {
          code: "RP_SCALP_02_CALL_WALL_BOUNCE",
          title: "Rebote Táctico en Call Walls de SPY en Apertura",
          direction: "PUT",
          consensusLevel: "Opción Sigma",
          validationStatus: "EN_EVALUACION",
          profitFactor: "1.45",
          sources: ["Opción Sigma"],
          summary: "Venta de resistencia en el nivel de concentración de contratos Call (Call Wall GEX) durante los primeros 30 minutos.",
          parameters: "Ventana 09:30 - 10:00 EST, Nivel GEX",
        },
      ],
    },
    SWING: {
      title: "Playbook de Swing Trading & Cobertura Multidía",
      description: "Operativa con horizontes multidía, estructuras neutrales de crédito y coberturas ante eventos macroeconómicos. Módulo consumidor: APEX Portfolio Guard.",
      status: "ACTIVO",
      rulesCount: 2,
      rules: [
        {
          code: "RP_SWING_01_IRON_CONDOR_45DTE",
          title: "Iron Condors Neutrales a 45 DTE con Delta 15",
          direction: "NEUTRAL",
          consensusLevel: "Opción Sigma & Yoel Sardiñas",
          validationStatus: "EN_EVALUACION",
          profitFactor: "1.71",
          sources: ["Opción Sigma", "Yoel Sardiñas"],
          summary: "Estructuras theta-positivas en rangos laterales amplios con vencimiento mensual.",
          parameters: "45 DTE, Delta 0.15, TP: 50% del crédito",
        },
        {
          code: "RP_SWING_02_HEDGE_CPI_FOMC",
          title: "Coberturas con Puts OTM Previo a Reportes de CPI y FOMC",
          direction: "PUT",
          consensusLevel: "Opción Sigma",
          validationStatus: "EN_EVALUACION",
          profitFactor: "1.33",
          sources: ["Opción Sigma"],
          summary: "Protección asimétrica barata contra caídas abruptas del mercado causadas por sorpresas inflacionarias o tasas.",
          parameters: "Delta 0.20, DTE 30, Riesgo limitado al débito",
        },
      ],
    },
    QUANT: {
      title: "Playbook Cuantitativo & Arbitraje Estadístico (Pairs Trading)",
      description: "Estrategias de reversión a la media y cointegración estadística en pares de índices y sectores correlacionados. Módulo consumidor: APEX Quant Engine.",
      status: "ACTIVO (NUEVO)",
      rulesCount: 2,
      rules: [
        {
          code: "RP_QUANT_01_SPY_QQQ_SPREAD_DIVERGENCE",
          title: "Divergencia de Z-Score en el Ratio SPY / QQQ",
          direction: "MARKET_NEUTRAL (LONG/SHORT)",
          consensusLevel: "Estrategia Cuantitativa Institucional",
          validationStatus: "EN_EVALUACION",
          profitFactor: "1.82",
          sources: ["Imran Lakha (Options Insight)", "Quant Data Research"],
          summary: "Compra del subyacente rezagado y venta del sobrecomprado cuando el Z-Score del ratio se desvía > 2.2 desviaciones estándar de su media de 20 días.",
          parameters: "Z-Score > 2.2, Lookback 20D, Target: Media Z=0",
        },
        {
          code: "RP_QUANT_02_SECTOR_ROTATION_MOMENTUM",
          title: "Rotación Sectorial por Fuerza Relativa (RSI 14D Spread)",
          direction: "ROTATION",
          consensusLevel: "Consenso Macro Institucional",
          validationStatus: "EN_EVALUACION",
          profitFactor: "1.58",
          sources: ["John Carter", "Options Insight"],
          summary: "Rebalanceo automático hacia sectores con mayor aceleración relativa de momentum frente al S&P 500 (ej. XLK, XLF, XLE).",
          parameters: "Fuerza Relativa > 70 vs SPY, Rebalanceo Quincenal",
        },
      ],
    },
    EVENTS: {
      title: "Playbook de Eventos & Volatilidad Implícita (Earnings / CPI / FOMC)",
      description: "Explotación del colapso de volatilidad (IV Crush) y movimientos asimétricos pre y post reporte de resultados o anuncios de la FED. Módulo consumidor: APEX Event Trader.",
      status: "ACTIVO (NUEVO)",
      rulesCount: 2,
      rules: [
        {
          code: "RP_EVENT_01_EARNINGS_IV_CRUSH_STRADDLE",
          title: "Venta Táctica de Volatilidad (Short Straddle) en Earnings de Megacaps",
          direction: "VOL_SHORT",
          consensusLevel: "Yoel Sardiñas & Imran Lakha",
          validationStatus: "EN_EVALUACION",
          profitFactor: "1.65",
          sources: ["Yoel Sardiñas", "Options Insight"],
          summary: "Venta de primas sobreinfladas 15 minutos antes del cierre previo al reporte en acciones con IV Rank > 85%, cerrando a la apertura siguiente.",
          parameters: "IV Rank > 85%, Salida: 09:35 EST al día siguiente",
        },
        {
          code: "RP_EVENT_02_CPI_ASYMMETRIC_STRANGLE",
          title: "Strangle Largo Barato 1D previo al dato de Inflación CPI",
          direction: "VOL_EXPANSION",
          consensusLevel: "Opción Sigma",
          validationStatus: "EN_EVALUACION",
          profitFactor: "1.42",
          sources: ["Opción Sigma"],
          summary: "Compra de Call OTM y Put OTM con bajo precio 1 día antes del informe de inflación para capturar explosiones superiores a la desviación esperada.",
          parameters: "Delta 0.15 CALL + Delta 0.15 PUT, Cierre post-noticia",
        },
      ],
    },
  };

  const currentPlaybook = playbookData[activeTab];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Pilar 3</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white">Estrategias & Playbooks</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-cyan-300">Clasificación Multi-Estilo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-amber-400" />
            Playbook Consolidado de Estrategias
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Las reglas extraídas de los creadores de contenido no se mezclan indiscriminadamente: se clasifican por su <strong>tipo de operativa real</strong> para que el robot de eTrade sepa en qué módulo ejecutar cada señal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/topics/options/rule-packs"
            className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition"
          >
            <Bot className="w-4 h-4" />
            Ver Rule Packs del Robot
          </Link>
        </div>
      </div>

      {/* Selector de Pilares de Operativa (5 Tabs Multi-Estilo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab("OPTIONS")}
          className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
            activeTab === "OPTIONS"
              ? "bg-cyan-950/50 border-cyan-500/80 ring-1 ring-cyan-500/50 shadow-lg"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold">1. Opciones</div>
            <div className="text-xs font-bold text-white">0DTE / SPX / SPY</div>
            <div className="text-[10px] text-slate-400 mt-0.5">27 reglas</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("SCALPING")}
          className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
            activeTab === "SCALPING"
              ? "bg-amber-950/50 border-amber-500/80 ring-1 ring-amber-500/50 shadow-lg"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-700 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-amber-400 uppercase font-bold">2. Scalping</div>
            <div className="text-xs font-bold text-white">Momentum 2m</div>
            <div className="text-[10px] text-slate-400 mt-0.5">2 reglas</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("SWING")}
          className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
            activeTab === "SWING"
              ? "bg-purple-950/50 border-purple-500/80 ring-1 ring-purple-500/50 shadow-lg"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-purple-950 border border-purple-700 flex items-center justify-center text-purple-400 flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-purple-400 uppercase font-bold">3. Swing</div>
            <div className="text-xs font-bold text-white">Multidía / Iron Condor</div>
            <div className="text-[10px] text-slate-400 mt-0.5">2 estructuras</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("QUANT")}
          className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
            activeTab === "QUANT"
              ? "bg-emerald-950/50 border-emerald-500/80 ring-1 ring-emerald-500/50 shadow-lg"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold">4. Cuantitativo</div>
            <div className="text-xs font-bold text-white">Arbitraje / Pairs</div>
            <div className="text-[10px] text-slate-400 mt-0.5">2 modelos</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("EVENTS")}
          className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
            activeTab === "EVENTS"
              ? "bg-rose-950/50 border-rose-500/80 ring-1 ring-rose-500/50 shadow-lg"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400 flex-shrink-0">
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-rose-400 uppercase font-bold">5. Eventos / IV</div>
            <div className="text-xs font-bold text-white">Earnings / FOMC</div>
            <div className="text-[10px] text-slate-400 mt-0.5">2 tácticas</div>
          </div>
        </button>
      </div>

      {/* AVISO MANDATORIO DE DISEÑO: CONSENSO NO ES VALIDEZ */}
      <div className="bg-amber-950/30 border-2 border-amber-800/80 rounded-xl p-5 flex items-start gap-3.5 shadow-md">
        <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-amber-300 text-sm tracking-tight uppercase font-mono">
            Principio Fundamental de Arquitectura: Consenso no es Validez
          </h3>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            Que varios influencers repitan la misma regla indica <strong>popularidad y convergencia conceptual</strong>,
            no una ventaja estadística real de mercado. En este Playbook, el <strong>Consenso</strong> y la <strong>Validación</strong>
            son columnas estrictamente independientes. Solo la superación matemática en Vía B (Backtest $PF \ge 1.30$)
            y la acumulación forward en Vía C (Experience Ledger) conceden estado de validación operativa hacia el robot.
          </p>
        </div>
      </div>

      {/* Detalle del Playbook Seleccionado */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              {currentPlaybook.status}
            </span>
            <span className="text-xs text-slate-400 font-mono">{currentPlaybook.rules.length} Reglas Principales</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">{currentPlaybook.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{currentPlaybook.description}</p>
        </div>

        {/* Tabla de Reglas del Playbook */}
        <div className="space-y-4">
          {currentPlaybook.rules.map((rule, idx) => (
            <div
              key={rule.code}
              className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400">#{idx + 1}</span>
                  <span className="font-mono text-xs font-bold text-cyan-300">{rule.code}</span>
                  <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                    rule.direction.includes("CALL") ? "bg-emerald-950 text-emerald-400" :
                    rule.direction.includes("PUT") ? "bg-rose-950 text-rose-400" : "bg-purple-950 text-purple-400"
                  }`}>
                    {rule.direction}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">Consenso: <strong className="text-slate-200">{rule.consensusLevel}</strong></span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    rule.validationStatus === "APROBADA_VIA_C"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800/80"
                      : "bg-amber-950 text-amber-400 border border-amber-800/80"
                  }`}>
                    {rule.validationStatus === "APROBADA_VIA_C" ? "✓ Aprobada Robot" : "En Evaluación"}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-sm text-slate-100">{rule.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{rule.summary}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#0b101c] p-3 rounded-lg border border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Parámetros:</span>
                  <span className="text-cyan-300">{rule.parameters}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Fuentes de Origen:</span>
                  <span className="text-slate-300">{rule.sources.join(", ")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
