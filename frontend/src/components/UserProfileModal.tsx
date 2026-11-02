"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import {
  X,
  User,
  Mail,
  Shield,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Save
} from "lucide-react";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, updateUserProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [roleCode, setRoleCode] = useState("trader");
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      setTimezone(user.user_metadata?.timezone || "America/New_York");
      setRoleCode(user.user_metadata?.role_code || "trader");
      setChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("El nombre completo o alias no puede estar vacío.");
      return;
    }

    if (changePassword) {
      if (newPassword.length < 6) {
        setErrorMsg("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("Las contraseñas no coinciden.");
        return;
      }
    }

    setLoading(true);

    try {
      const payload: {
        fullName: string;
        timezone: string;
        roleCode: string;
        password?: string;
      } = {
        fullName: fullName.trim(),
        timezone,
        roleCode,
      };

      if (changePassword && newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const { error } = await updateUserProfile(payload);

      if (error) {
        setErrorMsg(error.message || "Error al actualizar los datos del usuario.");
      } else {
        setSuccessMsg("¡Datos del usuario actualizados exitosamente en Supabase!");
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error inesperado al guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0b101c] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Modificar Datos del Usuario
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Perfil de Operador & Seguridad ETI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nombre Completo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Nombre Completo / Alias de Trader
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Yoel Sardiñas"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Email (Readonly) */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Correo Electrónico</span>
              <span className="text-[10px] text-slate-500 font-mono lowercase">Principal (Supabase Auth)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-400 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          {/* Grid: Rol y Zona Horaria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rol */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Rol en la Plataforma
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Shield className="w-4 h-4" />
                </span>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 font-mono"
                >
                  <option value="trader">TRADER (Operador de Opciones)</option>
                  <option value="analyst">ANALISTA (Investigación Macro)</option>
                  <option value="admin">ADMIN (Control Total / TWS)</option>
                </select>
              </div>
            </div>

            {/* Zona Horaria */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Zona Horaria Operativa
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Clock className="w-4 h-4" />
                </span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 font-mono text-xs"
                >
                  <option value="America/New_York">New York (EST/EDT - NYSE)</option>
                  <option value="America/Lima">Lima / Bogotá (UTC-5)</option>
                  <option value="Europe/Madrid">Madrid (CET - UTC+1)</option>
                  <option value="UTC">UTC (Universal Coordinated)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Toggle de Cambio de Contraseña */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                />
                <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  Cambiar Contraseña de Acceso
                </span>
              </label>
            </div>

            {changePassword && (
              <div className="space-y-3 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nueva Contraseña (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-9 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-900/30 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
