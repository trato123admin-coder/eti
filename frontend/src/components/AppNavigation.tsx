"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  Users,
  BookOpen,
  ShieldCheck,
  PlusCircle,
  CheckSquare,
  Database,
  Shield,
  Activity,
  Radio
} from "lucide-react";
import UserNav from "@/components/UserNav";

export default function AppNavigation() {
  const pathname = usePathname();

  // En la pantalla de login/registro NO se muestra la barra de navegación
  if (pathname === "/login") {
    return null;
  }

  const isCurrent = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Barra de Navegación Superior Principal */}
      <header className="border-b border-slate-800/80 bg-[#0b101c]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Versión */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-900/30 group-hover:scale-105 transition-transform">
                ETI
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  eTrade Intelligence
                </span>
                <span className="ml-2 text-[10px] uppercase px-2 py-0.5 rounded font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  v2.3
                </span>
              </div>
            </Link>
          </div>

          {/* 4 Macro-Pilares de Navegación */}
          <nav className="hidden md:flex items-center space-x-1 font-medium text-xs lg:text-sm flex-shrink-0">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                isCurrent("/")
                  ? "bg-slate-800/90 text-white font-semibold shadow-inner border border-slate-700/60"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>1. Mercado</span>
            </Link>

            <Link
              href="/channels"
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                isCurrent("/channels")
                  ? "bg-slate-800/90 text-white font-semibold shadow-inner border border-slate-700/60"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Users className="w-4 h-4 text-rose-400" />
              <span>2. Canales & Fuentes</span>
            </Link>

            <Link
              href="/playbooks"
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                isCurrent("/playbooks")
                  ? "bg-slate-800/90 text-white font-semibold shadow-inner border border-slate-700/60"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>3. Estrategias & Playbooks</span>
            </Link>

            <Link
              href="/topics/options/rule-packs"
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                isCurrent("/topics/options/rule-packs")
                  ? "bg-slate-800/90 text-white font-semibold shadow-inner border border-slate-700/60"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>4. Robot eTrade</span>
            </Link>
          </nav>

          {/* Acciones Rápidas y Perfil del Usuario */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <Link
              href="/sources/add"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-cyan-900/30 flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Ingestar Canal</span>
              <span className="sm:hidden">+ Canal</span>
            </Link>

            {/* Perfil del Usuario Logueado con Menú y Cerrar Sesión */}
            <UserNav />
          </div>
        </div>
      </header>

      {/* Sub-header de Telemetría de Sistema y Estado de Temas (§2.1) */}
      <div className="bg-[#090d18] border-b border-slate-800/60 py-1.5 px-4 sm:px-6 lg:px-8 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Lado Izquierdo: Estado de Temas de Inversión */}
          <div className="flex items-center space-x-3">
            <span className="text-slate-500 font-semibold hidden sm:inline">ESTADO DE TEMAS:</span>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <strong>Opciones</strong> <span className="text-slate-500 text-[10px]">(Activo - MVP)</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-slate-500 opacity-60">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              Scalping (Próximamente)
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 text-slate-500 opacity-60">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              Swing Trading (Próximamente)
            </span>
          </div>

          {/* Lado Derecho: Telemetría de Servidores, Broker TWS y Auditoría */}
          <div className="flex items-center space-x-2 text-[11px]">
            <Link
              href="/review"
              className="text-slate-400 hover:text-cyan-400 px-1.5 py-0.5 rounded hover:bg-slate-800/60 transition flex items-center gap-1"
            >
              <CheckSquare className="w-3 h-3 text-blue-400" />
              <span>Review</span>
            </Link>

            <Link
              href="/ledger"
              className="text-slate-400 hover:text-purple-400 px-1.5 py-0.5 rounded hover:bg-slate-800/60 transition flex items-center gap-1"
            >
              <Database className="w-3 h-3 text-purple-400" />
              <span>Ledger</span>
            </Link>

            <div className="flex items-center space-x-1 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Server 3001 OK</span>
            </div>

            <div className="flex items-center space-x-1 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded text-cyan-300 font-mono text-[10px]" title="Conectado a Interactive Brokers TWS en APOLO">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>TWS APOLO:7497 [DUR260933]</span>
            </div>

            <div className="hidden sm:flex items-center space-x-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono text-[10px]">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>APPEND_ONLY</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
