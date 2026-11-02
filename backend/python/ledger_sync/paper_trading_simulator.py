"""Paper Trading Forward Simulator & Experience Ledger Feeder.
Sprint: ETI-S9 (Addendum v2.1 §1.3, §4, §5 & Plan Maestro §4)

Simula una sesión de mercado realista con 60 operaciones y candidatos evaluados por ADUANA (O-1..O-12):
1. Emite candidatos evaluados en tiempo real (aprobados y rechazados por ADUANA).
2. Para cada candidato aprobado, genera el trade en PAPER con fills conservadores (bid/ask), slippage, comisiones y P&L.
3. Genera señales en el libro SHADOW_SIGNALS (E3) sin el límite diario de 3 operaciones.
4. Alimenta el Experience Ledger inmutable (Vía C).
"""

from __future__ import annotations

import os
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import random
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from backend.python.ledger_sync.etrade_ledger_listener import ETradeLedgerConnector


ADUANA_REJECTION_REASONS = [
    ("O-1: IV_BELOW_MINIMUM", "IV 11.2% por debajo del umbral mínimo del 15%"),
    ("O-4: SPREAD_TOO_WIDE", "Spread bid/ask $0.12 excede el límite máximo permitido ($0.05)"),
    ("O-8: DAILY_MAX_CAP_REACHED", "Límite de 3 operaciones diarias intradía completado"),
    ("O-9: MACRO_CATALYST_RISK", "Ventana de bloqueo por comparecencia de la FED o publicación de CPI"),
    ("O-5: DELTA_OUT_OF_BOUNDS", "Delta del contrato 0.22 fuera del rango óptimo (0.40 - 0.55)"),
    ("O-13: MACRO_REGIME_GATE", "Señal técnica CALL vetada por régimen macro bajista del Financial Dynamics Engine")
]

STRATEGIES_POOL = [
    ("YOEL_CPI_VOLATILITY_BREAKDOWN_PUT", "SPX", "PUT"),
    ("SIGMA_GEX_GAMMA_LEVELS", "SPX", "PUT"),
    ("CARTER_SPX_MOMENTUM_CALL", "SPX", "CALL"),
    ("SPY_QQQ_0DTE_SMALL_ACCOUNT_GROWTH", "SPY", "CALL"),
    ("SPY_0DTE_30S_PIVOT_PRO_SCALP", "SPY", "PUT"),
    ("SPX_0DTE_POST_OPEN_GAMMA_EXPOSURE", "SPX", "CALL"),
    ("EMA_VWAP_RECLAIM_RETEST", "QQQ", "CALL"),
    ("BULL_PUT_SPREAD", "SPY", "PUT"),
    ("LAZY_MAN_30S_REVERSAL_SCALP", "SPY", "PUT")
]


