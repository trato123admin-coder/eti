"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  User,
  LogIn,
  LogOut,
  ChevronDown,
  Settings,
  Shield,
  Activity,
  Database,
  CheckSquare,
  Clock,
  UserCog,
  Radio
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import UserProfileModal from "@/components/UserProfileModal";

export default function UserNav() {
  const { user, signOut, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
        <div className="h-8 w-28 rounded-lg bg-slate-800/60 animate-pulse" />
      </div>
    );
  }

  if (user) {
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader";
    const role = (user.user_metadata?.role_code || "TRADER").toUpperCase();
    const email = user.email || "";
    const timezone = user.user_metadata?.timezone || "America/New_York (EST)";
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        {/* Botón Principal de Usuario en la Barra Superior */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/60 transition shadow-sm text-left group"
          title="Menú de Usuario y Configuración"
        >
          {/* Avatar con Indicador En Línea */}
          <div className="relative flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-inner">
              {initial}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0b101c]" />
          </div>

          {/* Nombre y Rol */}
          <div className="hidden sm:block leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-slate-100 group-hover:text-cyan-300 transition truncate max-w-[130px]">
                {displayName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
              <span className="font-bold">{role}</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400">ONLINE</span>
            </div>
          </div>

          {/* Chevron */}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-transform duration-200 ${
              dropdownOpen ? "rotate-180 text-cyan-400" : ""
            }`}
          />
        </button>

        {/* Menú Desplegable Institucional */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0d1424] border border-slate-700/90 shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header del Perfil */}
            <div className="p-4 bg-slate-900/80 border-b border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-md">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">
                    {displayName}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono truncate" title={email}>
                    {email}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {role}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Activo
                    </span>
                  </div>
                </div>
              </div>

              {/* Información Operativa */}
              <div className="mt-3 pt-3 border-t border-slate-800/70 space-y-1 text-[11px] font-mono text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3 text-cyan-400" /> Zona:
                  </span>
                  <span className="text-slate-300 truncate max-w-[150px]">
                    {timezone.replace("America/", "")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Radio className="w-3 h-3 text-emerald-400" /> TWS Broker:
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    APOLO:7497 [DUR260933]
                  </span>
                </div>
              </div>
            </div>

            {/* Opciones del Menú */}
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition"
              >
                <UserCog className="w-4 h-4 text-cyan-400" />
                <span>Modificar Datos del Usuario</span>
              </button>

              <Link
                href="/ledger"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition"
              >
                <Database className="w-4 h-4 text-purple-400" />
                <span>Historial & Audit Ledger</span>
              </Link>

              <Link
                href="/review"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition"
              >
                <CheckSquare className="w-4 h-4 text-blue-400" />
                <span>Revisión de Extracciones</span>
              </Link>
            </div>

            {/* Footer con Cerrar Sesión */}
            <div className="p-2 border-t border-slate-800/80 bg-slate-900/40">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  signOut();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 hover:border-rose-700 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal para Modificar Datos */}
        <UserProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      </div>
    );
  }

  // Estado Desconectado
  return (
    <div className="flex items-center pl-2 border-l border-slate-800 text-xs font-mono">
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-md shadow-indigo-950"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Iniciar Sesión</span>
      </Link>
    </div>
  );
}
