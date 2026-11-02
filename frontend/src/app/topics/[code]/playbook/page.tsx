import Link from "next/link";
import { 
  BookOpen, ShieldAlert, CheckCircle, AlertTriangle, Layers,
  GitFork, ArrowRight, Zap, Info
} from "lucide-react";

async function getPlaybook(code: string) {
  const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${engineUrl}/api/eti/v1/topics/${code}/playbook`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Error fetching playbook:", err);
    return null;
  }
}

export default async function PlaybookConsolidadoPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const playbook = await getPlaybook(code);

  const rules = playbook?.rules || [];

  return (
    <div className="space-y-8">
      {/* Playbook Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800/60 font-mono">
              <BookOpen className="w-3.5 h-3.5" /> PLAYBOOK CONSOLIDADO • TEMA {code}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Libro de Reglas Consolidadas de Opciones
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Consolidación sistemática de reglas operativas entre las 5 fuentes. Análisis de consenso,
              variantes de parámetros, contradicciones y desacoplamiento estricto entre popularidad y validación estadística.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/topics/${code.toLowerCase()}/rule-packs`}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-lg shadow-emerald-950/50 flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5" /> Rule Packs Inmutables
            </Link>
            <Link
              href={`/topics/${code.toLowerCase()}`}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition border border-slate-700 flex items-center gap-2"
            >
              Volver al Tema Opciones
            </Link>
          </div>
        </div>
      </div>

      {/* AVISO MANDATORIO DE DISEÑO (§5.7): CONSENSO NO ES VALIDEZ */}
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

      {/* Tabla de Reglas Consolidadas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" /> Reglas Consolidadas del Playbook ({rules.length})
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Categorías: Régimen, Selección, Entrada, Confirmación, Salida
          </span>
        </div>

        <div className="space-y-4">
          {rules.map((rule: any) => (
            <div
              key={rule.id}
              className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4 hover:border-slate-700 transition"
            >
              {/* Encabezado de la Regla */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-base text-white">{rule.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {rule.category}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900">
                      {rule.horizon}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        rule.rule_nature === "STANDARD_CONSENSUS"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                          : "bg-amber-950 text-amber-400 border border-amber-900"
                      }`}
                    >
                      {rule.rule_nature}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-4xl pt-1">
                    {rule.description}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Uso en Robot</div>
                  <span className="inline-block mt-0.5 text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                    {rule.usage_in_robot}
                  </span>
                </div>
              </div>

              {/* Matriz Comparativa: Consenso vs. Validación Formal */}
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Columna Consenso */}
                <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" /> Consenso de Fuentes:
                    </span>
                    <strong className="text-emerald-400 text-sm">
                      {rule.consensus.count} de 5 ({rule.consensus.percentage}%)
                    </strong>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rule.consensus.supporting_sources.map((s: string) => (
                      <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Variantes de Parámetros */}
                  {rule.parameter_variants && Object.keys(rule.parameter_variants).length > 0 && (
                    <div className="pt-2 text-[11px] font-mono text-slate-400 space-y-1">
                      <div className="text-slate-500 font-semibold">Variantes de Parámetros observadas:</div>
                      {Object.entries(rule.parameter_variants).map(([k, v]: [string, any]) => (
                        <div key={k} className="flex justify-between text-slate-300">
                          <span>{k}:</span>
                          <span>{Array.isArray(v) ? v.join(" - ") : JSON.stringify(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Columna Validación Formal */}
                <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/60 space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Estado de Validación:
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                        rule.validation_status === "VALIDATED"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {rule.validation_status} ({rule.evidence_level})
                    </span>
                  </div>

                  {/* Contradicciones Señaladas */}
                  {rule.contradictions && rule.contradictions.length > 0 ? (
                    <div className="pt-2 space-y-1 text-[11px]">
                      <div className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" /> Contradicciones entre Autores:
                      </div>
                      {rule.contradictions.map((c: string, idx: number) => (
                        <div key={idx} className="text-slate-400 leading-tight bg-rose-950/20 p-2 rounded border border-rose-900/30">
                          {c}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2 text-[11px] text-slate-500">
                      Sin contradicciones operativas directas detectadas entre los autores.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Users(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