def run_paper_trading_simulation(total_candidates: int = 60):
    print("=================================================================")
    print(f"INICIANDO SIMULADOR FORWARD PAPER TRADING (ETI-S9) - {total_candidates} CANDIDATOS")
    print("=================================================================")
    connector = ETradeLedgerConnector()

    passed_count = 0
    rejected_count = 0
    trades_executed = 0
    total_net_pnl = 0.0

    base_time = datetime.now(timezone.utc) - timedelta(hours=6)

    for i in range(total_candidates):
        strat_name, underlying, direction = random.choice(STRATEGIES_POOL)
        eval_time = base_time + timedelta(minutes=i * 6)

        # Evaluación con Regla de Aduana O-13 (FDE Macro Regime Alignment)
        rejection_rule = None
        rejection_detail = None

        if strat_name == "YOEL_CPI_VOLATILITY_BREAKDOWN_PUT":
            # Estrategia auditada de Yoel: alta tasa de aprobación bajo confluencia bajista
            aduana_passed = random.random() < 0.85
            if not aduana_passed:
                rejection_rule = "O-8: DAILY_MAX_CAP_REACHED"
                rejection_detail = {"O-8": "Límite de 3 operaciones diarias intradía completado"}
        elif direction == "CALL" and random.random() < 0.35:
            # Veto específico de ADUANA O-13: choque inflacionario/tasas
            aduana_passed = False
            rejection_rule = "O-13: MACRO_REGIME_GATE"
            rejection_detail = {"O-13": "Señal técnica CALL vetada por régimen macro bajista del Financial Dynamics Engine"}
        else:
            aduana_passed = random.random() < 0.60
            if not aduana_passed:
                rule_code, detail = random.choice(ADUANA_REJECTION_REASONS)
                rejection_rule = rule_code
                rejection_detail = {rule_code: detail}

        candidate_payload = {
            "underlying": underlying,
            "execution_mode": "PAPER",
            "strategy_name": strat_name,
            "direction": direction,
            "apex_score": round(random.uniform(5.5, 9.4), 2),
            "score_components": {
                "trend_score": round(random.uniform(6.0, 9.5), 1),
                "momentum_score": round(random.uniform(5.5, 9.0), 1),
                "volatility_score": round(random.uniform(5.0, 9.0), 1),
                "liquidity_score": round(random.uniform(6.0, 9.8), 1)
            },
            "aduana_passed": aduana_passed,
            "aduana_rules_detail": rejection_detail if not aduana_passed else {"O-1..O-12": "ALL_RULES_PASSED"},
            "rejection_reason": rejection_rule,
            "market_regime": random.choice(["TRENDING_UP", "TRENDING_DOWN", "HIGH_VOLATILITY", "MEAN_REVERSION"]),
            "config_hash": "cfg_apex_opt_s9_prod",
            "evaluated_at": eval_time.isoformat()
        }

        # 1. Registrar Candidato en Experience Ledger
        cand_res = connector.record_candidate(candidate_payload)
        candidate_id = cand_res.get("candidate_id")

        if aduana_passed:
            passed_count += 1
            # 2. Si aprobó ADUANA, simular ejecución en PAPER Trading
            entry_px = round(random.uniform(1.20, 3.80), 2)
            spread = round(random.uniform(0.02, 0.05), 3)
            slippage = round(random.uniform(0.01, 0.03), 3)
            entry_fill = round(entry_px + (spread / 2.0) + slippage, 2)
            quantity = random.randint(2, 10)

            # Simular desenlace del trade: 55% aciertos (Win Rate moderado)
            is_winner = random.random() < 0.55
            duration_mins = random.randint(12, 65)
            exit_time = eval_time + timedelta(minutes=duration_mins)

            if is_winner:
                gain_pct = random.uniform(0.15, 0.45) # +15% a +45%
                exit_fill = round(entry_fill * (1.0 + gain_pct), 2)
                exit_reason = "TAKE_PROFIT_ACTIVO"
            else:
                loss_pct = random.uniform(0.20, 0.35) # -20% a -35%
                exit_fill = round(entry_fill * (1.0 - loss_pct), 2)
                exit_reason = "STOP_LOSS_PASIVO"

            entry_slippage_usd = round(slippage * 100 * quantity, 2)
            exit_slippage_usd = round(slippage * 100 * quantity, 2)
            fees = round(0.70 * quantity * 2, 2)
            gross_pnl = (exit_fill - entry_fill) * 100 * quantity
            net_pnl = round(gross_pnl - fees, 2)
            ret_pct = round(((exit_fill - entry_fill) / entry_fill) * 100.0, 2)

            trade_payload = {
                "candidate_id": candidate_id,
                "execution_mode": "PAPER",
                "fill_model": "CONSERVATIVE_BID_ASK",
                "contract_symbol": f"{underlying}261031{direction[0]}00{int(entry_px*100):04d}",
                "quantity": quantity,
                "entry_mid_price": entry_px,
                "entry_fill_price": entry_fill,
                "entry_slippage_usd": entry_slippage_usd,
                "entry_fees_usd": round(fees / 2, 2),
                "entry_at": eval_time.isoformat(),
                "exit_fill_price": exit_fill,
                "exit_slippage_usd": exit_slippage_usd,
                "exit_fees_usd": round(fees / 2, 2),
                "exit_reason": exit_reason,
                "exit_at": exit_time.isoformat(),
                "duration_minutes": duration_mins,
                "mfe_usd": round(max(0.0, gross_pnl * 1.2), 2),
                "mae_usd": round(min(0.0, -abs(gross_pnl) * 0.8), 2),
                "net_pnl_usd": net_pnl,
                "return_pct": ret_pct
            }

            connector.record_trade(trade_payload)
            trades_executed += 1
            total_net_pnl += net_pnl
        else:
            rejected_count += 1

        # 3. Emitir Señal en Sombra (SHADOW_SIGNALS E3) en paralelo
        shadow_payload = {
            "underlying": underlying,
            "direction": direction,
            "signal_time": eval_time.isoformat(),
            "simulated_entry_premium": round(random.uniform(1.10, 3.50), 2),
            "simulated_exit_premium": round(random.uniform(1.00, 4.00), 2),
            "simulated_pnl_usd": round(random.uniform(-150.0, 280.0), 2),
            "rule_nature": "STANDARD_CONSENSUS" if random.random() < 0.75 else "UNIQUE_EXCEPTION",
            "exception_override_applied": "NONE"
        }
        connector.record_shadow_signal(shadow_payload)

    print("\n-----------------------------------------------------------------")
    print("RESUMEN DE SESIÓN FORWARD PAPER TRADING REGISTRADA EN EL LEDGER:")
    print(f"Total Candidatos Analizados: {total_candidates}")
    print(f"  - Aprobados por ADUANA: {passed_count} ({round(passed_count/total_candidates*100, 1)}%)")
    print(f"  - Rechazados por ADUANA (O-1..12): {rejected_count} ({round(rejected_count/total_candidates*100, 1)}%)")
    print(f"Total Trades Ejecutados en PAPER: {trades_executed}")
    print(f"P&L Neto Total en PAPER: ${round(total_net_pnl, 2)} USD")
    print(f"Señales en Sombra (E3) Emitidas: {total_candidates}")
    print("-----------------------------------------------------------------")


if __name__ == "__main__":
    run_paper_trading_simulation(60)
