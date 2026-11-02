"""Cost Calibration Engine (Vía C -> Vía B).
Sprint: ETI-S6B (Addendum v2.1 §1.3, §4 & Arquitectura §12.3)

Mide la fricción real observada en las operaciones del Experience Ledger (PAPER y LIVE)
y calibra los parámetros de spread, slippage y comisiones que alimentan el Backtest (Vía B).
Previene el sesgo de simulación optimista.
"""

from __future__ import annotations

import os
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from datetime import datetime, timezone
from typing import Any
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


class CostCalibrationEngine:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Variables de Supabase no configuradas")
        self.sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def calibrate_costs_from_ledger(self) -> dict[str, Any]:
        """
        Calcula el slippage y spread efectivo a partir de los trades cerrados en eti_experience_trades
        y almacena una nueva versión calibrada en eti_cost_calibrations.
        """
        print("=================================================================")
        print("MOTOR DE CALIBRACIÓN DE COSTES (Vía C -> Vía B)")
        print("=================================================================")

        trades_res = self.sb.table("eti_experience_trades").select("*").execute()
        trades = trades_res.data or []

        sample_count = len(trades)
        print(f"Muestras de trades disponibles en el Experience Ledger: {sample_count}")

        if sample_count == 0:
            default_calib = {
                "calibration_version": f"CALIB_DEFAULT_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
                "sample_trades_count": 0,
                "avg_slippage_pct": 0.0150, # 1.5% slippage por defecto
                "avg_spread_pct": 0.0300,   # 3.0% spread bid-ask por defecto
                "fee_per_contract": 0.70,
                "notes": "Parámetros sintéticos conservadores iniciales (sin historial de trades suficientes)."
            }
            self.sb.table("eti_cost_calibrations").insert(default_calib).execute()
            print(f"Calibración por defecto registrada: {default_calib['calibration_version']}")
            return default_calib

        # Calcular métricas ponderadas
        total_slippage = 0.0
        total_entry_val = 0.0
        total_fees = 0.0
        total_contracts = 0

        for t in trades:
            qty = t.get("quantity", 1)
            entry_px = float(t.get("entry_fill_price", 1.0))
            slippage = float(t.get("entry_slippage_usd", 0.0)) + float(t.get("exit_slippage_usd", 0.0))
            fees = float(t.get("entry_fees_usd", 0.70)) + float(t.get("exit_fees_usd", 0.70))

            trade_notional = entry_px * 100.0 * qty
            total_entry_val += trade_notional
            total_slippage += slippage
            total_fees += fees
            total_contracts += (qty * 2)

        avg_slippage_pct = round(total_slippage / max(total_entry_val, 1.0), 4)
        avg_spread_pct = round(avg_slippage_pct * 1.8, 4) # Spread estimado a partir del slippage
        fee_per_contract = round(total_fees / max(total_contracts, 1), 4)

        # Garantizar cotas mínimas conservadoras
        avg_slippage_pct = max(0.0080, avg_slippage_pct)
        avg_spread_pct = max(0.0150, avg_spread_pct)
        fee_per_contract = max(0.65, fee_per_contract)

        calib_version = f"CALIB_V_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        calib_record = {
            "calibration_version": calib_version,
            "sample_trades_count": sample_count,
            "avg_slippage_pct": avg_slippage_pct,
            "avg_spread_pct": avg_spread_pct,
            "fee_per_contract": fee_per_contract,
            "valid_from": datetime.now(timezone.utc).isoformat(),
            "notes": f"Calibrado dinámicamente con {sample_count} trades reales/paper de eTrade."
        }

        self.sb.table("eti_cost_calibrations").insert(calib_record).execute()
        print(f"✅ Nueva versión de calibración registrada: {calib_version}")
        print(f"   - Slippage Calibrado: {round(avg_slippage_pct * 100, 2)}%")
        print(f"   - Spread Calibrado: {round(avg_spread_pct * 100, 2)}%")
        print(f"   - Comisión Efectiva: ${fee_per_contract} USD / contrato")

        return calib_record

    def get_latest_calibration(self) -> dict[str, Any]:
        """Recupera la calibración de costes más reciente para el Backtesting Vía B."""
        res = self.sb.table("eti_cost_calibrations").select("*").order("valid_from", desc=True).limit(1).execute()
        if res.data:
            return res.data[0]
        return self.calibrate_costs_from_ledger()


if __name__ == "__main__":
    engine = CostCalibrationEngine()
    engine.calibrate_costs_from_ledger()
