"use client";

import { useEffect, useState } from "react";
import { CheckSquare, CheckCircle, XCircle, AlertCircle, FileText, ArrowRight, Shield } from "lucide-react";

interface PendingStrategy {
  id: string;
  name: string;
  underlying: string;
  direction: string;
  nature: string;
  description: string;
  lifecycle_status: string;
  evidence_level: string;
  created_at: string;
  eti_strategy_versions?: Array<{
    id: string;
    version_number: number;
    eti_strategy_rules?: Array<{
      id: string;
      rule_type: string;
      rule_nature: string;
      condition_code: string;
    }>;
  }>;
}

export default function ReviewPage() {
  const [strategies, setStrategies] = useState<PendingStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:3001";
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN || "eti_admin_secret_token_2026";

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${engineUrl}/api/eti/v1/review/queue`, {
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: Fallo cargando cola de revisión`);
      }
      const data = await res.json();
      setStrategies(data.pending_strategies || []);
    } catch (err: any) {
      console.error(err);
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleDecision = async (strategyId: string, decision: "APPROVED" | "REJECTED") => {
    setProcessingId(strategyId);
    setMsg(null);
    try {
      const res = await fetch(`${engineUrl}/api/eti/v1/review/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          entity_type: "STRATEGY",
          entity_id: strategyId,
          decision,
          notes: `Decisión registrada desde la consola de Revisión Humana ETI (${decision}).`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Error ${res.status}`);
      }

      setMsg({
        type: "success",
        text: `Estrategia ${decision === "APPROVED" ? "Aprobada" : "Rechazada"} exitosamente.`,
      });
      // Remover de la lista local
      setStrategies(prev => prev.filter(s => s.id !== strategyId));
    } catch (err: any) {
      setMsg({ type: "error", text: `Fallo al registrar decisión: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-400" /> Cola de Revisión Humana (Human-in-the-Loop)
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Módulo RBAC obligatorio (Sprint ETI-S4 & ETI-S9). Toda estrategia de opciones extraída por IA
            requiere validación o aprobación humana antes de pasar a simulación formal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchQueue}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 font-medium transition"
          >
            Actualizar Cola
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-lg text-sm border flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
              : "bg-rose-950/60 text-rose-300 border-rose-800"
          }`}
        >
          {msg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500 font-mono">Cargando cola de revisión...</div>
      ) : strategies.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <Shield className="w-10 h-10 text-cyan-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">Cola de Revisión al Día</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No hay estrategias en estado <code>STRUCTURED</code> pendientes de dictamen.
            Todas han sido procesadas o promovidas a backtesting.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-mono text-slate-400">
            Pendientes de dictamen: <span className="text-white font-bold">{strategies.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {strategies.map((strat) => {
              const version = strat.eti_strategy_versions?.[0];
              const rules = version?.eti_strategy_rules || [];

              return (
                <div
                  key={strat.id}
                  className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white font-mono">{strat.name}</span>
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                            strat.nature === "STANDARD_CONSENSUS"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                              : "bg-amber-950 text-amber-400 border border-amber-800/50"
                          }`}
                        >
                          {strat.nature}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                          {strat.underlying} • {strat.direction}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                        {strat.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        disabled={processingId === strat.id}
                        onClick={() => handleDecision(strat.id, "APPROVED")}
                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1.5 shadow"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                      </button>
                      <button
                        disabled={processingId === strat.id}
                        onClick={() => handleDecision(strat.id, "REJECTED")}
                        className="px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1.5 shadow"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rechazar
                      </button>
                    </div>
                  </div>

                  {rules.length > 0 && (
                    <div className="pt-3 border-t border-slate-800/70">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Reglas Operativas Extraídas ({rules.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {rules.map((r) => (
                          <div
                            key={r.id}
                            className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-cyan-400 font-semibold">{r.rule_type}</span>
                              <span className="text-[10px] font-mono text-slate-500">{r.rule_nature}</span>
                            </div>
                            <div className="text-slate-300 font-mono text-[11px] truncate">
                              {r.condition_code || "Sin código de condición"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
