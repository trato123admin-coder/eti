import { supabase } from "@/lib/supabase";
import { GitFork, ShieldCheck, Zap, Layers, AlertCircle } from "lucide-react";

export default async function RulesPage() {
  const [strategiesRes, rulesRes] = await Promise.all([
    supabase.from("eti_strategies").select("*, eti_strategy_rules(*)").order("created_at", { ascending: false }),
    supabase.from("eti_strategy_rules").select("*").order("created_at", { ascending: false })
  ]);

  const strategies = strategiesRes.data || [];
  const rules = rulesRes.data || [];

  const standardRules = rules.filter(r => r.rule_nature === "STANDARD_CONSENSUS");
  const exceptionRules = rules.filter(r => r.rule_nature === "UNIQUE_EXCEPTION");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <GitFork className="w-6 h-6 text-amber-400" /> Matriz de Reglas de Trading: Consenso vs. Excepciones
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Comparativa entre las <strong>Reglas Estándar</strong> compartidas por la mayoría de YouTubers de opciones
          y las <strong>Reglas Únicas</strong> (overrides tácticos para regímenes específicos de mercado).
        </p>
      </div>

      {/* Tabs / Summary Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Standard Consensus Column */}
        <div className="space-y-4">
          <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="font-semibold text-emerald-300">Reglas Estándar (Consenso)</h2>
                <p className="text-xs text-emerald-400/80">Compartidas por ≥ 3 traders de opciones</p>
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-emerald-400">{standardRules.length}</span>
          </div>

          <div className="space-y-3">
            {standardRules.map(rule => (
              <div
                key={rule.id}
                className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 space-y-2 hover:border-emerald-800/50 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {rule.rule_type}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/50">
                    STANDARD_CONSENSUS
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-200">
                  {rule.description || "Regla de consenso de confirmación y filtro de tendencia"}
                </div>
                {rule.condition_dsl && (
                  <div className="text-xs bg-slate-950/80 p-2.5 rounded font-mono text-slate-400 border border-slate-800/60 overflow-x-auto">
                    {JSON.stringify(rule.condition_dsl, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Unique Exceptions Column */}
        <div className="space-y-4">
          <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="font-semibold text-amber-300">Reglas Únicas (Excepciones Tácticas)</h2>
                <p className="text-xs text-amber-400/80">Overrides situacionales para regímenes extremos</p>
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-amber-400">{exceptionRules.length}</span>
          </div>

          <div className="space-y-3">
            {exceptionRules.map(rule => (
              <div
                key={rule.id}
                className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 space-y-2 hover:border-amber-800/50 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {rule.rule_type}
                  </span>
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/50">
                    UNIQUE_EXCEPTION
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-200">
                  {rule.description || "Regla de excepción para eventos especiales o gaps extremos"}
                </div>
                {rule.condition_dsl && (
                  <div className="text-xs bg-slate-950/80 p-2.5 rounded font-mono text-slate-400 border border-slate-800/60 overflow-x-auto">
                    {JSON.stringify(rule.condition_dsl, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
