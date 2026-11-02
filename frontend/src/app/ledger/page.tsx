import { supabase } from "@/lib/supabase";
import { Database, ShieldCheck, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, RefreshCw, Zap } from "lucide-react";

export default async function LedgerPage() {
  const [candidatesRes, tradesRes, calibrationsRes, shadowsRes] = await Promise.all([
    supabase.from("eti_experience_candidates").select("*").order("evaluated_at", { ascending: false }).limit(25),
    supabase.from("eti_experience_trades").select("*").order("entry_at", { ascending: false }).limit(25),
    supabase.from("eti_cost_calibrations").select("*").order("valid_from", { ascending: false }).limit(5),
    supabase.from("eti_shadow_signals").select("*").order("signal_time", { ascending: false }).limit(10)
  ]);

  const candidates = candidatesRes.data || [];
  const trades = tradesRes.data || [];
  const calibrations = calibrationsRes.data || [];
  const shadows = shadowsRes.data || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-purple-400" /> Experience Ledger en Vivo (Vía C)
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Registro append-only inmutable de decisiones, candidatos y ejecuciones emitidas por el robot eTrade.
            Captura de rechazos de ADUANA (O-1..O-12) para análisis contrafáctico.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-purple-950/60 border border-purple-800/80 px-3 py-1.5 rounded-lg text-xs font-mono text-purple-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>ENFORCE_APPEND_ONLY TRIGGER ACTIVO</span>
          </div>
        </div>
      </div>

      {/* Dynamic Cost Calibration Banner */}
      {calibrations.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Calibración Dinámica de Costes (Vía C → Vía B)
            </span>
            <span className="text-xs font-mono text-slate-400">
              Versión Activa: <strong className="text-white">{calibrations[0].calibration_version}</strong>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
              <div className="text-slate-500 text-[11px]">Slippage Observado</div>
              <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                {(calibrations[0].avg_slippage_pct * 100).toFixed(2)}%
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
              <div className="text-slate-500 text-[11px]">Bid/Ask Spread Calibrado</div>
              <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
                {(calibrations[0].avg_spread_pct * 100).toFixed(2)}%
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
              <div className="text-slate-500 text-[11px]">Comisión por Contrato</div>
              <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                ${parseFloat(calibrations[0].fee_per_contract).toFixed(2)} USD
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
              <div className="text-slate-500 text-[11px]">Muestras de Trades</div>
              <div className="text-base font-bold font-mono text-purple-400 mt-0.5">
                {calibrations[0].sample_trades_count} operaciones
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Executed Trades & Evaluated Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trades Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> Operaciones Ejecutadas (PAPER / LIVE)
            </h2>
            <span className="text-xs font-mono text-slate-500">Últimas {trades.length}</span>
          </div>

          {trades.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 text-center text-xs text-slate-500 font-mono">
              Esperando cierre de órdenes en paper trading...
            </div>
          ) : (
            <div className="space-y-3">
              {trades.map((t) => {
                const pnl = parseFloat(t.net_pnl_usd) || 0;
                return (
                  <div
                    key={t.id}
                    className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{t.contract_symbol}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {t.execution_mode}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          Qty: {t.quantity}
                        </span>
                      </div>
                      <div className={`font-mono font-bold text-sm ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`} USD
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/60">
                      <div>
                        Fill Entrada: <strong className="text-slate-200">${t.entry_fill_price}</strong>
                      </div>
                      <div>
                        Fill Salida: <strong className="text-slate-200">${t.exit_fill_price || "Abierta"}</strong>
                      </div>
                      <div>
                        Slippage: <strong className="text-slate-200">${t.entry_slippage_usd}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Candidates Section (ADUANA Passes & Rejections) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" /> Candidatos Evaluados por ADUANA
            </h2>
            <span className="text-xs font-mono text-slate-500">Últimos {candidates.length}</span>
          </div>

          <div className="space-y-3">
            {candidates.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{c.underlying}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {c.direction}
                    </span>
                    <span className="text-xs text-slate-400 truncate max-w-[160px]">{c.strategy_name}</span>
                  </div>

                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold font-mono flex items-center gap-1 ${
                      c.aduana_passed
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                        : "bg-rose-950 text-rose-400 border border-rose-800/60"
                    }`}
                  >
                    {c.aduana_passed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> ADUANA OK
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> RECHAZADO
                      </>
                    )}
                  </span>
                </div>

                {c.rejection_reason && (
                  <div className="text-xs bg-rose-950/30 border border-rose-900/40 text-rose-300 p-2 rounded font-mono">
                    Motivo Rechazo: {c.rejection_reason}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
                  <span>Score APEX: {c.apex_score}</span>
                  <span>Régimen: {c.market_regime}</span>
                  <span>{new Date(c.evaluated_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
