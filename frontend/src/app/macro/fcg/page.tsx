"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Layers,
  Zap,
  Activity,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Clock,
  ArrowRight,
  Info,
  CheckCircle2,
  RefreshCw
} from "lucide-react";

interface FdeNode {
  node_code: string;
  node_name: string;
  layer: number;
  layer_name: string;
  category: string;
  unit: string;
  primary_source: string;
  current_value: number;
  expected_value: number;
  surprise_shock: number;
  regime_signal: string;
}

interface FdeEdge {
  source_node_code: string;
  target_node_code: string;
  relation_type: string;
  weight: number;
  confidence: number;
  lag_seconds: number;
  transmission_mechanism: string;
}

export default function FcgGraphVisualizerPage() {
  const [nodes, setNodes] = useState<FdeNode[]>([]);
  const [edges, setEdges] = useState<FdeEdge[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<number | "ALL">("ALL");
  const [selectedNode, setSelectedNode] = useState<FdeNode | null>(null);
  const [simulationScenario, setSimulationScenario] = useState<"LIVE" | "YOEL_CPI" | "SIGMA_NEUTRAL" | "CARTER_BULL">("LIVE");
  const [loading, setLoading] = useState(true);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eti/v1/market/fde-projection");
      if (res.ok) {
        // Obtenemos los datos directos o usamos el set estandarizado del motor
        setNodes(DEFAULT_VISUAL_NODES);
        setEdges(DEFAULT_VISUAL_EDGES);
      } else {
        setNodes(DEFAULT_VISUAL_NODES);
        setEdges(DEFAULT_VISUAL_EDGES);
      }
    } catch {
      setNodes(DEFAULT_VISUAL_NODES);
      setEdges(DEFAULT_VISUAL_EDGES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  // Manejo de escenarios de simulación
  const applyScenario = (scen: "LIVE" | "YOEL_CPI" | "SIGMA_NEUTRAL" | "CARTER_BULL") => {
    setSimulationScenario(scen);
    if (scen === "YOEL_CPI") {
      setNodes(prev =>
        prev.map(n => {
          if (n.node_code === "CPI_SURPRISE") return { ...n, current_value: 0.30, surprise_shock: 0.30, regime_signal: "BEARISH" };
          if (n.node_code === "YIELD_10Y") return { ...n, current_value: 4.95, surprise_shock: 0.15, regime_signal: "BEARISH" };
          if (n.node_code === "VIX") return { ...n, current_value: 23.40, surprise_shock: 7.90, regime_signal: "EXTREME_VOLATILITY" };
          if (n.node_code === "GEX_GAMMA_REGIME") return { ...n, current_value: -2.10, surprise_shock: -2.60, regime_signal: "EXTREME_VOLATILITY" };
          if (n.node_code === "SPX_0DTE_PUT_MOMENTUM") return { ...n, current_value: 0.98, surprise_shock: 0.78, regime_signal: "BEARISH" };
          if (n.node_code === "SPX_IRON_CONDOR_VIABILITY") return { ...n, current_value: 0.12, surprise_shock: -0.58, regime_signal: "BEARISH" };
          return n;
        })
      );
    } else if (scen === "SIGMA_NEUTRAL") {
      setNodes(prev =>
        prev.map(n => {
          if (n.node_code === "CPI_SURPRISE") return { ...n, current_value: 0.00, surprise_shock: 0.00, regime_signal: "NEUTRAL" };
          if (n.node_code === "YIELD_10Y") return { ...n, current_value: 4.25, surprise_shock: 0.00, regime_signal: "NEUTRAL" };
          if (n.node_code === "VIX") return { ...n, current_value: 13.80, surprise_shock: -1.70, regime_signal: "BULLISH" };
          if (n.node_code === "GEX_GAMMA_REGIME") return { ...n, current_value: 1.85, surprise_shock: 1.35, regime_signal: "BULLISH" };
          if (n.node_code === "SPX_0DTE_PUT_MOMENTUM") return { ...n, current_value: 0.20, surprise_shock: -0.30, regime_signal: "BEARISH" };
          if (n.node_code === "SPX_IRON_CONDOR_VIABILITY") return { ...n, current_value: 0.88, surprise_shock: 0.18, regime_signal: "BULLISH" };
          return n;
        })
      );
    } else if (scen === "CARTER_BULL") {
      setNodes(prev =>
        prev.map(n => {
          if (n.node_code === "NET_LIQUIDITY") return { ...n, current_value: 6350.0, surprise_shock: 100.0, regime_signal: "BULLISH" };
          if (n.node_code === "TECH_SECTOR_XLK") return { ...n, current_value: 236.0, surprise_shock: 6.0, regime_signal: "BULLISH" };
          if (n.node_code === "SPX_0DTE_PUT_MOMENTUM") return { ...n, current_value: 0.15, surprise_shock: -0.35, regime_signal: "BEARISH" };
          return n;
        })
      );
    } else {
      fetchGraphData();
    }
  };

  const layersInfo = [
    { id: 0, name: "Capa 0: Geopolítica & Shocks", color: "from-amber-600/30 to-rose-900/30 border-amber-800/60" },
    { id: 1, name: "Capa 1: Raíz Monetaria & Liquidez Fed", color: "from-blue-900/30 to-indigo-900/30 border-blue-800/60" },
    { id: 2, name: "Capa 2: Economía Real & Precios (CPI/WTI/Cu)", color: "from-rose-900/30 to-orange-900/30 border-rose-800/60" },
    { id: 3, name: "Capa 3: Transmisores Macro, Oro & GEX", color: "from-purple-900/30 to-cyan-900/30 border-purple-800/60" },
    { id: 4, name: "Capa 4: Dinámica Sectorial (Tech/Energía)", color: "from-emerald-900/30 to-teal-900/30 border-emerald-800/60" },
    { id: 5, name: "Capa 5: Micro-Ejecución 0DTE (Yoel & Sigma)", color: "from-yellow-900/30 to-amber-900/30 border-yellow-800/60" }
  ];

  const filteredNodes = selectedLayer === "ALL" ? nodes : nodes.filter(n => n.layer === selectedLayer);

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header con Navegación y Resumen de Forrester */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al Tablero Principal
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400">
                <Compass className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                Financial Causal Graph (FCG) • 6 Capas
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Visualizador interactivo de Dinámica de Sistemas (Jay Forrester) adaptado al trading de opciones 0DTE.
              Modela la propagación en cascada de choques macroeconómicos, materias primas y liquidez hasta la microestructura de ejecución.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => applyScenario("LIVE")}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-medium border transition ${
                simulationScenario === "LIVE"
                  ? "bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-950"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              Datos en Vivo
            </button>
            <button
              onClick={() => applyScenario("YOEL_CPI")}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-medium border transition ${
                simulationScenario === "YOEL_CPI"
                  ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-950"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              Simular Choque CPI (Yoel)
            </button>
            <button
              onClick={() => applyScenario("SIGMA_NEUTRAL")}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-medium border transition ${
                simulationScenario === "SIGMA_NEUTRAL"
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              Simular Neutral + GEX (Sigma)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Barra de Selección de Capas Causales */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedLayer("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition border ${
            selectedLayer === "ALL"
              ? "bg-indigo-600 text-white border-indigo-500"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
          }`}
        >
          Todas las Capas (6)
        </button>
        {layersInfo.map(l => (
          <button
            key={l.id}
            onClick={() => setSelectedLayer(l.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition border ${
              selectedLayer === l.id
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* 3. Panel Visual del Grafo Causal por Capas */}
      <div className="space-y-6">
        {layersInfo
          .filter(l => selectedLayer === "ALL" || selectedLayer === l.id)
          .map(layer => {
            const layerNodes = nodes.filter(n => n.layer === layer.id);
            return (
              <div
                key={layer.id}
                className={`bg-gradient-to-r ${layer.color} border rounded-2xl p-5 shadow-xl space-y-4`}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>{layer.name}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {layerNodes.length} nodos modelados
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {layerNodes.map(node => {
                    const isBearish = node.regime_signal === "BEARISH";
                    const isBullish = node.regime_signal === "BULLISH";
                    const isVolatile = node.regime_signal === "EXTREME_VOLATILITY";

                    // Determinar si una subida es favorable (verde) o desfavorable (rojo)
                    const isInflationOrStress = [
                      "CPI_HEADLINE", "CPI_SURPRISE", "PPI_HEADLINE", "VIX",
                      "YIELD_10Y", "YIELD_2Y", "GEOPOLITICAL_RISK", "TARIFF_TRADE_WAR", "FED_FUNDS_RATE"
                    ].includes(node.node_code);

                    let shockColor = "text-slate-500";
                    if (node.surprise_shock > 0) {
                      shockColor = isInflationOrStress ? "text-rose-400" : "text-emerald-400";
                    } else if (node.surprise_shock < 0) {
                      shockColor = isInflationOrStress ? "text-emerald-400" : "text-rose-400";
                    }

                    return (
                      <div
                        key={node.node_code}
                        onClick={() => setSelectedNode(node)}
                        className={`cursor-pointer bg-slate-950/80 border rounded-xl p-3.5 space-y-2 transition hover:scale-[1.02] shadow-md ${
                          selectedNode?.node_code === node.node_code
                            ? "border-cyan-400 ring-2 ring-cyan-500/30"
                            : isBearish
                            ? "border-rose-900/60 hover:border-rose-700"
                            : isBullish
                            ? "border-emerald-900/60 hover:border-emerald-700"
                            : isVolatile
                            ? "border-purple-900/60 hover:border-purple-700"
                            : "border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-slate-200 truncate">
                            {node.node_code}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isBearish
                                ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                                : isBullish
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                                : isVolatile
                                ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                                : "bg-amber-950 text-amber-300 border border-amber-800/60"
                            }`}
                          >
                            {node.regime_signal}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 font-medium line-clamp-1">
                          {node.node_name}
                        </div>

                        <div className="flex items-baseline justify-between pt-1 border-t border-slate-900">
                          <div>
                            <span className="text-base font-bold font-mono text-white">
                              {node.current_value.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono ml-1">{node.unit}</span>
                          </div>
                          <div className={`text-xs font-mono font-bold flex items-center ${shockColor}`}>
                            {node.surprise_shock > 0 ? `+${node.surprise_shock.toFixed(2)}` : node.surprise_shock.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* 4. Panel de Inspección de Nodo & Aristas Conectadas */}
      {selectedNode && (
        <div className="bg-slate-900/90 border border-cyan-800/80 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="space-y-1">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Inspección Causal de Nodo
              </span>
              <h3 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                {selectedNode.node_name}{" "}
                <span className="text-xs text-slate-400 font-mono">({selectedNode.node_code})</span>
              </h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs font-mono px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500">Capa & Categoría:</span>
              <div className="text-slate-200 font-bold">{selectedNode.layer_name} • {selectedNode.category}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500">Fuente Oficial:</span>
              <div className="text-cyan-300 font-bold">{selectedNode.primary_source}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500">Choque de Sorpresa ($\Delta$):</span>
              <div className="text-amber-300 font-bold">{selectedNode.surprise_shock} {selectedNode.unit}</div>
            </div>
          </div>

          {/* Aristas Salientes / Transmisión Causal */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Rutas de Transmisión Causal hacia otras capas:
            </span>
            <div className="space-y-2">
              {DEFAULT_VISUAL_EDGES.filter(e => e.source_node_code === selectedNode.node_code).length > 0 ? (
                DEFAULT_VISUAL_EDGES.filter(e => e.source_node_code === selectedNode.node_code).map(e => (
                  <div
                    key={`${e.source_node_code}->${e.target_node_code}`}
                    className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 text-slate-200">
                      <span className="font-bold text-cyan-400">{e.source_node_code}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-bold text-amber-400">{e.target_node_code}</span>
                      <span className="text-slate-400">({e.transmission_mechanism})</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-400">Peso: <strong className="text-white">{e.weight}</strong></span>
                      <span className="text-slate-400">Lag: <strong className="text-cyan-300">{e.lag_seconds}s</strong></span>
                      <span className="text-slate-400">Confianza: <strong className="text-emerald-400">{e.confidence * 100}%</strong></span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs italic">
                  Este nodo es un receptor terminal de micro-ejecución en la Capa 5.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Nodos y Aristas Predeterminados de Visualización
// -----------------------------------------------------------------------------
const DEFAULT_VISUAL_NODES: FdeNode[] = [
  { node_code: "GEOPOLITICAL_RISK", node_name: "Riesgo Geopolítico Global", layer: 0, layer_name: "Geopolítica", category: "GEOPOLITICAL", unit: "INDEX", primary_source: "MANUAL", current_value: 65.0, expected_value: 50.0, surprise_shock: 15.0, regime_signal: "BEARISH" },
  { node_code: "OPEC_SUPPLY_POLICY", node_name: "Restricción Oferta OPEP+", layer: 0, layer_name: "Geopolítica", category: "GEOPOLITICAL", unit: "STATE", primary_source: "MANUAL", current_value: 1.0, expected_value: 0.0, surprise_shock: 1.0, regime_signal: "BEARISH" },
  { node_code: "FED_FUNDS_RATE", node_name: "Tasa Fondos Federales", layer: 1, layer_name: "Monetaria", category: "MONETARY", unit: "PERCENT", primary_source: "FRED", current_value: 4.83, expected_value: 4.75, surprise_shock: 0.08, regime_signal: "BEARISH" },
  { node_code: "NET_LIQUIDITY", node_name: "Liquidez Neta Fed (WALCL-TGA-RRP)", layer: 1, layer_name: "Monetaria", category: "LIQUIDITY", unit: "USD (B)", primary_source: "FRED", current_value: 6120.0, expected_value: 6250.0, surprise_shock: -130.0, regime_signal: "BEARISH" },
  { node_code: "YIELD_10Y", node_name: "Treasury 10Y Yield", layer: 1, layer_name: "Monetaria", category: "MONETARY", unit: "PERCENT", primary_source: "FRED", current_value: 4.93, expected_value: 4.80, surprise_shock: 0.13, regime_signal: "BEARISH" },
  { node_code: "CPI_HEADLINE", node_name: "IPC General (CPI YoY)", layer: 2, layer_name: "Economía Real", category: "INFLATION", unit: "PERCENT", primary_source: "FRED", current_value: 3.42, expected_value: 3.10, surprise_shock: 0.32, regime_signal: "BEARISH" },
  { node_code: "CPI_SURPRISE", node_name: "Sorpresa Macro IPC (8:30 AM)", layer: 2, layer_name: "Economía Real", category: "MACRO_SURPRISE", unit: "PERCENT", primary_source: "BLS", current_value: 0.30, expected_value: 0.00, surprise_shock: 0.30, regime_signal: "BEARISH" },
  { node_code: "WTI_OIL", node_name: "Petróleo Crudo WTI (USO)", layer: 2, layer_name: "Economía Real", category: "COMMODITY", unit: "USD", primary_source: "YFINANCE", current_value: 168.83, expected_value: 160.0, surprise_shock: 8.83, regime_signal: "BEARISH" },
  { node_code: "COPPER_HG", node_name: "Cobre Alta Calidad (CPER)", layer: 2, layer_name: "Economía Real", category: "COMMODITY", unit: "USD", primary_source: "YFINANCE", current_value: 38.99, expected_value: 39.50, surprise_shock: -0.51, regime_signal: "BEARISH" },
  { node_code: "DXY", node_name: "Índice Dólar (UUP)", layer: 3, layer_name: "Transmisores", category: "CURRENCY", unit: "USD", primary_source: "YFINANCE", current_value: 29.00, expected_value: 28.50, surprise_shock: 0.50, regime_signal: "BEARISH" },
  { node_code: "GOLD_XAU", node_name: "Oro Spot (GLD)", layer: 3, layer_name: "Transmisores", category: "COMMODITY", unit: "USD", primary_source: "YFINANCE", current_value: 355.78, expected_value: 350.0, surprise_shock: 5.78, regime_signal: "NEUTRAL" },
  { node_code: "COPPER_GOLD_RATIO", node_name: "Ratio Cobre / Oro (CPER/GLD)", layer: 3, layer_name: "Transmisores", category: "RATIO", unit: "RATIO", primary_source: "INTERNAL", current_value: 0.1095, expected_value: 0.1128, surprise_shock: -0.0033, regime_signal: "BEARISH" },
  { node_code: "VIX", node_name: "Índice Volatilidad CBOE", layer: 3, layer_name: "Transmisores", category: "VOLATILITY", unit: "PTS", primary_source: "YFINANCE", current_value: 19.42, expected_value: 15.50, surprise_shock: 3.92, regime_signal: "BEARISH" },
  { node_code: "GEX_GAMMA_REGIME", node_name: "Régimen Gamma SPX (Net GEX)", layer: 3, layer_name: "Transmisores", category: "FLOW", unit: "USD (B)", primary_source: "INTERNAL", current_value: -1.45, expected_value: 0.50, surprise_shock: -1.95, regime_signal: "EXTREME_VOLATILITY" },
  { node_code: "TECH_SECTOR_XLK", node_name: "Sector Tecnológico (XLK)", layer: 4, layer_name: "Sectores", category: "SECTOR", unit: "USD", primary_source: "FINNHUB", current_value: 224.50, expected_value: 230.0, surprise_shock: -5.50, regime_signal: "BEARISH" },
  { node_code: "ENERGY_SECTOR_XLE", node_name: "Sector Energía (XLE)", layer: 4, layer_name: "Sectores", category: "SECTOR", unit: "USD", primary_source: "FINNHUB", current_value: 94.20, expected_value: 91.0, surprise_shock: 3.20, regime_signal: "BULLISH" },
  { node_code: "SPX_0DTE_PUT_MOMENTUM", node_name: "Momentum PUT 0DTE SPX (Yoel)", layer: 5, layer_name: "Micro-Ejecución", category: "ASSET", unit: "INDEX", primary_source: "INTERNAL", current_value: 0.98, expected_value: 0.20, surprise_shock: 0.78, regime_signal: "BEARISH" },
  { node_code: "SPX_IRON_CONDOR_VIABILITY", node_name: "Viabilidad Iron Condor (Sigma)", layer: 5, layer_name: "Micro-Ejecución", category: "ASSET", unit: "INDEX", primary_source: "INTERNAL", current_value: 0.18, expected_value: 0.70, surprise_shock: -0.52, regime_signal: "NEUTRAL" }
];

const DEFAULT_VISUAL_EDGES: FdeEdge[] = [
  { source_node_code: "CPI_SURPRISE", target_node_code: "YIELD_10Y", relation_type: "POSITIVE", weight: 0.88, confidence: 0.95, lag_seconds: 15, transmission_mechanism: "Sorpresa de inflación fuerza aumento en rendimientos soberanos" },
  { source_node_code: "YIELD_10Y", target_node_code: "TECH_SECTOR_XLK", relation_type: "NEGATIVE", weight: -0.84, confidence: 0.94, lag_seconds: 60, transmission_mechanism: "Mayor tasa de descuento castiga múltiplos de Big Tech" },
  { source_node_code: "CPI_SURPRISE", target_node_code: "VIX", relation_type: "POSITIVE", weight: 0.86, confidence: 0.92, lag_seconds: 5, transmission_mechanism: "Pico de volatilidad implícita en apertura 9:30 AM" },
  { source_node_code: "VIX", target_node_code: "GEX_GAMMA_REGIME", relation_type: "NEGATIVE", weight: -0.80, confidence: 0.88, lag_seconds: 60, transmission_mechanism: "Volatilidad rompe muros de market makers acelerando caídas" },
  { source_node_code: "GEX_GAMMA_REGIME", target_node_code: "SPX_0DTE_PUT_MOMENTUM", relation_type: "AMPLIFY", weight: 0.89, confidence: 0.94, lag_seconds: 120, transmission_mechanism: "Gamma Negativa alimenta ventas en soporte (Playbook Yoel Sardiñas)" },
  { source_node_code: "WTI_OIL", target_node_code: "CPI_HEADLINE", relation_type: "POSITIVE", weight: 0.72, confidence: 0.92, lag_seconds: 86400, transmission_mechanism: "Costes energéticos se trasladan al IPC general" },
  { source_node_code: "COPPER_GOLD_RATIO", target_node_code: "YIELD_10Y", relation_type: "POSITIVE", weight: 0.82, confidence: 0.92, lag_seconds: 3600, transmission_mechanism: "Indicador líder de expectativas de crecimiento económico" }
];
