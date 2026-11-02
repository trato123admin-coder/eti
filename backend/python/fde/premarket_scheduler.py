"""Pre-Market Automation Scheduler & Macro News Feed Analyzer.
Sprint: ETI-S4C / Addendum v2.3
Inspiración: Dinámica de Sistemas Forrester & Protocolo de Pre-Apertura Institucional

Funciones Clave:
1. Despierta 1 hora antes de la campana (8:15 AM EST).
2. A las 8:30 AM EST ingesta los datos macro de alta frecuencia (CPI, PPI, NFP, Jobless Claims).
3. Ingesta el feed de noticias en vivo de Finnhub (CNBC, Reuters, Bloomberg) y calcula el índice de sentimiento macro.
4. Ejecuta el Financial Dynamics Engine (FDE) y propaga los choques en el grafo FCG.
5. Emite a las 9:20 AM el Mandato de ADUANA O-13 para el Robot eTrade.
"""

from __future__ import annotations

import os
import sys
import json
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

# Asegurar path raíz para imports
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import requests
from backend.python.fde.financial_causal_engine import FinancialDynamicsEngine

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

class MacroNewsAnalyzer:
    """Analizador léxico-causal de noticias financieras para detectar catalizadores exógenos."""
    
    HAWKISH_KEYWORDS = ["cpi", "inflation", "sticky", "rate hike", "delay cuts", "higher for longer", "tariff", "war", "oil rally"]
    DOVISH_KEYWORDS = ["rate cut", "cooling inflation", "disinflation", "dovish", "soft landing", "recession risk", "fed pivot"]
    RISK_OFF_KEYWORDS = ["escalation", "missile", "middle east", "default", "liquidity crunch", "bank failure", "sanctions"]

    @classmethod
    def analyze_finnhub_news(cls) -> Dict[str, Any]:
        if not FINNHUB_API_KEY:
            return {"sentiment": "NEUTRAL", "hawkish_score": 0.5, "catalysts_found": []}

        try:
            url = f"https://finnhub.io/api/v1/news?category=general&token={FINNHUB_API_KEY}"
            r = requests.get(url, timeout=7)
            if r.status_code != 200:
                return {"sentiment": "NEUTRAL", "hawkish_score": 0.5, "catalysts_found": []}

            items = r.json()[:40] # Analizar los últimos 40 titulares
            hawkish_hits = 0
            dovish_hits = 0
            risk_off_hits = 0
            detected_catalysts = []

            for item in items:
                headline = item.get("headline", "").lower()
                source = item.get("source", "Unknown")

                is_hawkish = any(k in headline for k in cls.HAWKISH_KEYWORDS)
                is_dovish = any(k in headline for k in cls.DOVISH_KEYWORDS)
                is_risk_off = any(k in headline for k in cls.RISK_OFF_KEYWORDS)

                if is_hawkish:
                    hawkish_hits += 1
                if is_dovish:
                    dovish_hits += 1
                if is_risk_off:
                    risk_off_hits += 1

                if (is_hawkish or is_risk_off) and len(detected_catalysts) < 5:
                    detected_catalysts.append({
                        "headline": item.get("headline"),
                        "source": source,
                        "time": datetime.fromtimestamp(item.get("datetime", time.time()), timezone.utc).strftime("%H:%M EST"),
                        "tone": "HAWKISH / RISK-OFF"
                    })

            total_hits = hawkish_hits + dovish_hits + 0.001
            hawkish_ratio = hawkish_hits / total_hits

            sentiment = "NEUTRAL"
            if hawkish_ratio > 0.65 or risk_off_hits >= 3:
                sentiment = "BEARISH_PRESSURE"
            elif hawkish_ratio < 0.35:
                sentiment = "BULLISH_TAILWIND"

            return {
                "sentiment": sentiment,
                "hawkish_hits": hawkish_hits,
                "dovish_hits": dovish_hits,
                "risk_off_hits": risk_off_hits,
                "hawkish_ratio": round(hawkish_ratio, 2),
                "catalysts_found": detected_catalysts
            }
        except Exception as e:
            print(f"[WARN] Error analizando noticias Finnhub: {e}")
            return {"sentiment": "NEUTRAL", "hawkish_score": 0.5, "catalysts_found": []}


