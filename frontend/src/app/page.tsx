import Link from "next/link";
import { 
  TrendingUp, TrendingDown, Activity, ArrowRight, ShieldAlert,
  Flame, BarChart2, Compass, Layers, CheckCircle2, AlertTriangle, Eye
} from "lucide-react";
import FdePreMarketConsole from "@/components/FdePreMarketConsole";

// Fetch live market data from Fastify Engine
async function getMarketData() {
  const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:3001";
  try {
    const [instRes, breadthRes, moversRes, heatmapRes, projRes, fdeRes] = await Promise.all([
      fetch(`${engineUrl}/api/eti/v1/market/instruments`, { cache: "no-store" }).catch(() => null),
      fetch(`${engineUrl}/api/eti/v1/market/breadth`, { cache: "no-store" }).catch(() => null),
      fetch(`${engineUrl}/api/eti/v1/market/movers`, { cache: "no-store" }).catch(() => null),
      fetch(`${engineUrl}/api/eti/v1/market/heatmap`, { cache: "no-store" }).catch(() => null),
      fetch(`${engineUrl}/api/eti/v1/market/projections`, { cache: "no-store" }).catch(() => null),
      fetch(`${engineUrl}/api/eti/v1/market/fde-projection`, { cache: "no-store" }).catch(() => null)
    ]);

    const instruments = instRes && instRes.ok ? (await instRes.json()).instruments : [];
    const breadth = breadthRes && breadthRes.ok ? await breadthRes.json() : null;
    const movers = moversRes && moversRes.ok ? (await moversRes.json()).movers : [];
    const heatmap = heatmapRes && heatmapRes.ok ? (await heatmapRes.json()).sectors : [];
    const projections = projRes && projRes.ok ? (await projRes.json()).projections : [];
    const fdeProjection = fdeRes && fdeRes.ok ? await fdeRes.json() : null;

    return { instruments, breadth, movers, heatmap, projections, fdeProjection };
  } catch (err) {
    console.error("Error fetching market data from engine:", err);
    return { instruments: [], breadth: null, movers: [], heatmap: [], projections: [], fdeProjection: null };
  }
}

