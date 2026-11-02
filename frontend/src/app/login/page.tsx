"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  TrendingUp,
  Activity,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/lib/authContext";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, user } = useAuth();

  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleCode, setRoleCode] = useState("trader");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick fill para pruebas ágiles del usuario
  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (mode === "REGISTER") {
      setConfirmPassword(demoPass);
      setFullName("Operador eTrade");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg("Por favor ingresa tanto el correo como la contraseña.");
      return;
    }

    if (mode === "REGISTER") {
      if (!fullName) {
        setErrorMsg("Por favor ingresa tu nombre completo o alias de trader.");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Las contraseñas no coinciden.");
        return;
      }

      setLoading(true);
      const { data, error } = await signUp(email, password, fullName, roleCode);
      setLoading(false);

      if (error) {
        setErrorMsg(error.message || "Error al registrar la cuenta.");
      } else {
        setSuccessMsg(
          data.session
            ? "¡Registro exitoso! Iniciando sesión en la terminal..."
            : "¡Registro enviado! Si se requiere confirmación, revisa tu bandeja de entrada o inicia sesión."
        );
        setTimeout(() => {
          router.push("/");
        }, 1200);
      }
    } else {
      // Iniciar Sesión (LOGIN)
      setLoading(true);
      const { data, error } = await signIn(email, password);
      setLoading(false);

      if (error) {
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Credenciales incorrectas. Verifica tu correo y contraseña o crea una cuenta nueva."
            : error.message
        );
      } else {
        setSuccessMsg("Autenticación exitosa. Redirigiendo al Dashboard...");
        setTimeout(() => {
          router.push("/");
        }, 800);
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* 1. Header Institucional ETI */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-950/60 border border-cyan-500/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="font-mono font-bold text-lg text-white tracking-wider flex items-center gap-1.5">
                eTrade Intelligence <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">v2.3</span>
              </span>
              <p className="text-[11px] font-mono text-slate-400">Plataforma Causal Macro & Ejecución</p>
            </div>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white pt-2">
            {mode === "LOGIN" ? "Acceso a la Terminal ETI" : "Registro de Nuevo Operador"}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {mode === "LOGIN"
              ? "Ingresa tus credenciales para supervisar el motor causal, proyecciones y el robot eTrade."
              : "Registra tu cuenta de operador para acceder al panel de control y sincronización con TWS."}
          </p>
        </div>

        {/* 2. Tarjeta Principal con Pestañas de Login / Registro */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
          {/* Selector de Modo */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                mode === "LOGIN"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                mode === "REGISTER"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Registrarse</span>
            </button>
          </div>

          {/* Alertas de Éxito / Error */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            {mode === "REGISTER" && (
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Nombre Completo o Alias de Trader:</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Alexander Trader"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold block">Correo Electrónico:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@oklantrade.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold block">Contraseña:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "REGISTER" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Confirmar Contraseña:</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Rol Operativo Solicitado:</label>
                  <select
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="trader">Trading Operator (Supervisión Robot eTrade)</option>
                    <option value="admin">Administrator (Control de Entorno & Fuentes)</option>
                    <option value="reviewer">ETI Reviewer (Validación Cuantitativa de Reglas)</option>
                    <option value="viewer">Auditor / Viewer (Solo Lectura de Dashboards)</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                mode === "LOGIN"
                  ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/60"
                  : "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/60"
              }`}
            >
              {loading ? (
                <span>Procesando solicitud...</span>
              ) : mode === "LOGIN" ? (
                <>
                  <span>Ingresar a la Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Crear Cuenta de Operador</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill para pruebas */}
          <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono space-y-2">
            <span className="text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Cuentas de demostración rápida:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("trader@oklantrade.com", "OklanTrader2026!")}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                trader@oklantrade.com
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("admin@eti.internal", "EtiAdmin2026!")}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                admin@eti.internal
              </button>
            </div>
          </div>
        </div>

        {/* 3. Footer de Seguridad */}
        <div className="text-center text-slate-500 text-xs font-mono space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" /> Conexión protegida con Supabase Auth & PostgreSQL RBAC
          </p>
          <p>© 2026 eTrade Intelligence (ETI). Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