class PreMarketScheduler:
    """Orquestador temporal que ejecuta la rutina de pre-apertura."""

    def __init__(self):
        self.engine = FinancialDynamicsEngine()
        self.briefing_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "engine", "src", "data", "premarket_briefing.json")
        )

    def execute_premarket_routine(self) -> Dict[str, Any]:
        now_utc = datetime.now(timezone.utc)
        now_est = now_utc - timedelta(hours=5)
        print(f"\n==========================================================================")
        print(f"INICIANDO RUTINA PRE-MARKET ETI | HORA EST: {now_est.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"==========================================================================")

        # 1. Ingesta de Noticias y Detección de Catalizadores
        print("\n[FASE 1 - 8:15 EST] Ingestando Feed de Noticias en Vivo y Catalizadores...")
        news_analysis = MacroNewsAnalyzer.analyze_finnhub_news()
        print(f"  * Sentimiento Noticias: {news_analysis['sentiment']} (Hawkish ratio: {news_analysis.get('hawkish_ratio', 0.5)})")
        print(f"  * Alertas detectadas: {len(news_analysis['catalysts_found'])} titulares relevantes")

        # 2. Ingesta de Datos y Propagación en el Grafo Causal FDE
        print("\n[FASE 2 - 8:30 EST] Ejecutando Motor Causal FDE (FRED, Commodities, Yields)...")
        fde_result = self.engine.run_full_pipeline()
        fss = fde_result["fss"]

        # 3. Síntesis de la Postura de Aduana O-13 para el Robot
        print("\n[FASE 3 - 9:20 EST] Generando Mandato de ADUANA O-13 para Robot eTrade...")
        robot_mandate = {
            "evaluation_time_est": now_est.strftime("%H:%M:%S EST"),
            "macro_regime": fss["macro_regime"],
            "bias": fss["directional_bias"],
            "aduana_gate": fss["aduana_gate_action"],
            "primary_playbook": fss["recommended_strategy"],
            "coherence_index_pct": round(fss["system_coherence_index"] * 100, 1),
            "allowed_underlying": ["SPX", "SPY"] if fss["directional_bias"] == "BEARISH" else ["SPX", "QQQ"],
            "execution_allowed": False, # Guardrail obligatorio
            "opening_tactical_plan": (
                "Monitorear primeros 5 minutos de apertura (9:30-9:35 AM). "
                "Si precio abre bajo VWAP y falla el primer rebote en resistencia, ejecutar señal de Yoel Sardiñas (PUT 0DTE ATM). "
                "En caso de rebote sólido sobre VWAP, la orden queda invalidada por Aduana O-13."
            )
        }
        print(f"  * Régimen Final: {robot_mandate['macro_regime']} | Sesgo: {robot_mandate['bias']}")
        print(f"  * Puerta Aduana: {robot_mandate['aduana_gate']} | Playbook: {robot_mandate['primary_playbook']}")

        # 4. Guardar Briefing Pre-Market Consolidado
        briefing_payload = {
            "generated_at_utc": now_utc.isoformat(),
            "generated_at_est": now_est.strftime("%Y-%m-%d %H:%M:%S EST"),
            "news_analysis": news_analysis,
            "fss": fss,
            "robot_mandate": robot_mandate,
            "is_ready_for_market_open": True
        }

        try:
            with open(self.briefing_path, "w", encoding="utf-8") as f:
                json.dump(briefing_payload, f, indent=2, ensure_ascii=False)
            print(f"\n[FASE 4 - 9:25 EST] Briefing Pre-Market guardado exitosamente en:\n  {self.briefing_path}")
        except Exception as e:
            print(f"[WARN] Error guardando briefing: {e}")

        print("\n==========================================================================")
        print("RUTINA PRE-MARKET COMPLETADA CON ÉXITO | ROBOT EN ESPERA DE APERTURA 9:30 AM")
        print("==========================================================================\n")
        return briefing_payload


if __name__ == "__main__":
    scheduler = PreMarketScheduler()
    scheduler.execute_premarket_routine()
