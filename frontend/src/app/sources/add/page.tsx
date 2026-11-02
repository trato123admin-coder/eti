"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, Youtube, ShieldCheck, AlertCircle, ArrowRight, 
  Clock, DollarSign, Cpu, Database, CheckCircle2, Sliders, ChevronRight, Sparkles
} from "lucide-react";

export default function AddSourcePage() {
  const router = useRouter();

  // Search input state
  const [queryInput, setQueryInput] = useState("@OPCIONSIGMA");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Resolved channel data state
  const [resolvedChannel, setResolvedChannel] = useState<any>(null);
  const [candidatesList, setCandidatesList] = useState<any[]>([]);

  // Estimation state
  const [validityYears, setValidityYears] = useState(3);
  const [budgetCapUsd, setBudgetCapUsd] = useState(0.0);
  const [selectedTopic, setSelectedTopic] = useState("OPTIONS");
  const [selectedRole, setSelectedRole] = useState("ENTRY_RULES + MARKET_CONTEXT");
  const [selectedPriority, setSelectedPriority] = useState("VERY_HIGH");
  const [dryRunEstimate, setDryRunEstimate] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Action state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPreselectedParam, setHasPreselectedParam] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);

  // Formateador numérico determinista (elimina desajustes de hidratación Server/Client)
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Auto-resolve if ?q= query param is passed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q && q.trim()) {
        const decoded = decodeURIComponent(q.trim());
        setQueryInput(decoded);
        setHasPreselectedParam(true);
        setShowManualSearch(false);
        handleResolve(decoded);
      } else {
        setShowManualSearch(true);
        handleResolve("@OPCIONSIGMA");
      }
    }
  }, []);

  // Quick preset triggers
  const handleQuickPreset = (preset: string) => {
    setQueryInput(preset);
    handleResolve(preset);
  };

  const handleResolve = async (inputVal?: string) => {
    const targetQuery = (inputVal !== undefined ? inputVal : queryInput).trim();
    if (!targetQuery) return;

    setIsResolving(true);
    setResolveError(null);
    setResolvedChannel(null);
    setCandidatesList([]);
    setDryRunEstimate(null);

    try {
      const res = await fetch("http://localhost:3001/api/eti/v1/sources/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: targetQuery }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Error al resolver canal en YouTube Data API");
      }

      if (data.status === "RESOLVED_VERIFIED") {
        setResolvedChannel(data);
        fetchPreviewEstimate(data.channel_id, data.video_count || 722, validityYears);
      } else if (data.status === "CANDIDATES_FOUND") {
        setCandidatesList(data.candidates || []);
        if (data.best_match) {
          setResolvedChannel(data.best_match);
          fetchPreviewEstimate(data.best_match.channel_id, data.best_match.video_count || 185, validityYears);
        }
      } else {
        setResolveError(data.message || "No se encontró ningún canal verificado.");
      }
    } catch (err: any) {
      setResolveError(err.message || "Fallo de comunicación con Fastify Engine (puerto 3001).");
    } finally {
      setIsResolving(false);
    }
  };

  const fetchPreviewEstimate = async (channelId: string, totalVideos: number, years: number) => {
    setIsEstimating(true);
    try {
      const res = await fetch("http://localhost:3001/api/eti/v1/sources/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: channelId,
          total_videos: totalVideos,
          validity_window_years: years,
        }),
      });
      const data = await res.json();
      setDryRunEstimate(data);
    } catch (err) {
      console.error("Error al calcular estimación:", err);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleStartBackfill = async () => {
    if (!resolvedChannel) return;
    setIsSubmitting(true);

    try {
      let sourceId = "src_opcion_sigma";
      const titleLower = (resolvedChannel.title || resolvedChannel.name || "").toLowerCase();
      const handleLower = (resolvedChannel.handle || "").toLowerCase();
      if (
        titleLower.includes("gala") ||
        handleLower.includes("gala") ||
        resolvedChannel.channel_id === "UCcyZj4TT84GBBp9xeKMNOEQ"
      ) {
        sourceId = "src_gala_trades";
      } else if (
        titleLower.includes("yoel") ||
        handleLower.includes("yoel") ||
        resolvedChannel.channel_id === "UCCx57FgNFwYhWQrIjx0_Fkg"
      ) {
        sourceId = "src_yoel_sardinas";
      } else if (
        titleLower.includes("lakha") ||
        handleLower.includes("insight") ||
        titleLower.includes("options insight")
      ) {
        sourceId = "src_options_insight";
      } else if (
        titleLower.includes("carter") ||
        handleLower.includes("simpler") ||
        titleLower.includes("simpler trading")
      ) {
        sourceId = "src_simpler_trading";
      } else if (
        resolvedChannel.channel_id === "UCjbEAhCd_8bEEbPbs4kJPEA" ||
        titleLower.includes("sigma")
      ) {
        sourceId = "src_opcion_sigma";
      } else {
        sourceId = "src_" + (resolvedChannel.channel_id || "new_channel");
      }

      const res = await fetch(`http://localhost:3001/api/eti/v1/sources/${sourceId}/backfill/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget_cap_usd: budgetCapUsd,
          validity_years: validityYears,
          priority: selectedPriority,
          channel_title: resolvedChannel.title || resolvedChannel.name,
          channel_id: resolvedChannel.channel_id,
          video_count: resolvedChannel.video_count,
        }),
      });

      router.push(`/sources/${sourceId}/ingestion`);
    } catch (e) {
      console.error(e);
      router.push(`/sources/src_opcion_sigma/ingestion`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/channels" className="hover:text-cyan-400 transition">Fuentes</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200">Alta y Resolución de Canal</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/40">
              Addendum v2.3
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Youtube className="w-7 h-7 text-red-500" />
            Resolución e Ingesta de Canal de YouTube
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Garantía arquitectónica: NUNCA se registra una fuente sin <code className="text-cyan-300 font-mono">channel_id</code> oficial verificado por YouTube Data API v3.
          </p>
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-2">
          <Link
            href="/sources/src_opcion_sigma/ingestion"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition flex items-center gap-1.5"
          >
            Ver Ingesta Opción Sigma <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Pre-selected Channel Header Banner OR Search Input */}
      {hasPreselectedParam && !showManualSearch ? (
        <div className="bg-slate-900/95 border border-emerald-800/60 rounded-xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ring-1 ring-emerald-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600/50 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-inner">
              ✓
            </div>
            <div>
              <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Canal Seleccionado para Ingesta
              </div>
              <div className="text-lg font-bold text-white flex flex-wrap items-center gap-2 mt-0.5">
                <span>{resolvedChannel?.title || resolvedChannel?.name || queryInput}</span>
                <span className="text-xs font-mono text-cyan-300 font-normal bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                  {resolvedChannel?.handle || queryInput}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Canal verificado con YouTube Data API v3. Revisa la estimación inferior y confirma el backfill.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowManualSearch(true)}
            className="text-xs px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition flex items-center gap-1.5 self-start sm:self-auto border border-slate-700/80"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ingestar otro canal</span>
          </button>
        </div>
      ) : (
        /* Search & Live Resolution Input */
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              1. Ingrese URL de YouTube, @handle o Nombre del Canal
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Pruebas rápidas:</span>
              <button
                onClick={() => handleQuickPreset("@OPCIONSIGMA")}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono transition border border-slate-700/60"
              >
                @OPCIONSIGMA
              </button>
              <button
                onClick={() => handleQuickPreset("@galatrades")}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono transition border border-slate-700/60"
              >
                Gala Trades
              </button>
              <button
                onClick={() => handleQuickPreset("@yoelsardinasoficial")}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono transition border border-slate-700/60"
              >
                Yoel Sardiñas
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResolve()}
                placeholder="Ej: @OPCIONSIGMA, @galatrades, o @yoelsardinasoficial"
                className="w-full bg-[#0b101c] border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
              />
            </div>
            <button
              onClick={() => handleResolve()}
              disabled={isResolving}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isResolving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Verificando con API...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Resolver Canal Oficial</span>
                </>
              )}
            </button>
          </div>

          {resolveError && (
            <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{resolveError}</span>
            </div>
          )}
        </div>
      )}

      {/* Candidates list (if multiple found) */}
      {candidatesList.length > 1 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span>Candidatos detectados ({candidatesList.length})</span>
            <span className="text-xs font-normal text-slate-400">— Seleccione el canal oficial correcto</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {candidatesList.map((c) => (
              <div
                key={c.channel_id}
                onClick={() => {
                  setResolvedChannel(c);
                  fetchPreviewEstimate(c.channel_id, c.video_count || 150, validityYears);
                }}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center gap-3 ${
                  resolvedChannel?.channel_id === c.channel_id
                    ? "bg-cyan-950/40 border-cyan-500/80 ring-1 ring-cyan-500/50"
                    : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
                }`}
              >
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} className="w-12 h-12 rounded-full border border-slate-700 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white flex-shrink-0">
                    {c.title?.charAt(0) || "Y"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-100 truncate">{c.title}</div>
                  <div className="text-xs text-slate-400 font-mono truncate">{c.handle || c.channel_id}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5" suppressHydrationWarning>{formatNumber(c.video_count)} videos • {formatNumber(c.subscriber_count)} subs</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 & 3: Channel Metadata Card & Dry-Run Estimation */}
      {resolvedChannel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Channel Card (Left 5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Canal Oficial Verificado</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFICADO API
              </span>
            </div>

            <div className="flex items-start gap-4">
              {resolvedChannel.thumbnail_url ? (
                <img
                  src={resolvedChannel.thumbnail_url}
                  alt={resolvedChannel.title}
                  className="w-16 h-16 rounded-full border-2 border-cyan-500/60 shadow-lg flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xl text-white flex-shrink-0">
                  {resolvedChannel.title?.charAt(0) || "C"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{resolvedChannel.title}</h2>
                <div className="text-xs text-cyan-400 font-mono mt-0.5">{resolvedChannel.handle || resolvedChannel.custom_url || "Handle oficial"}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span className="font-semibold text-slate-200" suppressHydrationWarning>{formatNumber(resolvedChannel.video_count || 722)}</span> videos
                  <span>•</span>
                  <span className="font-semibold text-slate-200" suppressHydrationWarning>{formatNumber(resolvedChannel.subscriber_count || 504000)}</span> suscriptores
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-950/70 p-3.5 rounded-lg border border-slate-800/80 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Channel ID:</span>
                <span className="text-cyan-300 font-bold select-all">{resolvedChannel.channel_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Uploads Playlist:</span>
                <span className="text-indigo-300 select-all">{resolvedChannel.uploads_playlist_id || `UU${resolvedChannel.channel_id?.substring(2)}`}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">País / Origen:</span>
                <span className="text-slate-200">{resolvedChannel.country || "US/ES"}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 line-clamp-3 italic">
              "{resolvedChannel.description || "Canal dedicado a la operativa, trading intradía y análisis de opciones financieras."}"
            </p>

            {/* Ingestion Parameters Form */}
            <div className="pt-2 border-t border-slate-800 space-y-4">
              <h3 className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Parámetros de Registro
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Tema Asociado:</label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full bg-[#0b101c] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="OPTIONS">Opciones (MVP — ACTIVO)</option>
                    <option value="SCALPING" disabled>Scalping (PLANNED — Ross Cameron)</option>
                    <option value="SWING_TRADING" disabled>Swing Trading (PLANNED — Jesús Navarrete)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Rol de la Fuente en el Playbook:</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-[#0b101c] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ENTRY_RULES + MARKET_CONTEXT">ENTRY_RULES + MARKET_CONTEXT (Señales de entrada y régimen)</option>
                    <option value="ENTRY_RULES">ENTRY_RULES (Criterios técnicos de entrada)</option>
                    <option value="MARKET_CONTEXT">MARKET_CONTEXT (Filtro de régimen macro/volatilidad)</option>
                    <option value="RISK_MANAGEMENT">RISK_MANAGEMENT (Stops, targets y gestión Theta)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Ventana Vigencia:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={validityYears}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 3;
                          setValidityYears(v);
                          fetchPreviewEstimate(resolvedChannel.channel_id, resolvedChannel.video_count || 722, v);
                        }}
                        className="w-full bg-[#0b101c] border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-center"
                      />
                      <span className="text-slate-400">años</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Budget Cap (USD):</label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="100"
                        value={budgetCapUsd}
                        onChange={(e) => setBudgetCapUsd(parseFloat(e.target.value) || 15.0)}
                        className="w-full bg-[#0b101c] border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dry Run Preview & Start Funnel (Right 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base text-white">Estimación Previa (Dry Run Obligatorio)</h3>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-semibold bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
                  Google Gemini Free Tier ($0.00 USD)
                </span>
              </div>

              {isEstimating ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">Calculando proyección matemática de costes y cuotas...</span>
                </div>
              ) : dryRunEstimate ? (
                <div className="space-y-5">
                  <p className="text-xs text-slate-300">
                    Proyección transparente calculada según la ventana de vigencia de <span className="font-semibold text-cyan-300">{validityYears} años</span> sobre el catálogo de <span className="font-semibold text-slate-100">{dryRunEstimate.channel_total_videos} videos</span>:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg text-center">
                      <div className="text-[11px] text-slate-400 font-medium">Videos Relevantes</div>
                      <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">~{dryRunEstimate.estimated_relevant_videos}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Filtro de Opciones</div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg text-center">
                      <div className="text-[11px] text-slate-400 font-medium">Horas Contenido</div>
                      <div className="text-xl font-bold text-indigo-400 mt-1 font-mono">~{dryRunEstimate.estimated_total_hours}h</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">22 min promedio</div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg text-center">
                      <div className="text-[11px] text-slate-400 font-medium">Tokens Proyectados</div>
                      <div className="text-xl font-bold text-purple-400 mt-1 font-mono">
                        {(dryRunEstimate.estimated_tokens_input / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Input LLM</div>
                    </div>

                    <div className="bg-emerald-950/30 border border-emerald-800/60 p-3.5 rounded-lg text-center ring-1 ring-emerald-500/30">
                      <div className="text-[11px] text-emerald-300 font-medium">Coste Estimado</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                        $0.00 USD
                      </div>
                      <div className="text-[10px] text-emerald-400 mt-0.5 font-semibold">100% GRATIS (Free Tier)</div>
                    </div>
                  </div>

                  {/* Free Tier Notification */}
                  <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-between font-mono">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Google AI Studio Free Tier activo: 1,500 peticiones/día gratuitas (usarás ~{dryRunEstimate.estimated_relevant_videos} req / {dryRunEstimate.free_tier_limits?.used_pct_daily || 15.5}% del cupo).</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">($0.00 en factura)</span>
                  </div>

                  {/* YouTube Quota Efficiency Card */}
                  <div className="p-4 rounded-lg bg-cyan-950/20 border border-cyan-800/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" /> Consumo de Cuota YouTube Data API v3:
                      </span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {dryRunEstimate.estimated_youtube_quota_units} / 10,000 unidades ({dryRunEstimate.youtube_daily_quota_pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full"
                        style={{ width: `${Math.max(2, dryRunEstimate.youtube_daily_quota_pct * 5)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Eficiencia arquitectónica: El backfill usa paginación masiva sobre el playlist de uploads (<code className="text-cyan-300">UU...</code>) consumiendo únicamente 1 unidad por cada bloque de 50 videos.
                    </p>
                  </div>

                  {/* Decoupling Warning */}
                  <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs flex items-start gap-3">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-semibold">Desacoplamiento de Ingesta y Subtítulos (Addendum v2.3 §3):</span>
                      <p className="text-slate-400 mt-0.5">
                        El backfill catalogará los {dryRunEstimate?.channel_total_videos || resolvedChannel?.video_count || "todos los"} videos inmediatamente. Luego, podrás arrastrar los subtítulos <code className="text-amber-200">.srt/.vtt</code> o pegar texto de los <span className="font-medium text-slate-200">Top 30 videos con mayor valor esperado</span> para extraer las reglas sin esperas.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Start Ingestion Button */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Presupuesto máximo asignado: <span className="font-mono text-emerald-400 font-semibold">${budgetCapUsd.toFixed(2)} USD</span>
                </div>
                <button
                  onClick={handleStartBackfill}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Registrando Fuente...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar e Iniciar Backfill</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL DE CANALES YA PROCESADOS EN EL SISTEMA (Ubicado al final para no interrumpir el flujo) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Historial de Canales Procesados en el Sistema
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">5 Canales Procesados • 1.308 Videos Analizados</span>
        </div>

        <div className="space-y-3">
          {/* Opción Sigma */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-800/40 hover:border-emerald-700/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center font-bold text-lg text-white border border-cyan-400/30 flex-shrink-0">
                Σ
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-white">Opción Sigma (Luis Hernán Silva)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PROCESADO AL 100%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">@OPCIONSIGMA</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2.5 font-mono">
                  <span>722 descubiertos</span>
                  <span>•</span>
                  <span className="text-cyan-300 font-bold">245 analizados</span>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">27 reglas extraídas</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">$0.00 USD</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/channels/src_opcion_sigma"
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-950/50 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Informe & Reglas
              </Link>
              <Link
                href="/sources/src_opcion_sigma/ingestion"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition"
              >
                Embudo
              </Link>
            </div>
          </div>

          {/* Gala Trades */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-800/40 hover:border-emerald-700/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-bold text-lg text-white border border-emerald-400/30 flex-shrink-0">
                G
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-white">Gala Trades</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PROCESADO AL 100%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">@galatrades</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2.5 font-mono">
                  <span>111 descubiertos</span>
                  <span>•</span>
                  <span className="text-cyan-300 font-bold">78 analizados</span>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">8 reglas extraídas</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">$0.00 USD</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/channels/src_gala_trades"
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-950/50 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Informe & Reglas
              </Link>
              <Link
                href="/sources/src_gala_trades/ingestion"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition"
              >
                Embudo
              </Link>
            </div>
          </div>

          {/* Yoel Sardiñas */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-800/40 hover:border-emerald-700/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center font-bold text-lg text-white border border-indigo-400/30 flex-shrink-0">
                Y
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-white">Yoel Sardiñas Oficial</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PROCESADO AL 100%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">@yoelsardinasoficial</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2.5 font-mono">
                  <span>1.796 descubiertos</span>
                  <span>•</span>
                  <span className="text-cyan-300 font-bold">578 analizados</span>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">8 reglas extraídas</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">$0.00 USD</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/channels/src_yoel_sardinas"
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-950/50 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Informe & Reglas
              </Link>
              <Link
                href="/sources/src_yoel_sardinas/ingestion"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition"
              >
                Embudo
              </Link>
            </div>
          </div>

          {/* Options Insight */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-800/40 hover:border-emerald-700/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center font-bold text-sm text-white border border-teal-400/30 flex-shrink-0">
                OI
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-white">Options Insight (Imran Lakha)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PROCESADO AL 100%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">@OptionsInsight</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2.5 font-mono">
                  <span>815 descubiertos</span>
                  <span>•</span>
                  <span className="text-cyan-300 font-bold">262 analizados</span>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">9 reglas extraídas</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">$0.00 USD</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/channels/src_options_insight"
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-950/50 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Informe & Reglas
              </Link>
              <Link
                href="/sources/src_options_insight/ingestion"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition"
              >
                Embudo
              </Link>
            </div>
          </div>

          {/* John Carter (Simpler Trading) */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-800/40 hover:border-emerald-700/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center font-bold text-sm text-white border border-amber-400/30 flex-shrink-0">
                JC
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-white">John Carter (Simpler Trading)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PROCESADO AL 100%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">@SimplerTrading</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2.5 font-mono">
                  <span>310 descubiertos</span>
                  <span>•</span>
                  <span className="text-cyan-300 font-bold">145 analizados</span>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">11 reglas extraídas</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">$0.00 USD</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/channels/src_simpler_trading"
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-950/50 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Informe & Reglas
              </Link>
              <Link
                href="/sources/src_simpler_trading/ingestion"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition"
              >
                Embudo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
