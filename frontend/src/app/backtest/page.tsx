import { supabase } from "@/lib/supabase";
import { BarChart3, TrendingUp, ShieldAlert, Award, Layers, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default async function BacktestPage() {
  const [evidenceRes, strategiesRes] = await Promise.all([
    supabase
      .from("eti_evidence")
      .select("*, eti_strategies(name, underlying, nature, lifecycle_status)")
      .eq("evidence_level", "E2")
      .order("created_at", { ascending: false }),
    supabase.from("eti_strategies").select("*")
  ]);

  const evidences = evidenceRes.data || [];
  const strategies = strategiesRes.data || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" /> Laboratorio de Backtesting Cuantitativo (Vía B)
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Simulación histórica con precios teóricos Black-Scholes, Greeks de opciones, fricción bid/ask
            y decaimiento Theta sobre contratos intradía (0DTE/SPY/QQQ/SPX).
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400">
          Simulaciones E2 Registradas: <span className="text-white font-bold">{evidences.length}</span>
        </div>
      </div>

      {/* Threshold Criteria Legend */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="text-slate-400">
          Criterios Duros para Nivel E2 (Addendum §4):
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
            Profit Factor ≥ <strong className="text-emerald-400">1.30</strong>
          </span>
          <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
            Expectativa {">"} <strong className="text-emerald-400">$0 USD</strong>
          </span>
          <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
            Max Drawdown ≤ <strong className="text-amber-400">-$4,000 USD</strong>
          </span>
          <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
            Muestra ≥ <strong className="text-cyan-400">30 trades</strong>
          </span>
        </div>
      </div>

      {/* Backtest Results Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {evidences.map((ev) => {
          const metrics = ev.metrics || {};
          const strat = ev.eti_strategies;
          const pf = parseFloat(metrics.profit_factor) || 0;
          const passed = metrics.passes_e2_criteria === true;
          const netPnl = parseFloat(metrics.net_pnl_usd) || 0;
          const winRate = parseFloat(metrics.win_rate_pct) || 0;

          return (
            <div
              key={ev.id}
              className={`bg-slate-900/70 border rounded-xl p-5 space-y-4 transition ${
                passed ? "border-emerald-800/80 shadow-lg shadow-emerald-950/20" : "border-slate-800/80"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-white font-mono">
                    {strat?.name || metrics.strategy_name || "Estrategia de Opciones"}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {strat?.underlying || "SPY"}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        strat?.nature === "STANDARD_CONSENSUS"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-900/50"
                          : "bg-amber-950 text-amber-400 border border-amber-900/50"
                      }`}
                    >
                      {strat?.nature || "STANDARD_CONSENSUS"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Modo: {metrics.out_of_sample ? "Fuera de Muestra (OOS)" : "In-Sample"}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold font-mono ${
                    passed
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}
                >
                  {passed ? "E2 APROBADO" : "EN OBSERVACIÓN"}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                  <div className="text-slate-500 text-[11px]">Profit Factor</div>
                  <div
                    className={`font-bold font-mono text-sm mt-0.5 ${
                      pf >= 1.30 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {pf.toFixed(2)}
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                  <div className="text-slate-500 text-[11px]">Win Rate</div>
                  <div className="font-bold font-mono text-sm mt-0.5 text-slate-200">
                    {winRate.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                  <div className="text-slate-500 text-[11px]">P&L Neto</div>
                  <div
                    className={`font-bold font-mono text-sm mt-0.5 ${
                      netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    ${netPnl.toFixed(0)}
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                  <div className="text-slate-500 text-[11px]">Max DD</div>
                  <div className="font-bold font-mono text-sm mt-0.5 text-rose-400">
                    -${Math.abs(metrics.max_drawdown_usd || 0).toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Standard vs Exceptions Breakdown */}
              {metrics.breakdown && (
                <div className="text-xs pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-400">
                  <span>
                    Trades Estándar: <strong className="text-slate-200">{metrics.breakdown.standard_rules_trades}</strong> (PF: {metrics.breakdown.standard_rules_profit_factor})
                  </span>
                  <span>
                    Trades Excepciones: <strong className="text-slate-200">{metrics.breakdown.exception_rules_trades}</strong> (PF: {metrics.breakdown.exception_rules_profit_factor})
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