export default async function MercadoAhoraPage() {
  const { instruments, breadth, movers, heatmap, projections, fdeProjection } = await getMarketData();

  return (
    <div className="space-y-8">
      {/* Top Section: Mercado Ahora Header conforming to Addendum v2.2 §5.2 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> MERCADO AHORA • RADAR ENGINE ACTIVO
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Estado de Mercado y Proyecciones en Tiempo Real
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Consola de mercado institucional (Addendum v2.2 §5.2). Lectura de índices, volatilidad VIX,
              amplitud del S&P 500 y matriz de escenarios para el Tema <strong>Opciones</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/macro/fcg"
              className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition shadow-lg shadow-cyan-950/50 flex items-center gap-2 font-mono"
            >
              <Compass className="w-4 h-4 text-white" />
              Grafo Causal FCG (6 Capas)
            </Link>
            <Link
              href="/topics/options"
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-950/50 flex items-center gap-2"
            >
              Tema Opciones <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/topics/options/playbook"
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition border border-slate-700 flex items-center gap-2"
            >
              Ver Playbook Consolidado
            </Link>
          </div>
        </div>
      </div>

      {/* Consola Pre-Market & Proyección Causal del Día (Financial Dynamics Engine) */}
      <FdePreMarketConsole initialData={fdeProjection} />

      {/* 1. Panel de Instrumentos Clave (SPY, QQQ, DIA, IWM, VIX, US10Y, DXY Proxy) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" /> Instrumentos Principales (Régimen RADAR & Niveles Clave)
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Actualización centralizada en servidor con caché
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {instruments.map((inst: any) => {
            const isPositive = inst.changePct >= 0;
            return (
              <div
                key={inst.symbol}
                className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 space-y-3 hover:border-slate-700 transition shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-lg text-white">{inst.symbol}</span>
                      {inst.proxyFor && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          Proxy {inst.proxyFor}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{inst.name}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-white">${inst.price.toFixed(2)}</div>
                    <div
                      className={`text-xs font-mono font-semibold flex items-center justify-end gap-0.5 ${
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {isPositive ? `+${inst.changePct.toFixed(2)}%` : `${inst.changePct.toFixed(2)}%`}
                    </div>
                  </div>
                </div>

                {/* RADAR Metrics Badge Grid */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/50">
                    <span className="text-slate-500">Régimen: </span>
                    <strong
                      className={
                        inst.regime === "BULLISH"
                          ? "text-emerald-400"
                          : inst.regime === "BEARISH"
                          ? "text-rose-400"
                          : "text-amber-400"
                      }
                    >
                      {inst.regime}
                    </strong>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/50">
                    <span className="text-slate-500">RSI 14: </span>
                    <strong className="text-slate-200">{inst.rsi14}</strong>
                  </div>
                </div>

                {/* Key Levels */}
                {inst.keyLevels && (
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1">
                    <span>VWAP: ${inst.keyLevels.vwap}</span>
                    <span>Gap: {inst.keyLevels.gapPct > 0 ? `+${inst.keyLevels.gapPct}%` : `${inst.keyLevels.gapPct}%`}</span>
                    <span>Rango ATR: {inst.atrPercentile}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Proyecciones de Acciones Principales & Escenarios Causales (§5.4) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 mb-1">
              <Compass className="w-3.5 h-3.5" /> MATRIZ DE APERTURA • ROBOT ETRADE DISPATCHER
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" /> Proyecciones de Acciones Principales en ETI (SPX, META, NVDA, SPY, QQQ)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Niveles técnicos de activación e invalidación alineados con el Financial Causal Graph (FCG) de 6 capas y la regla de Aduana O-13.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-mono self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>API eTrade: GET /api/eti/v1/market/projections</span>
          </div>
        </div>

        {/* Tabla Institucional de Proyecciones Principales para el Robot eTrade */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Activo</th>
                <th className="py-3 px-3">Precio Ref.</th>
                <th className="py-3 px-3">Escenario Activo</th>
                <th className="py-3 px-3">Trigger Activación</th>
                <th className="py-3 px-3">Invalidación (Stop)</th>
                <th className="py-3 px-3">Rango Objetivo</th>
                <th className="py-3 px-4">Racional Causal Forrester</th>
                <th className="py-3 px-3 text-center">Estado Robot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              <tr className="hover:bg-slate-900/50 transition bg-rose-950/10">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                  <span className="text-cyan-400">META</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">Beta 1.48</span>
                </td>
                <td className="py-3 px-3 font-semibold">$584.20</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/70 text-[10px] font-bold">
                    ▼ BEARISH (PUT 0DTE)
                  </span>
                </td>
                <td className="py-3 px-3 text-rose-400 font-bold">$581.80 (VWAP Fallo)</td>
                <td className="py-3 px-3 text-slate-400">$586.50</td>
                <td className="py-3 px-3 text-emerald-400 font-bold">$572.00 - $575.50</td>
                <td className="py-3 px-4 text-slate-300 text-[11px] max-w-xs truncate">
                  Playbook Yoel Sardiñas: Rechazo en VWAP + quiebre pre-market. Aceleración Gamma.
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    ARMADO
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition bg-rose-950/10">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                  <span className="text-cyan-400">NVDA</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">Beta 1.82</span>
                </td>
                <td className="py-3 px-3 font-semibold">$141.50</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/70 text-[10px] font-bold">
                    ▼ BEARISH (PUT Scalp)
                  </span>
                </td>
                <td className="py-3 px-3 text-rose-400 font-bold">$139.20 (Canal)</td>
                <td className="py-3 px-3 text-slate-400">$142.80</td>
                <td className="py-3 px-3 text-emerald-400 font-bold">$134.00 - $136.50</td>
                <td className="py-3 px-4 text-slate-300 text-[11px] max-w-xs truncate">
                  Alta Beta. Venta forzada de creadores de mercado al quebrar soporte matutino.
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    ARMADO
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition bg-rose-950/10">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                  <span className="text-cyan-400">SPX</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">Sec. 1256</span>
                </td>
                <td className="py-3 px-3 font-semibold">$5,755.00</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/70 text-[10px] font-bold">
                    ▼ BEARISH (0DTE PUT)
                  </span>
                </td>
                <td className="py-3 px-3 text-rose-400 font-bold">$5,735.00</td>
                <td className="py-3 px-3 text-slate-400">$5,768.00</td>
                <td className="py-3 px-3 text-emerald-400 font-bold">$5,680.00 - $5,705.00</td>
                <td className="py-3 px-4 text-slate-300 text-[11px] max-w-xs truncate">
                  Aduana O-13 Activada: Choque de tasas (10Y en 4.93%) drena compras institucionales.
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    ARMADO
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                  <span className="text-cyan-400">SPY</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">ETF S&P</span>
                </td>
                <td className="py-3 px-3 font-semibold">$574.85</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/70 text-[10px] font-bold">
                    ▼ BEARISH (EMA Loss)
                  </span>
                </td>
                <td className="py-3 px-3 text-rose-400 font-bold">$571.80</td>
                <td className="py-3 px-3 text-slate-400">$574.50</td>
                <td className="py-3 px-3 text-emerald-400 font-bold">$568.50 - $570.00</td>
                <td className="py-3 px-4 text-slate-300 text-[11px] max-w-xs truncate">
                  Pérdida de EMA 20 intradía con rebote de volatilidad VIX sobre 18.
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                    STANDBY
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-900/50 transition">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                  <span className="text-cyan-400">QQQ</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">Nasdaq 100</span>
                </td>
                <td className="py-3 px-3 font-semibold">$492.30</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/70 text-[10px] font-bold">
                    ▼ BEARISH (Rotación)
                  </span>
                </td>
                <td className="py-3 px-3 text-rose-400 font-bold">$488.50</td>
                <td className="py-3 px-3 text-slate-400">$492.00</td>
                <td className="py-3 px-3 text-emerald-400 font-bold">$484.00 - $486.50</td>
                <td className="py-3 px-4 text-slate-300 text-[11px] max-w-xs truncate">
                  Rotación defensiva fuera de megacaps tecnológicas ante drenaje de liquidez neta.
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                    STANDBY
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tarjetas de Escenarios Detallados por Activo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          {projections.map((proj: any) => (
            <div key={proj.symbol} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-base text-white">{proj.symbol} — Escenarios Intradía</span>
                <span className="text-xs font-mono text-slate-400">Precio Ref: ${proj.currentPrice}</span>
              </div>

              {/* 3 Scenarios Grid */}
              <div className="space-y-2 text-xs">
                {/* Alcista */}
                <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 font-mono">▲ Escenario Alcista</span>
                    <span className="font-mono text-slate-300">
                      Rango: ${proj.scenarios.bullish.targetRange[0]} - ${proj.scenarios.bullish.targetRange[1]}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono flex items-center justify-between">
                    <span>Activación: ${proj.scenarios.bullish.activationLevel}</span>
                    <span>Invalidación: ${proj.scenarios.bullish.invalidationLevel}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 pt-0.5">{proj.scenarios.bullish.rationale}</div>
                </div>

                {/* Lateral */}
                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 font-mono">■ Escenario Lateral</span>
                    <span className="font-mono text-slate-300">
                      Rango: ${proj.scenarios.sideways.targetRange[0]} - ${proj.scenarios.sideways.targetRange[1]}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono flex items-center justify-between">
                    <span>Activación: ${proj.scenarios.sideways.activationLevel}</span>
                    <span>Invalidación: ${proj.scenarios.sideways.invalidationLevel}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 pt-0.5">{proj.scenarios.sideways.rationale}</div>
                </div>

                {/* Bajista */}
                <div className="bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 font-mono">▼ Escenario Bajista</span>
                    <span className="font-mono text-slate-300">
                      Rango: ${proj.scenarios.bearish.targetRange[0]} - ${proj.scenarios.bearish.targetRange[1]}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono flex items-center justify-between">
                    <span>Activación: ${proj.scenarios.bearish.activationLevel}</span>
                    <span>Invalidación: ${proj.scenarios.bearish.invalidationLevel}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 pt-0.5">{proj.scenarios.bearish.rationale}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Resumen de Mercado (Inspirado en Finviz con datos institucionales propios, §5.3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Amplitud de Mercado & Sesgo de Sesión */}
        {breadth && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-400" /> Amplitud de Mercado
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                {breadth.universe}
              </span>
            </div>

            {/* Barra de Avances vs Declinaciones */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-emerald-400 font-semibold">{breadth.advancingCount} Avanzan</span>
                <span className="text-rose-400 font-semibold">{breadth.decliningCount} Declinan</span>
              </div>
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${(breadth.advancingCount / 500) * 100}%` }}
                ></div>
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: `${(breadth.decliningCount / 500) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Sesgo de Sesión */}
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Sesgo de Sesión:</span>
                <strong className="text-emerald-400 font-mono">{breadth.sessionBias} ({breadth.biasScore > 0 ? `+${breadth.biasScore}%` : `${breadth.biasScore}%`})</strong>
              </div>
              <div className="text-[10px] text-slate-500 font-mono leading-tight">
                {breadth.formulaDetail}
              </div>
            </div>

            {/* Nuevos Máximos / Mínimos y SMA */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="bg-slate-950/50 p-2 rounded border border-slate-800/50">
                <div className="text-[10px] text-slate-500">Nuevos 52W Highs/Lows</div>
                <div className="font-bold text-slate-200 mt-0.5">
                  <span className="text-emerald-400">+{breadth.newHighs}</span> /{" "}
                  <span className="text-rose-400">-{breadth.newLows}</span>
                </div>
              </div>
              <div className="bg-slate-950/50 p-2 rounded border border-slate-800/50">
                <div className="text-[10px] text-slate-500">% sobre SMA 50</div>
                <div className="font-bold text-cyan-400 mt-0.5">{breadth.pctAboveSma50}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Columna 2: Top Movers */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" /> Mayores Movimientos (Movers)
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Sesión Actual</span>
          </div>

          <div className="space-y-2">
            {movers.map((m: any) => {
              const isGain = m.changePct >= 0;
              return (
                <div
                  key={m.symbol}
                  className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="font-mono text-white">{m.symbol}</strong>
                      <span className="text-[10px] font-mono text-slate-400">{m.signal}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Vol Rel: {m.relativeVolume}x</div>
                  </div>

                  <div
                    className={`font-mono font-bold ${isGain ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {isGain ? `+${m.changePct.toFixed(2)}%` : `${m.changePct.toFixed(2)}%`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna 3: Mapa de Calor Sectorial S&P 500 */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" /> Rendimiento por Sectores
            </h3>
            <span className="text-[10px] font-mono text-slate-500">S&P 500</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {heatmap.map((sec: any) => {
              const isUp = sec.changePct >= 0;
              return (
                <div
                  key={sec.sector}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 transition ${
                    isUp
                      ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-300"
                      : "bg-rose-950/20 border-rose-900/30 text-rose-300"
                  }`}
                >
                  <div className="font-medium truncate">{sec.sector}</div>
                  <div className="flex items-center justify-between font-mono font-bold text-sm">
                    <span>{isUp ? `+${sec.changePct.toFixed(2)}%` : `${sec.changePct.toFixed(2)}%`}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{sec.weightPct}%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{sec.leadingSymbol}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
