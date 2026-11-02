"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  TrendingDown,
  TrendingUp,
  Activity,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  Zap,
  Layers,
  ArrowRight,
  Flame,
  AlertTriangle,
  Calendar
} from "lucide-react";

interface PreMarketAsset {
  symbol: string;
  name: string;
  category: string;
  price: number;
  changePct: number;
  sparklineTrend: 'UP' | 'DOWN' | 'FLAT';
}

interface CausalVariable {
  variable: string;
  category: string;
  expected: string;
  actual: string;
  surprise: string;
  direction: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'RISK_OFF';
  impact: string;
}

interface CausalStep {
  step: number;
  from: string;
  to: string;
  mechanism: string;
  weight: number;
}

interface SessionTimelineItem {
  timeWindow: string;
  phase: string;
  expectedBehavior: string;
  tacticalAdvice: string;
}

interface FdeProjectionData {
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
  preMarketTape: PreMarketAsset[];
  causalDetails: {
    keyVariables: CausalVariable[];
    causalChain: CausalStep[];
    expectedSessionTimeline: SessionTimelineItem[];
  };
}

export default function FdePreMarketConsole({ initialData }: { initialData?: FdeProjectionData }) {
  const [data, setData] = useState<FdeProjectionData | null>(initialData || null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'VARIABLES' | 'CAUSAL_CHAIN' | 'TIMELINE'>('VARIABLES');
  const [loading, setLoading] = useState(false);
  const [secondsUntilNextRefresh, setSecondsUntilNextRefresh] = useState(300);

  const fetchProjection = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/eti/v1/market/fde-projection");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setSecondsUntilNextRefresh(json.refreshIntervalSeconds || 300);
      }
    } catch (err) {
      console.error("Error al refrescar FDE:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchProjection();
    }
  }, []);

  // Polling dinámico: 5 minutos (300s) o 15 minutos (900s)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilNextRefresh(prev => {
        if (prev <= 1) {
          fetchProjection();
          return data?.refreshIntervalSeconds || 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data?.refreshIntervalSeconds]);

  if (!data) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        <span>Sincronizando Financial Dynamics Engine (FDE)...</span>
      </div>
    );
  }

  const { financialSystemState, robotMandate, preMarketTape, causalDetails } = data;
  const isPreMarket = data.isPreMarketOpenWindow;

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatLastUpdated = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleString("es-ES");
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Barra de Control de Frecuencia y Estado Pre-Market */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`flex h-2.5 w-2.5 rounded-full ${
              isPreMarket ? "bg-rose-500 animate-ping" : "bg-emerald-500"
            }`}
          />
          <span className="font-semibold text-slate-200">
            {isPreMarket
              ? "MODO APERTURA & PRE-MARKET ACTIVO (Actualización cada 5 min)"
              : "MODO SESIÓN REGULAR / ABSORCIÓN (Actualización cada 15 min)"}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Última actualización:{" "}
            <strong className="text-slate-200">{formatLastUpdated(data.asOf)}</strong>
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" /> Siguiente cálculo en:{" "}
            <strong className="text-cyan-300">{formatCountdown(secondsUntilNextRefresh)}</strong>
          </span>
        </div>

        <button
          onClick={fetchProjection}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          <span>{loading ? "Calculando..." : "Actualizar Ahora"}</span>
        </button>
      </div>

      {/* 2. Cinta Pre-Apertura (Ticker Tape: Índices, Commodities, Tasas) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {preMarketTape.map(asset => {
          const isUp = asset.changePct >= 0;
          return (
            <div
              key={asset.symbol}
              className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">{asset.symbol}</span>
                <span
                  className={`text-[10px] font-mono font-bold flex items-center ${
                    isUp ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {isUp ? `+${asset.changePct}%` : `${asset.changePct}%`}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">{asset.name}</div>
              <div className="text-xs font-mono font-bold text-slate-200">${asset.price.toFixed(2)}</div>
            </div>
          );
        })}
      </div>

      {/* 3. Tarjeta Ejecutiva de la Proyección Causal del Día (El Resumen) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
              <Compass className="w-3.5 h-3.5 text-indigo-400" /> FINANCIAL DYNAMICS ENGINE • FCG CAUSAL RADAR
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Proyección Causal del Día:{" "}
              <span className="text-amber-400 font-mono text-lg sm:text-xl">{financialSystemState.title}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {financialSystemState.description}
            </p>
          </div>

          {/* Métricas Resumen */}
          <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 shrink-0">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Sesgo Primario</div>
              {financialSystemState.bias === "BULLISH" ? (
                <div className="text-base font-bold font-mono text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> BULLISH
                </div>
              ) : financialSystemState.bias === "BEARISH" ? (
                <div className="text-base font-bold font-mono text-rose-400 flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-rose-400" /> BEARISH
                </div>
              ) : (
                <div className="text-base font-bold font-mono text-amber-400 flex items-center gap-1">
                  <Activity className="w-4 h-4 text-amber-400" /> NEUTRAL
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Confianza Causal</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {financialSystemState.causalConfidencePct}%
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Coherencia</div>
              <div className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                {financialSystemState.systemCoherence}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Mandato del Robot eTrade (ADUANA O-13) & Estado Táctico Yoel */}
        {(() => {
          const isBull = financialSystemState.bias === "BULLISH";
          const isBear = financialSystemState.bias === "BEARISH";
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div
                className={`rounded-xl p-4 space-y-2 border transition ${
                  isBull
                    ? "bg-emerald-950/20 border-emerald-900/50"
                    : isBear
                    ? "bg-rose-950/20 border-rose-900/40"
                    : "bg-amber-950/20 border-amber-900/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-bold flex items-center gap-1.5 ${
                      isBull ? "text-emerald-300" : isBear ? "text-rose-300" : "text-amber-300"
                    }`}
                  >
                    {isBull ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : isBear ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Compass className="w-4 h-4 text-amber-400" />
                    )}
                    {robotMandate.aduanaCode}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isBull
                        ? "bg-emerald-900/60 text-emerald-200 border-emerald-800"
                        : isBear
                        ? "bg-rose-900/60 text-rose-200 border-rose-800"
                        : "bg-amber-900/60 text-amber-200 border-amber-800"
                    }`}
                  >
                    {robotMandate.mode}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium">{robotMandate.recommendedSetup}</div>
                <div
                  className={`text-[11px] font-mono p-2 rounded border flex items-center gap-1.5 ${
                    isBull
                      ? "text-cyan-300 bg-cyan-950/40 border-cyan-900/40"
                      : isBear
                      ? "text-emerald-400 bg-emerald-950/40 border-emerald-900/40"
                      : "text-amber-300 bg-amber-950/40 border-amber-900/40"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{robotMandate.yoelTacticalStatus}</span>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2 text-xs">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" /> Filtros de Ejecución del Robot:
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400">
                    <strong className="text-emerald-400">✓ Permitido:</strong> {robotMandate.allowedActions[0]}
                  </div>
                  <div className="text-slate-400">
                    <strong className="text-rose-400">✗ Bloqueado:</strong> {robotMandate.blockedActions[0]}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 5. Botón Interactivo: Ver Análisis Causal Detallado */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => setIsDetailOpen(!isDetailOpen)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-medium text-xs sm:text-sm font-mono flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-950/50 border border-indigo-500/30"
          >
            <span>{isDetailOpen ? "Ocultar Análisis Causal Detallado" : "Ver Análisis Causal Detallado & Cadena FCG"}</span>
            {isDetailOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 6. Panel Desplegable: Detalle de Variables, Grafo Causal y Guion de Sesión */}
        {isDetailOpen && (
          <div className="pt-4 border-t border-slate-800 space-y-5 animate-in fade-in duration-300">
            {/* Pestañas del Panel */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('VARIABLES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                  activeTab === 'VARIABLES'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                1. Variables Macroeconómicas & Sorpresa
              </button>
              <button
                onClick={() => setActiveTab('CAUSAL_CHAIN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                  activeTab === 'CAUSAL_CHAIN'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                2. Cadena Causal FCG (Forrester)
              </button>
              <button
                onClick={() => setActiveTab('TIMELINE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                  activeTab === 'TIMELINE'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                3. Guion Horario de la Jornada
              </button>
            </div>

            {/* Contenido Pestaña 1: Variables & Sorpresa */}
            {activeTab === 'VARIABLES' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  El FDE calcula la sorpresa económica (<strong className="text-slate-200">Dato Real - Esperado</strong>)
                  para medir el choque en las expectativas de política monetaria:
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Variable Macroeconómica</th>
                        <th className="p-2.5">Esperado</th>
                        <th className="p-2.5">Real</th>
                        <th className="p-2.5">Sorpresa Calculada</th>
                        <th className="p-2.5">Impacto en el Sistema</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {causalDetails.keyVariables.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-bold text-white">{v.variable}</td>
                          <td className="p-2.5 text-slate-400">{v.expected}</td>
                          <td className="p-2.5 text-slate-200">{v.actual}</td>
                          <td className="p-2.5 text-amber-400 font-semibold">{v.surprise}</td>
                          <td className="p-2.5 text-slate-300 text-[11px] max-w-xs">{v.impact}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Contenido Pestaña 2: Cadena Causal de Transmisión */}
            {activeTab === 'CAUSAL_CHAIN' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-400">
                  Ruta de transmisión jerárquica de 6 capas: cómo el choque de commodities e inflación drena la valoración de los índices:
                </div>
                <div className="space-y-2.5">
                  {causalDetails.causalChain.map(step => (
                    <div
                      key={step.step}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-900/80 border border-indigo-700 font-mono text-[11px] font-bold text-indigo-300 flex items-center justify-center">
                          {step.step}
                        </span>
                        <div className="font-mono font-bold text-slate-200">
                          {step.from} <ArrowRight className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> {step.to}
                        </div>
                      </div>
                      <div className="text-slate-400 text-[11px] max-w-md">{step.mechanism}</div>
                      <div className="text-[11px] font-mono text-emerald-400 font-semibold shrink-0">
                        Peso Causal: {step.weight}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contenido Pestaña 3: Guion Horario de la Jornada */}
            {activeTab === 'TIMELINE' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Qué esperamos que suceda durante el día y cómo deben actuar los motores de ejecución:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {causalDetails.expectedSessionTimeline.map((item, i) => (
                    <div
                      key={i}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-400">{item.timeWindow}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.phase}
                        </span>
                      </div>
                      <div className="text-slate-200 font-medium">{item.expectedBehavior}</div>
                      <div className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/40">
                        <strong>Consejo Táctico:</strong> {item.tacticalAdvice}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
