"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertTriangle,
  Compass,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Layers,
  Zap,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Filter
} from "lucide-react";
import {
  EconomicEvent,
  CausalMarketImpact,
  US_ECONOMIC_CALENDAR_2026,
  calculateCausalImpact
} from "@/lib/economicCalendarService";

export default function EconomicCalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>(US_ECONOMIC_CALENDAR_2026);
  const [selectedEventId, setSelectedEventId] = useState<string>("cpi-nov-2026");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [customValue, setCustomValue] = useState<string>("3.4");
  const [impact, setImpact] = useState<CausalMarketImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingFde, setSyncingFde] = useState(false);
  const [fdeSyncedMessage, setFdeSyncedMessage] = useState(false);
  const [livePrices, setLivePrices] = useState({
    spx: 7615.48,
    spy: 759.19,
    qqq: 695.12,
    meta: 613.84,
    nvda: 207.95,
  });

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  // Cargar datos en vivo al montar
  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch("/api/eti/v1/calendar/impact", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.events) setEvents(json.events);
          if (json.basePrices) setLivePrices(json.basePrices);
          if (json.currentImpact) {
            setImpact(json.currentImpact);
            setCustomValue(String(json.currentImpact.actualValue));
          }
        }
      } catch (e) {
        console.error("Error cargando calendario inicial:", e);
        // Fallback local
        const initial = calculateCausalImpact(selectedEvent, 3.4, livePrices);
        setImpact(initial);
      }
    }
    loadInitial();
  }, []);

  // Al seleccionar un evento distinto, resetear el valor sugerido y recalcular impacto
  const handleSelectEvent = (evt: EconomicEvent) => {
    setSelectedEventId(evt.id);
    const initialVal = evt.actual !== null ? evt.actual : evt.expected;
    setCustomValue(String(initialVal));
    const newImpact = calculateCausalImpact(evt, initialVal, livePrices);
    setImpact(newImpact);
    setFdeSyncedMessage(false);
  };

  // Recalcular cuando el usuario cambia el valor
  const handleSimulateValue = (valStr: string) => {
    setCustomValue(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      const newImpact = calculateCausalImpact(selectedEvent, num, livePrices);
      setImpact(newImpact);
      setFdeSyncedMessage(false);
    }
  };

  // Sincronizar el impacto calculado directamente con el FDE y la BD
  const handleApplyToFde = async () => {
    if (!impact) return;
    setSyncingFde(true);
    try {
      const res = await fetch("/api/eti/v1/calendar/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          customActual: parseFloat(customValue) || selectedEvent.expected,
          applyToFde: true,
        }),
      });
      if (res.ok) {
        setFdeSyncedMessage(true);
        setTimeout(() => setFdeSyncedMessage(false), 4000);
      }
    } catch (err) {
      console.error("Error sincronizando FDE:", err);
    } finally {
      setSyncingFde(false);
    }
  };

  const filteredEvents = selectedCategory === "ALL" 
    ? events 
    : events.filter(e => e.category === selectedCategory);

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header con Badge Causal y Enlace a FCG */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60 font-mono">
              <CalendarIcon className="w-3.5 h-3.5 text-amber-400" /> CALENDARIO ECONÓMICO EE.UU. • MOTOR CAUSAL FDE/FCG
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono flex items-center gap-2.5">
              Impacto Macroeconómico Causa / Efecto en Tiempo Real
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Monitoreo y simulación de catalizadores macroeconómicos del mercado americano.
              Cada nuevo dato publicado propaga una onda de choque a través de las 6 capas del Financial Causal Graph (FCG),
              alterando inmediatamente las tasas de los bonos, la volatilidad VIX, el régimen GEX y los mandatos de ejecución 0DTE para el Robot eTrade.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/macro/fcg"
              className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs sm:text-sm transition shadow-lg shadow-cyan-950/50 flex items-center gap-2 font-mono"
            >
              <Compass className="w-4 h-4 text-white" />
              Ver Grafo Causal (6 Capas)
            </Link>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm transition border border-slate-700 flex items-center gap-2"
            >
              Tablero Mercado <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Filtros de Categorías */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-slate-400 flex items-center gap-1.5 mr-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" /> Filtrar:
        </span>
        {[
          { id: "ALL", label: "Todos los Eventos" },
          { id: "INFLATION", label: "Inflación (CPI/PPI/PCE)" },
          { id: "EMPLOYMENT", label: "Empleo (NFP/Claims)" },
          { id: "MONETARY", label: "Tasas Fed (FOMC)" },
          { id: "MANUFACTURING", label: "Actividad (ISM/PMI)" },
          { id: "COMMODITIES", label: "Energía & Petróleo" },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition border ${
              selectedCategory === cat.id
                ? "bg-indigo-600 text-white border-indigo-500 font-semibold shadow-md"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Panel Principal: Grid de 2 Columnas (Calendario de Eventos vs Efecto Causal en Vivo) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Tabla del Calendario Económico (5 cols en LG) */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-400" />
              Eventos Programados EE.UU.
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {filteredEvents.length} Eventos Clave
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Selecciona un evento para ver o simular su onda de transmisión en el modelo FDE/FCG.
          </p>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredEvents.map(evt => {
              const isSelected = evt.id === selectedEventId;
              const hasDiff = evt.actual !== null && evt.actual !== evt.expected;
              const isHawkish = evt.actual !== null && evt.actual > evt.expected;

              return (
                <div
                  key={evt.id}
                  onClick={() => handleSelectEvent(evt)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                    isSelected
                      ? "bg-indigo-950/40 border-cyan-500 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-cyan-400 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-500" />
                      {evt.date} • {evt.time}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        evt.importance === "HIGH"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {evt.importance === "HIGH" ? "🔴 Impacto Alto" : "🟡 Impacto Medio"}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-white">{evt.title}</div>

                  {/* Cifras: Anterior | Previsión | Actual */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-900/90 border border-slate-800/80 rounded-lg p-2 text-center text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500">Anterior</div>
                      <div className="font-semibold text-slate-300">{evt.previous}{evt.unit}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Previsión</div>
                      <div className="font-semibold text-amber-300">{evt.expected}{evt.unit}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Publicado</div>
                      <div
                        className={`font-bold ${
                          evt.actual !== null
                            ? isHawkish
                              ? "text-rose-400"
                              : "text-emerald-400"
                            : "text-slate-500 italic"
                        }`}
                      >
                        {evt.actual !== null ? `${evt.actual}${evt.unit}` : "Pendiente"}
                      </div>
                    </div>
                  </div>

                  {/* Estado / Sorpresa */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                      {evt.description}
                    </span>
                    {evt.actual !== null && (
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          evt.actual > evt.expected
                            ? "bg-rose-950/80 text-rose-300 border border-rose-800"
                            : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                        }`}
                      >
                        {evt.actual > evt.expected ? "HAWKISH" : "DOVISH"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: El Efecto en el Mercado y en el Modelo FDE/FCG (7 cols en LG) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tarjeta de Simulación Interactiva del Evento Seleccionado */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  SIMULADOR DE CHOQUE MACROECONÓMICO
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedEvent.title}
                </h3>
              </div>
              <div className="text-right text-xs font-mono text-slate-400">
                Previsión del Consenso: <strong className="text-amber-300">{selectedEvent.expected}{selectedEvent.unit}</strong>
              </div>
            </div>

            {/* Slider / Input para cambiar el valor */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5 font-bold">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Valor Publicado (o Simulado):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    value={customValue}
                    onChange={(e) => handleSimulateValue(e.target.value)}
                    className="w-24 px-2.5 py-1 text-sm font-mono font-bold text-center bg-slate-900 border border-cyan-500 rounded text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  <span className="text-xs font-mono text-slate-400 font-bold">{selectedEvent.unit}</span>
                </div>
              </div>

              {/* Botones de Escenario Rápido */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Probar Escenarios:</span>
                <button
                  onClick={() => handleSimulateValue(String(selectedEvent.expected + 0.30))}
                  className="px-2.5 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] transition"
                >
                  ▲ Sorpresa Alcista (+0.30)
                </button>
                <button
                  onClick={() => handleSimulateValue(String(selectedEvent.expected))}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition"
                >
                  ═ En Línea ({selectedEvent.expected})
                </button>
                <button
                  onClick={() => handleSimulateValue(String(selectedEvent.expected - 0.30))}
                  className="px-2.5 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[11px] transition"
                >
                  ▼ Sorpresa Bajista (-0.30)
                </button>
              </div>
            </div>

            {/* Veredicto de Choque Inmediato */}
            {impact && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">Magnitud Choque</div>
                  <div className={`font-bold text-sm ${impact.surpriseShock > 0 ? "text-rose-400" : impact.surpriseShock < 0 ? "text-emerald-400" : "text-slate-300"}`}>
                    {impact.surpriseShock > 0 ? `+${impact.surpriseShock}` : impact.surpriseShock} {selectedEvent.unit}
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">Sesgo Macro</div>
                  <div className={`font-bold text-sm ${impact.shockDirection === "HAWKISH" ? "text-rose-400" : impact.shockDirection === "DOVISH" ? "text-emerald-400" : "text-amber-400"}`}>
                    {impact.shockDirection}
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">Régimen FDE</div>
                  <div className="font-bold text-sm text-cyan-300">{impact.macroRegime}</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400">Coherencia Causal</div>
                  <div className="font-bold text-sm text-indigo-300">{impact.coherencePct}%</div>
                </div>
              </div>
            )}
          </div>

          {/* Efecto Causal: Transmisión en las 6 Capas de Forrester */}
          {impact && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Efecto y Transmisión en las 6 Capas Causa/Efecto (FCG)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Modelo Forrester Activo
                </span>
              </div>

              <div className="space-y-2.5">
                {impact.transmissionSteps.map(step => (
                  <div
                    key={step.layer}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold text-[10px]">
                          Capa {step.layer}
                        </span>
                        <span className="font-bold text-white">{step.node}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 text-[11px]">{step.layerName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
                        {step.explanation}
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded font-bold text-xs inline-block ${
                          step.signal === "BEARISH"
                            ? "bg-rose-950/90 text-rose-300 border border-rose-800"
                            : step.signal === "EXTREME_VOLATILITY"
                            ? "bg-rose-950 text-amber-300 border border-rose-700 animate-pulse"
                            : step.signal === "BULLISH"
                            ? "bg-emerald-950/90 text-emerald-300 border border-emerald-800"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {step.shockValue}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impacto Cuantitativo Proyectado en los Activos Financieros */}
          {impact && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Impacto en Activos Financieros & Contratos de Opciones 0DTE
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Precios proyectados y niveles de activación de opciones calculados dinámicamente por el choque.
                  </p>
                </div>
              </div>

              {/* Grid de Activos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                {Object.values(impact.assetProjections).map(asset => {
                  const isUp = asset.deltaPct >= 0;
                  return (
                    <div
                      key={asset.symbol}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-cyan-400">{asset.symbol}</span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            isUp ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                          }`}
                        >
                          {isUp ? `+${asset.deltaPct}%` : `${asset.deltaPct}%`}
                        </span>
                      </div>

                      <div className="text-lg font-bold text-white">
                        ${asset.projectedPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>

                      <div className="border-t border-slate-800/80 pt-2 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Sesgo Opción:</span>
                          <span className="font-bold text-amber-300">{asset.optionBias}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Trigger:</span>
                          <span className="text-rose-400 font-semibold">${asset.triggerLevel}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Stop:</span>
                          <span className="text-slate-300">${asset.stopLevel}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mandato de ADUANA eTrade */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-white text-xs">
                      Mandato ADUANA Robot eTrade: {impact.robotMandate.aduanaCode}
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    Estrategia: {impact.robotMandate.recommendedStrategy}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {impact.robotMandate.tacticalAdvice}
                </p>

                {/* Acciones Permitidas vs Bloqueadas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-2.5 space-y-1 text-emerald-300">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Acciones Permitidas:
                    </div>
                    {impact.robotMandate.allowedActions.map((act, i) => (
                      <div key={i} className="text-[11px]">• {act}</div>
                    ))}
                  </div>
                  <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-2.5 space-y-1 text-rose-300">
                    <div className="font-bold flex items-center gap-1.5 text-rose-400">
                      <AlertTriangle className="w-3.5 h-3.5" /> Acciones Bloqueadas:
                    </div>
                    {impact.robotMandate.blockedActions.map((act, i) => (
                      <div key={i} className="text-[11px]">• {act}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botón para Aplicar Choque al Modelo FDE y BD */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 font-mono">
                  {fdeSyncedMessage ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> ¡Choque sincronizado con éxito en el FDE y Tablero Principal!
                    </span>
                  ) : (
                    <span>Puedes sincronizar este choque con el motor central FDE para impactar toda la plataforma.</span>
                  )}
                </div>

                <button
                  onClick={handleApplyToFde}
                  disabled={syncingFde}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono font-bold text-xs transition shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingFde ? "animate-spin" : ""}`} />
                  <span>{syncingFde ? "Propagando en FDE..." : "Aplicar Choque al FDE Central"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
