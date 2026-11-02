"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Layers, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight,
  Database, GitCommit, GitPullRequest, Hash, ExternalLink,
  ChevronRight, Lock, Bot, Activity, Check, Copy
} from "lucide-react";

export default function RulePacksPage() {
  const params = useParams();
  const topicCode = ((params?.code as string) || "options").toUpperCase();

  const [rulePacks, setRulePacks] = useState<any[]>([]);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [activeTab, setActiveTab] = useState<"RULES" | "DIFF" | "API">("RULES");

  const fetchRulePacks = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/eti/v1/rule-packs");
      if (res.ok) {
        const data = await res.json();
        const packs = data.rule_packs || [];
        setRulePacks(packs);
        if (packs.length > 0) setSelectedPack(packs[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRulePacks();
  }, [topicCode]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/" className="hover:text-cyan-400 transition">Mercado</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/topics/${topicCode.toLowerCase()}`} className="hover:text-cyan-400 transition">Tema Opciones</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200">Rule Packs Inmutables</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/40">
              Addendum v2.3 §6
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-400" />
            Catálogo de Rule Packs Canónicos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Paquetes inmutables y versionados con hash criptográfico SHA-256 consumidos por el robot eTrade (<code className="text-cyan-300 font-mono">EtiDecisionService</code>).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/topics/${topicCode.toLowerCase()}/playbook`}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition flex items-center gap-1.5"
          >
            ← Volver al Playbook
          </Link>
          <Link
            href="/sources/src_opcion_sigma/ingestion"
            className="px-3.5 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-xs text-cyan-300 transition flex items-center gap-1.5"
          >
            Ver Ingesta Fuente
          </Link>
        </div>
      </div>

      {/* Safety Mandatory Banner */}
      <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl p-4 flex items-start gap-3.5 text-xs text-amber-200">
        <Bot className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
            <span>Aislamiento Arquitectónico del Robot eTrade (Sprint ETI-S4C / Addendum v2.3 §6.3)</span>
            <span className="px-2 py-0.2 rounded bg-amber-900/60 text-[10px] font-mono border border-amber-700">
              execution_allowed = false
            </span>
          </div>
          <p className="text-slate-300">
            El robot <strong className="text-white">NUNCA</strong> consume claims crudos de YouTubers ni borradores en revisión. Exclusivamente lee Rule Packs en estado <span className="font-mono font-semibold text-emerald-400">INFORMATIVE</span> o <span className="font-mono font-semibold text-cyan-400">SHADOW</span> validados con <span className="font-mono text-amber-300 font-bold">Profit Factor ≥ 1.30</span> y evidencia en Vía C.
          </p>
        </div>
      </div>

      {/* Selected Rule Pack Summary Card */}
      {selectedPack && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white font-mono">{selectedPack.code}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {selectedPack.lifecycleStatus}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  v{selectedPack.version}
                </span>
              </div>
              <p className="text-xs text-slate-400">{selectedPack.name} — {selectedPack.notes}</p>
            </div>

            {/* SHA-256 Hash Badge with copy */}
            <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg flex items-center gap-3 font-mono text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                <span>SHA-256:</span>
              </div>
              <span className="text-cyan-300 font-bold select-all truncate max-w-xs">
                {selectedPack.hash}
              </span>
              <button
                onClick={() => copyToClipboard(selectedPack.hash)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Copiar Hash SHA-256"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Validation Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400">Profit Factor (Vía B)</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {selectedPack.profitFactor}
              </div>
              <div className="text-[10px] text-emerald-500 mt-0.5 font-mono">≥ 1.30 (SUPERADO)</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400">Win Rate</div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                {selectedPack.winRatePct}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">88 operaciones evaluadas</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400">Esperanza Matemática</div>
              <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                +${selectedPack.expectancyUsd}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">USD por trade</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400">Reglas Canónicas</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {selectedPack.rulesCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Inmutables en pack</div>
            </div>
          </div>

          {/* Tabs for Details: Rules, Diff, API Response */}
          <div className="pt-2">
            <div className="flex items-center gap-3 border-b border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab("RULES")}
                className={`pb-2.5 font-semibold transition border-b-2 flex items-center gap-1.5 ${
                  activeTab === "RULES"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Reglas Incluidas ({selectedPack.rulesCount})
              </button>

              <button
                onClick={() => setActiveTab("DIFF")}
                className={`pb-2.5 font-semibold transition border-b-2 flex items-center gap-1.5 ${
                  activeTab === "DIFF"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                Comparativa Diff (v1 vs Draft v2)
              </button>

              <button
                onClick={() => setActiveTab("API")}
                className={`pb-2.5 font-semibold transition border-b-2 flex items-center gap-1.5 ${
                  activeTab === "API"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                Contexto API Robot (/api/eti/v1/context)
              </button>
            </div>

            {/* Tab 1: Rules Included */}
            {activeTab === "RULES" && (
              <div className="mt-5 space-y-4">
                {selectedPack.rules?.map((rule: any, idx: number) => (
                  <div
                    key={rule.rule_code}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          #{idx + 1}
                        </span>
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {rule.rule_code}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          rule.direction === "CALL" ? "bg-emerald-950 text-emerald-400" :
                          rule.direction === "PUT" ? "bg-rose-950 text-rose-400" : "bg-purple-950 text-purple-400"
                        }`}>
                          {rule.direction}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {rule.evidence_level}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
                        <span>PF: <strong className="text-emerald-400">{rule.profit_factor}</strong></span>
                        <span>Trades: <strong className="text-slate-200">{rule.trades_count}</strong></span>
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-slate-100">{rule.title}</div>

                    {/* Parameters box */}
                    <div className="bg-[#0b101c] p-3 rounded-lg border border-slate-800 font-mono text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(rule.parameters || {}).map(([k, v]: [string, any]) => (
                        <div key={k}>
                          <span className="text-slate-500 text-[10px] block">{k}:</span>
                          <span className="text-slate-200">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <div>
                        <span className="text-slate-500">Regímenes: </span>
                        <span className="text-indigo-300 font-mono">
                          {rule.applicability_regimes?.join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Fuentes de Origen: </span>
                        <span className="text-slate-300">
                          {rule.origin_sources?.join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Version Diff View */}
            {activeTab === "DIFF" && (
              <div className="mt-5 p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-3">
                  <span>Comparativa de Reglas: v1 (Activa) ➔ v2 (Borrador Candidato)</span>
                  <span className="text-cyan-400 font-bold">+2 Reglas Nuevas Candidatas</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">+ AÑADIDA:</span>
                      <span>RP_OPT_04_GAMMA_ZERO_FLIP</span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-sans">
                      Filtro de reversión cuando el subyacente cruza la zona de Gamma Cero hacia Gamma Negativa. Origen: Opción Sigma. PF: 1.52.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">+ AÑADIDA:</span>
                      <span>RP_OPT_05_MAX_LOSS_PCT_HARD</span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-sans">
                      Corte de pérdidas automático a -35% en cualquier contrato 0DTE sin esperar fin de sesión. Consenso 5 YouTubers.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                    <div className="text-[11px]">3 Reglas preexistentes (RP_OPT_01, 02, 03) se mantienen sin modificaciones de parámetros.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Context API */}
            {activeTab === "API" && (
              <div className="mt-5 p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">GET</span>
                    <span className="text-slate-200">/api/eti/v1/context</span>
                  </span>
                  <span className="text-slate-500">200 OK • 12ms</span>
                </div>

                <pre className="text-slate-300 overflow-x-auto p-3 bg-[#0b101c] rounded-lg border border-slate-800 text-[11px] leading-relaxed">
{JSON.stringify(
  {
    as_of: new Date().toISOString(),
    active_rule_pack: {
      code: selectedPack.code,
      version: selectedPack.version,
      hash: selectedPack.hash,
      lifecycle_status: selectedPack.lifecycleStatus,
      rules_count: selectedPack.rulesCount,
    },
    rules: selectedPack.rules,
    safety_guardrail: {
      execution_allowed: false,
      informative_only: true,
      mandatory_human_oversight: true,
    },
  },
  null,
  2
)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
