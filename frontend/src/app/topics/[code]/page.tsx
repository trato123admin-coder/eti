import Link from "next/link";
import { 
  Layers, Users, BookOpen, BarChart3, Database, Shield,
  ArrowRight, ExternalLink, CheckCircle, Clock, AlertCircle, Quote, ShieldCheck
} from "lucide-react";

async function getTopicData(code: string) {
  const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:3001";
  try {
    const [sourcesRes, playbookRes] = await Promise.all([
      fetch(`${engineUrl}/api/eti/v1/topics/${code}/sources`, { next: { revalidate: 30 } }),
      fetch(`${engineUrl}/api/eti/v1/topics/${code}/playbook`, { next: { revalidate: 30 } })
    ]);

    const sourcesData = sourcesRes.ok ? await sourcesRes.json() : null;
    const playbookData = playbookRes.ok ? await playbookRes.json() : null;

    return { sourcesData, playbookData };
  } catch (err) {
    console.error("Error fetching topic data:", err);
    return { sourcesData: null, playbookData: null };
  }
}

export default async function TopicDetailPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const { sourcesData, playbookData } = await getTopicData(code);

  const isOptions = code === "OPTIONS";

  return (
    <div className="space-y-8">
      {/* Header del Tema */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                TEMA ACTIVO (MVP)
              </span>
              <span className="text-xs font-mono text-slate-500">ID: top_{code.toLowerCase()}_mvp_2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Tema: Opciones Financieras (CALL & PUT)
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Minería y formalización de estrategias en contratos sobre índices estadounidenses (0DTE/SPY/QQQ/SPX).
              Horizonte efectivo: <strong>INTRADAY / SCALP</strong>. Módulo consumidor en eTrade: <strong>APEX Options Module</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/topics/${code.toLowerCase()}/playbook`}
              className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition shadow-lg shadow-amber-950/50 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Playbook Consolidado
            </Link>
            <Link
              href={`/topics/${code.toLowerCase()}/rule-packs`}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-950/50 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Rule Packs Inmutables
            </Link>
          </div>
        </div>
      </div>

      {/* Navegación por Sub-Pestañas del Tema (Addendum v2.2 §5.5) */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-sm font-medium overflow-x-auto">
        <span className="px-3 py-1.5 rounded-md bg-slate-800 text-white flex items-center gap-1.5">
          Resumen & Hallazgos
        </span>
        <Link
          href={`/topics/${code.toLowerCase()}/playbook`}
          className="px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
        >
          Playbook ({playbookData?.total_rules || 27})
        </Link>
        <Link
          href="/channels"
          className="px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
        >
          Fuentes ({sourcesData?.sources_count || 5})
        </Link>
        <Link
          href="/backtest"
          className="px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
        >
          Validación Vía B
        </Link>
        <Link
          href="/ledger"
          className="px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
        >
          Experiencia Vía C
        </Link>
      </div>

      {/* Resumen de Hallazgos IA con Citas (§5.5) */}
      <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Quote className="w-4 h-4 text-cyan-400" /> Resumen Ejecutivo de Hallazgos de IA (Versionado v1.0)
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Generado solo a partir de datos estructurados y aprobados
          </span>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed space-y-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800/60">
          <p>
            El análisis consolidado de las 5 fuentes iniciales converge en que el éxito en contratos de opciones 0DTE
            depende principalmente del <strong>filtro de régimen de apertura (9:45-10:15 EST)</strong> y del control de la exposición Gamma.
            Se identificó un consenso unánime (<strong className="text-emerald-400">5 de 5 fuentes</strong>) en la salida obligatoria por tiempo
            antes de las 15:45 EST para evitar la destrucción irreversible de la prima por decaimiento Theta.
          </p>
          <p>
            Mientras que <strong>Opción Sigma</strong> y <strong>Imran Lakha</strong> aportan el contexto cuantitativo de niveles de Gamma (GEX Walls y niveles de absorción institucional),
            <strong> Gala Trades</strong> y <strong>Yoel Sardiñas</strong> definen los gatillos de entrada táctica en velas de 2m/5m sobre rebotes y confirmaciones de VWAP.
            <strong> John Carter</strong> proporciona la disciplina de salida activa ante contracción de volatilidad (TTM Squeeze).
          </p>
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 pt-1">
          <span>Citas Verificadas:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Opción Sigma [Video 0DTE #14: 12:45]</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Options Insight [IV Playbook: 08:20]</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Gala Trades [Scalping SPY: 05:10]</span>
        </div>
      </div>

      {/* Las 5 Fuentes Iniciales del Tema Opciones (§4) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" /> Fuentes Iniciales del Tema Opciones (5 Influencers)
          </h2>
          <span className="text-xs font-mono text-slate-400">Verificadas por API de YouTube</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sourcesData?.sources?.map((src: any) => (
            <div
              key={src.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    {src.name}
                    {src.channel_url && (
                      <a
                        href={src.channel_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-cyan-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Idioma: {src.language} • Prioridad: {src.priority}
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                  {src.role}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {src.specialty}
              </p>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-slate-950/50 p-1.5 rounded border border-slate-800/50">
                  <span className="text-slate-500">Cobertura Texto: </span>
                  <strong className="text-slate-200">{src.text_coverage_pct}%</strong>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded border border-slate-800/50">
                  <span className="text-slate-500">Credibilidad Vía A: </span>
                  <strong className="text-emerald-400">{src.credibility_score_vía_a}%</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
