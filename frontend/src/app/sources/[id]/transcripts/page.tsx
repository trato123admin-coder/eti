"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Upload, FileText, CheckCircle2, AlertCircle, ArrowRight,
  Database, Sparkles, Filter, Clock, ChevronRight, Hash,
  RefreshCw, Search, Send, Check
} from "lucide-react";

export default function SourceTranscriptsPage() {
  const params = useParams();
  const sourceId = (params?.id as string) || "src_opcion_sigma";

  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Direct paste modal state
  const [pastingVideoId, setPastingVideoId] = useState<string | null>(null);
  const [pasteContent, setPasteContent] = useState("");
  const [isPasting, setIsPasting] = useState(false);

  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/eti/v1/sources/${sourceId}/transcripts/pending-queue`);
      if (res.ok) {
        const data = await res.json();
        setPendingQueue(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [sourceId]);

  // Handle file drop / input
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadSuccessMsg(null);

    const payloadFiles: Array<{ filename: string; content: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      payloadFiles.push({
        filename: file.name,
        content: text,
      });
    }

    try {
      const res = await fetch(`http://localhost:3001/api/eti/v1/sources/${sourceId}/transcripts/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payloadFiles }),
      });

      const data = await res.json();
      if (res.ok) {
        setUploadResults(data.processed_items || []);
        setUploadSuccessMsg(`¡${data.files_matched} de ${data.files_uploaded} archivos emparejados con éxito!`);
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
      alert("Error al cargar subtítulos");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle direct text paste
  const handleDirectPaste = async () => {
    if (!pastingVideoId || !pasteContent.trim()) return;
    setIsPasting(true);

    try {
      const fakeFilename = `manual_paste_${pastingVideoId}.srt`;
      const res = await fetch(`http://localhost:3001/api/eti/v1/sources/${sourceId}/transcripts/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ filename: fakeFilename, content: pasteContent }],
        }),
      });

      if (res.ok) {
        setPastingVideoId(null);
        setPasteContent("");
        setUploadSuccessMsg(`Subtítulo procesado y normalizado para video ${pastingVideoId}`);
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPasting(false);
    }
  };

  // Filter pending queue
  const filteredQueue = pendingQueue.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.videoId.includes(searchTerm);
    const matchesType = filterType === "ALL" || item.contentType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/channels" className="hover:text-cyan-400 transition">Fuentes</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/sources/${sourceId}/ingestion`} className="hover:text-cyan-400 transition">Embudo Ingesta</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200">Gestor de Subtítulos y Cola Top 30</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-400" />
            Carga de Subtítulos y Normalización Léxica
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Desacoplamiento de texto: emparejamiento automático por <code className="text-cyan-300 font-mono">Video ID</code> y corrección fonética con el Glosario de Opciones (<span className="text-indigo-300">"cero dte" → 0DTE</span>, <span className="text-indigo-300">"uve wap" → VWAP</span>).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/channels/${sourceId}`}
            className="px-3.5 py-2 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-xs text-cyan-300 font-semibold transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Ver Informe Ejecutivo & Reglas
          </Link>
          <Link
            href={`/sources/${sourceId}/ingestion`}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition flex items-center gap-1.5"
          >
            ← Volver al Embudo
          </Link>
        </div>
      </div>

      {/* Drag & Drop Mass Upload Area */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-400" />
          Carga Masiva de Archivos (.srt, .vtt, .txt)
        </h2>
        <p className="text-xs text-slate-400">
          Arrastra uno o varios subtítulos. El nombre de archivo puede incluir el Video ID de 11 caracteres (ej. <code className="text-cyan-300 font-mono">opcion_sigma_ABC123xyz89.srt</code>).
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 text-center bg-slate-950/40 hover:bg-indigo-950/10 transition cursor-pointer flex flex-col items-center justify-center gap-3"
          onClick={() => document.getElementById("srtFileInput")?.click()}
        >
          <input
            id="srtFileInput"
            type="file"
            multiple
            accept=".srt,.vtt,.txt"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <div className="w-12 h-12 rounded-full bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-slate-200">
            {isUploading ? "Procesando subtítulos..." : "Haga clic o arrastre aquí archivos .SRT / .VTT"}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Soporta carga masiva múltiple simultánea con normalización instantánea
          </div>
        </div>

        {uploadSuccessMsg && (
          <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        {/* Upload Result Preview */}
        {uploadResults.length > 0 && (
          <div className="mt-4 border border-slate-800 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Archivo</th>
                  <th className="p-2.5">Video ID Emparejado</th>
                  <th className="p-2.5">Confianza</th>
                  <th className="p-2.5">Palabras</th>
                  <th className="p-2.5">Glosario Normalizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {uploadResults.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="p-2.5 text-slate-300 truncate max-w-xs">{r.filename}</td>
                    <td className="p-2.5 text-cyan-300 font-bold">{r.matched_video_id || "No detectado"}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${r.match_confidence === 1.0 ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"}`}>
                        {(r.match_confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-300" suppressHydrationWarning>{formatNumber(r.word_count)}</td>
                    <td className="p-2.5 text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Aplicado (0DTE/SPX/VWAP)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top 30 High-Yield Videos Prioritized Queue */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Cola Priorizada de Texto Pendiente (Top 30 con Mayor Densidad de Reglas)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ordenados por valor esperado (tutoriales de SPX/0DTE, salidas por tiempo y estrategias de alta audiencia).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar video o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-44"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="TUTORIAL">Tutoriales</option>
              <option value="LIVE_SESSION">Sesiones en Vivo</option>
              <option value="MARKET_ANALYSIS">Análisis de Mercado</option>
            </select>
          </div>
        </div>

        {/* Priority Table */}
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Video / Título</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Duración</th>
                <th className="p-3 text-center">Score Relevancia</th>
                <th className="p-3 text-center">Estado Subtítulo</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredQueue.map((item) => (
                <tr key={item.videoId} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 text-center font-mono font-bold text-amber-400">
                    {item.priorityRank}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-200">{item.title}</div>
                    <div className="text-[11px] font-mono text-cyan-400 mt-0.5 flex items-center gap-2">
                      <span>ID: {item.videoId}</span>
                      <span>•</span>
                      <span className="text-slate-400" suppressHydrationWarning>{formatNumber(item.views)} vistas</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.contentType}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    {item.durationMinutes} min
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-mono font-bold text-emerald-400">{item.relevanceScore}/100</span>
                  </td>
                  <td className="p-3 text-center">
                    {item.status === "WITH_TEXT" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center gap-1 w-max mx-auto">
                        <CheckCircle2 className="w-3 h-3" /> CON TEXTO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center gap-1 w-max mx-auto">
                        <Clock className="w-3 h-3" /> PENDIENTE
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setPastingVideoId(item.videoId)}
                      className="px-3 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-xs font-medium transition"
                    >
                      Pegar Texto
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fast Direct Paste Modal */}
      {pastingVideoId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  Pegar Subtítulo / Transcripción Manual
                </h3>
                <span className="text-xs text-cyan-400 font-mono">Video ID: {pastingVideoId}</span>
              </div>
              <button
                onClick={() => setPastingVideoId(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Pega el contenido SRT, VTT o transcripción continua. Se aplicará automáticamente la normalización del Glosario de Dominio Financiero.
            </p>

            <textarea
              rows={8}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="1&#10;00:00:10,000 --> 00:00:15,000&#10;Bienvenidos, hoy operamos cero dte en s px con cruce sobre el uve wap..."
              className="w-full bg-[#0b101c] border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPastingVideoId(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDirectPaste}
                disabled={isPasting || !pasteContent.trim()}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/30 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isPasting ? "Procesando..." : "Guardar y Normalizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
