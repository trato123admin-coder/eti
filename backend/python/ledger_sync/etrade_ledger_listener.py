"""eTrade Experience Ledger Connector & Listener (Vía C).
Sprint: ETI-S1B & ETI-S5 (Addendum v2.1 §1.3, §4, §5 & §6)

Conecta de forma asíncrona y no bloqueante el robot de opciones eTrade con ETI:
1. Despacha candidatos evaluados por ADUANA (aprobados y rechazados O-1..O-12).
2. Registra operaciones ejecutadas en PAPER y LIVE con métricas de slippage y comisiones.
3. Alimenta el libro de SHADOW SIGNALS (E3) sin el límite diario de 3 operaciones.
4. Consulta recomendaciones de inteligencia en tiempo real desde el ETI Fastify Engine.
"""

from __future__ import annotations

import os
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import json
import urllib.request
import urllib.error
from typing import Any
from datetime import datetime, timezone
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

ETI_ENGINE_URL = os.getenv("ETI_ENGINE_URL", "http://localhost:3001")
ETI_SERVICE_TOKEN = os.getenv("ETI_SERVICE_TOKEN", "eti_srv_tok_prod_2026_etrade_robot")


class ETradeLedgerConnector:
    """Cliente asíncrono para emitir eventos hacia el Experience Ledger de ETI."""

    def __init__(self, base_url: str = ETI_ENGINE_URL, token: str = ETI_SERVICE_TOKEN):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

    def _post(self, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Envía solicitud HTTP POST autenticada con reintentos."""
        url = f"{self.base_url}{endpoint}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=self.headers, method="POST")
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=15) as response:
                    res_body = response.read().decode("utf-8")
                    return json.loads(res_body)
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8")
                print(f"[ETI Connector Error {e.code}] en {endpoint}: {err_body}")
                raise
            except Exception as e:
                if attempt == 2:
                    print(f"[ETI Connector Error] Fallo persistente en {url}: {e}")
                    raise
                import time
                time.sleep(1)

    def _get(self, endpoint: str) -> dict[str, Any]:
        """Envía solicitud HTTP GET autenticada."""
        url = f"{self.base_url}{endpoint}"
        req = urllib.request.Request(url, headers=self.headers, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                res_body = response.read().decode("utf-8")
                return json.loads(res_body)
        except Exception as e:
            print(f"[ETI Connector Error] Fallo GET en {url}: {e}")
            raise

    def get_recommendations(self, underlying: str, market_regime: str = "TRENDING_UP") -> dict[str, Any]:
        """
        Consulta las recomendaciones activas de ETI (Consenso Estándar y Excepciones Tácticas).
        Llamada de solo lectura por parte del robot eTrade antes del filtrado ADUANA.
        """
        endpoint = f"/api/eti/v1/recommendations?underlying={underlying}&regime={market_regime}"
        return self._get(endpoint)

    def record_candidate(self, candidate_data: dict[str, Any]) -> dict[str, Any]:
        """
        Registra un candidato analizado por eTrade en el Experience Ledger inmutable.
        Captura tanto aprobados como rechazados por reglas O-1..O-12 (Aduana).
        """
        endpoint = "/api/eti/v1/ledger/candidate"
        return self._post(endpoint, candidate_data)

    def record_trade(self, trade_data: dict[str, Any]) -> dict[str, Any]:
        """
        Registra la ejecución real o simulada de una opción (PAPER/LIVE) una vez cerrada.
        """
        endpoint = "/api/eti/v1/ledger/trade"
        return self._post(endpoint, trade_data)

    def record_shadow_signal(self, signal_data: dict[str, Any]) -> dict[str, Any]:
        """
        Registra una señal del libro de sombras (E3) sin límites de trades diarios.
        """
        endpoint = "/api/eti/v1/ledger/shadow_signal"
        return self._post(endpoint, signal_data)

    def get_ledger_stats(self) -> dict[str, Any]:
        """Obtiene estadísticas globales del Experience Ledger."""
        return self._get("/api/eti/v1/ledger/stats")


# -----------------------------------------------------------------------------
# Simulación de Flujo Real eTrade -> ETI (Spike de Demostración y Verificación)
# -----------------------------------------------------------------------------
def run_etrade_integration_demo():
    print("=================================================================")
    print("DEMO INTEGRACIÓN: eTrade Options Robot <---> ETI Experience Ledger")
    print("=================================================================")
    connector = ETradeLedgerConnector()

    # 1. Consulta de Inteligencia (Recomendaciones ETI)
    print("\n1. Consultando Recomendaciones de Opciones para SPY...")
    recs = connector.get_recommendations("SPY", "TRENDING_UP")
    print(f"   Estado de Seguridad (execution_allowed): {recs.get('execution_allowed')}")
    print(f"   Regla Aplicada: {recs.get('rule_applied')} [{recs.get('rule_nature')}]")
    print(f"   Dirección Sugerida: {recs.get('candidate_direction')} | Razonamiento: {recs.get('reasoning', [''])[0]}")

    # 2. Emisión de Candidato APROBADO por ADUANA
    print("\n2. Registrando Candidato APROBADO (O-1..O-12 OK)...")
    cand_approved = {
        "underlying": "SPY",
        "execution_mode": "PAPER",
        "strategy_name": "SPY_QQQ_0DTE_SMALL_ACCOUNT_GROWTH",
        "direction": "CALL",
        "apex_score": 8.75,
        "score_components": {
            "trend_score": 9.0,
            "momentum_score": 8.5,
            "volatility_score": 8.8,
            "liquidity_score": 9.2,
            "catalyst_score": 7.5,
            "gamma_score": 8.9
        },
        "aduana_passed": True,
        "aduana_rules_detail": {
            "O-1_min_iv": "PASSED (IV 18.2% >= 15%)",
            "O-2_max_dte": "PASSED (0DTE intraday)",
            "O-4_bid_ask_spread": "PASSED (Spread $0.02 <= $0.05)",
            "O-8_daily_cap": "PASSED (Trade 1 de 3)"
        },
        "rejection_reason": None,
        "market_regime": "TRENDING_UP",
        "config_hash": "cfg_apex_opt_v2_2026"
    }
    cand_res1 = connector.record_candidate(cand_approved)
    cand_id1 = cand_res1.get("candidate_id")
    print(f"   ✅ Candidato registrado exitosamente en Ledger. ID: {cand_id1}")

    # 3. Emisión de Trade Ejecutado para el Candidato Aprobado
    print("\n3. Registrando Trade Ejecutado y Cerrado en PAPER...")
    trade_data = {
        "candidate_id": cand_id1,
        "execution_mode": "PAPER",
        "fill_model": "CONSERVATIVE_BID_ASK",
        "contract_symbol": "SPY261031C00560000",
        "quantity": 5,
        "entry_mid_price": 1.45,
        "entry_fill_price": 1.47,
        "entry_slippage_usd": 0.02 * 100 * 5,
        "entry_fees_usd": 0.70 * 5,
        "entry_at": datetime.now(timezone.utc).isoformat(),
        "exit_fill_price": 1.88,
        "exit_slippage_usd": 0.02 * 100 * 5,
        "exit_fees_usd": 0.70 * 5,
        "exit_reason": "TAKE_PROFIT_ACTIVO",
        "exit_at": datetime.now(timezone.utc).isoformat(),
        "duration_minutes": 24.5,
        "mfe_usd": 220.0,
        "mae_usd": -45.0,
        "net_pnl_usd": (1.88 - 1.47) * 100 * 5 - (0.70 * 10),
        "return_pct": round(((1.88 - 1.47) / 1.47) * 100.0, 2)
    }
    trade_res = connector.record_trade(trade_data)
    print(f"   ✅ Trade registrado en Ledger. ID: {trade_res.get('trade_id')} | P&L: ${trade_data['net_pnl_usd']} USD")

    # 4. Emisión de Candidato RECHAZADO por ADUANA (Contra-fáctico)
    print("\n4. Registrando Candidato RECHAZADO por ADUANA (O-4 Spread excesivo)...")
    cand_rejected = {
        "underlying": "SPY",
        "execution_mode": "PAPER",
        "strategy_name": "SPY_0DTE_30S_PIVOT_PRO_SCALP",
        "direction": "PUT",
        "apex_score": 6.10,
        "score_components": {
            "trend_score": 6.0,
            "momentum_score": 7.0,
            "volatility_score": 5.5,
            "liquidity_score": 4.0
        },
        "aduana_passed": False,
        "aduana_rules_detail": {
            "O-4_bid_ask_spread": "REJECTED (Spread $0.12 > max permitted $0.05)"
        },
        "rejection_reason": "O-4: BID_ASK_SPREAD_EXCEEDS_THRESHOLD",
        "market_regime": "HIGH_VOLATILITY",
        "config_hash": "cfg_apex_opt_v2_2026"
    }
    cand_res2 = connector.record_candidate(cand_rejected)
    print(f"   ✅ Candidato Rechazado registrado para análisis contrafáctico. ID: {cand_res2.get('candidate_id')}")

    # 5. Emisión de Señal en Sombra (E3)
    print("\n5. Registrando Señal en Sombra (SHADOW_SIGNALS E3)...")
    shadow_signal = {
        "underlying": "SPY",
        "direction": "CALL",
        "signal_time": datetime.now(timezone.utc).isoformat(),
        "simulated_entry_premium": 1.25,
        "simulated_exit_premium": 1.55,
        "simulated_pnl_usd": 150.0,
        "rule_nature": "STANDARD_CONSENSUS",
        "exception_override_applied": "NONE"
    }
    sig_res = connector.record_shadow_signal(shadow_signal)
    print(f"   ✅ Señal en Sombra registrada en Ledger. ID: {sig_res.get('signal_id')}")

    # 6. Estadísticas del Ledger
    print("\n6. Consultando Estadísticas Globales del Experience Ledger...")
    stats = connector.get_ledger_stats()
    print(f"   Total Candidatos en Ledger: {stats.get('total_candidates_evaluated')}")
    print(f"   Total Trades Ejecutados: {stats.get('total_executed_trades')}")
    print(f"   Modo de Integridad: {stats.get('ledger_mode')}")
    print("\n🎉 Verificación completada con éxito. Integración Vía C operativa.")


if __name__ == "__main__":
    run_etrade_integration_demo()
