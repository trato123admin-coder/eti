"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function AppFooter() {
  const pathname = usePathname();

  // En la pantalla de login/registro no mostramos el footer interno
  if (pathname === "/login") {
    return null;
  }

  return (
    <footer className="border-t border-slate-800/80 bg-[#090d16] text-xs text-slate-500 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          ETI v2.2 • Tres Vías de Validación: Replay (A) | Backtest (B) | Experience Ledger (C)
        </div>
        <div className="font-mono text-slate-600">
          eTrade Options Robot Integration • Guardrail: execution_allowed=false
        </div>
      </div>
    </footer>
  );
}
