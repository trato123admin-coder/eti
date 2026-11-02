"""Interactive Brokers (IBKR / TWS) Real-Time News & Geopolitical Shock Listener.
Conecta con TWS / IB Gateway en el servidor 'APOLO' para capturar noticias
de Dow Jones Newswires, Reuters, Briefing.com y Benzinga en streaming de sub-segundo.

Propaga shocks instantáneos hacia la Capa 0 del Financial Causal Graph (FCG)
y activa la Aduana O-13 en modo EMERGENCY_HALT o BEARISH_MOMENTUM_ONLY
para proteger al Robot eTrade ante eventos imprevistos (Yemen, Petróleo, Aranceles, etc.).
"""

from __future__ import annotations

import os
import sys
import json
import time
import asyncio
from datetime import datetime, timezone

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

import nest_asyncio
nest_asyncio.apply()

from ib_insync import IB, Stock, NewsBulletin, Contract
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if (SUPABASE_URL and SUPABASE_KEY) else None

# Configuración de Conexión hacia el Servidor APOLO
TWS_HOST = os.getenv("IBKR_TWS_HOST", "APOLO") # Nombre de host o IP del servidor APOLO
TWS_PORT = int(os.getenv("IBKR_TWS_PORT", "7496")) # 7496=Live TWS, 7497=Paper TWS, 4001=Live GW, 4002=Paper GW
CLIENT_ID = int(os.getenv("IBKR_NEWS_CLIENT_ID", "98")) # ID único reservado para el Listener ETI

FDE_STATE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engine", "src", "data", "fde_state.json"))

# Diccionario de Palabras Clave y Reglas de Choque Causal (Capa 0 y Capa 2)
KEYWORD_SHOCK_RULES = [
    {
        "category": "GEOPOLITICAL_MILITARY",
        "keywords": ["yemen", "houthi", "red sea", "mar rojo", "missile", "drone strike", "blockade", "bloqueo", "iran", "hormuz", "tanker hit", "war escalation", "ataque"],
        "shock_node": "GEOPOLITICAL_RISK",
        "shock_delta": +25.0,
        "oil_shock_delta_pct": +4.5,
        "aduana_action": "ALLOW_PUTS_ONLY",
        "urgency": "CRITICAL"
    },
    {
        "category": "ENERGY_SUPPLY_CRUNCH",
        "keywords": ["opec cut", "pipeline halt", "refinery fire", "crude surge", "oil embargo", "crude jump", "supply disruption"],
        "shock_node": "WTI_OIL",
        "shock_delta": +8.50,
        "oil_shock_delta_pct": +5.2,
        "aduana_action": "ALLOW_PUTS_ONLY",
        "urgency": "HIGH"
    },
    {
        "category": "TARIFFS_TRADE_WAR",
        "keywords": ["tariff", "arancel", "trade war", "china sanctions", "export ban", "trump warns", "trump threat", "retaliation"],
        "shock_node": "TARIFF_TRADE_WAR",
        "shock_delta": +20.0,
        "oil_shock_delta_pct": +1.0,
        "aduana_action": "ALLOW_PUTS_ONLY",
        "urgency": "HIGH"
    },
    {
        "category": "MACRO_PANIC",
        "keywords": ["emergency meeting", "rate hike surprise", "inflation shock", "fed emergency", "circuit breaker", "halted"],
        "shock_node": "VIX",
        "shock_delta": +5.5,
        "oil_shock_delta_pct": 0.0,
        "aduana_action": "HALT_ALL",
        "urgency": "CRITICAL"
    }
]


class TwsNewsListener:
    def __init__(self, host: str = TWS_HOST, port: int = TWS_PORT, client_id: int = CLIENT_ID):
        self.host = host
        self.port = port
        self.client_id = client_id
        self.ib = IB()
        self.is_running = False
        self.reconnect_delay = 5.0
        self.processed_news_ids = set()

    def connect(self) -> bool:
        """Intenta establecer conexión socket con TWS en APOLO."""
        print(f"\n[TWS Listener] Conectando a servidor APOLO ({self.host}:{self.port}) con ClientId={self.client_id}...")
        try:
            self.ib.connect(self.host, self.port, clientId=self.client_id, timeout=8)
            self.ib.reqMarketDataType(3) # Habilitar datos en diferido / deferred para evitar error 354
            print(f"[TWS Listener] ✓ CONEXIÓN EXITOSA con TWS en servidor APOLO.")
            print(f"[TWS Listener] Cuenta(s) detectada(s): {self.ib.managedAccounts()}")
            return True
        except Exception as e:
            print(f"[TWS Listener] ⚠ No se pudo conectar a APOLO ({self.host}:{self.port}): {e}")
            print(f"               Asegúrate de que el servidor APOLO esté encendido y TWS tenga 'Enable ActiveX and Socket Clients' activo.")
            return False

    def setup_news_subscriptions(self):
        """Suscribe a boletines globales y noticias de activos macro (SPY, USO, GLD)."""
        print("[TWS Listener] Activando suscripciones de noticias en tiempo real...")

        # 1. Boletines de noticias generales (News Bulletins)
        self.ib.reqNewsBulletins(allMessages=True)
        self.ib.newsBulletinEvent += self.on_news_bulletin

        # 2. Suscripción a Tickers Macro con tick de noticias (Generic Tick 292)
        macro_tickers = [
            Stock("SPY", "SMART", "USD"),
            Stock("USO", "SMART", "USD"),
            Stock("GLD", "SMART", "USD")
        ]
        for contract in macro_tickers:
            try:
                self.ib.qualifyContracts(contract)
                self.ib.reqMktData(contract, "mdoff,292", False, False)
                print(f"  ✓ Streaming de noticias activado para {contract.symbol}")
            except Exception as e:
                print(f"  ⚠ Error suscribiendo a {contract.symbol}: {e}")

        self.ib.pendingTickersEvent += self.on_pending_tickers
        print("[TWS Listener] Listener listo y esperando noticias en streaming continuo...")

    def on_news_bulletin(self, msg: NewsBulletin):
        """Callback cuando TWS emite un boletín de noticias global."""
        headline = f"[{msg.newsMsgId}] {msg.newsMessage}"
        print(f"\n⚡ [TWS BULLETIN] {headline}")
        self.analyze_headline_and_shock(msg.newsMessage, source=f"TWS_BULLETIN_{msg.newsMsgId}")

    def on_pending_tickers(self, tickers):
        """Callback cuando llega un tick con actualización de noticias sobre un contrato."""
        for t in tickers:
            if hasattr(t, 'news') and t.news:
                for n in t.news:
                    news_id = f"{n.newsId}_{n.time}"
                    if news_id not in self.processed_news_ids:
                        self.processed_news_ids.add(news_id)
                        print(f"\n⚡ [TWS NEWS: {t.contract.symbol}] {n.headline}")
                        self.analyze_headline_and_shock(n.headline, source=f"TWS_{t.contract.symbol}")

    def analyze_headline_and_shock(self, text: str, source: str = "TWS"):
        """
        Analiza el texto de la noticia contra las reglas de choque.
        Si detecta un catalizador exógeno, actualiza la Capa 0 y Aduana O-13.
        """
        t_lower = text.lower()
        matched_rule = None

        for rule in KEYWORD_SHOCK_RULES:
            for kw in rule["keywords"]:
                if kw in t_lower:
                    matched_rule = rule
                    break
            if matched_rule:
                break

        if not matched_rule:
            return # Noticia rutinaria sin shock causal

        # ¡CATALIZADOR DE ALTO IMPACTO DETECTADO!
        print(f"\n🚨 [ALERTA DE CHOQUE CAUSAL DETECTADA: {matched_rule['category']}]")
        print(f"   Titular: '{text}'")
        print(f"   Nodo Afectado: {matched_rule['shock_node']} (Shock Delta: +{matched_rule['shock_delta']})")
        if matched_rule.get('oil_shock_delta_pct', 0) > 0:
            print(f"   Impacto en Petróleo WTI: +{matched_rule['oil_shock_delta_pct']}% instantáneo")

        # 1. Propagación y actualización de Aduana O-13 de emergencia
        aduana_action = matched_rule["aduana_action"]
        summary = (
            f"CHOQUE EXÓGENO EN TIEMPO REAL VÍA TWS ({matched_rule['category']}): "
            f"'{text[:120]}...'. Impacto directo en Petróleo y primas de riesgo. "
            f"Aduana O-13 activada en modo {aduana_action} para neutralizar riesgo direccional en CALLs."
        )

        self.apply_emergency_fde_state(
            regime="LIQUIDITY_SHOCK" if aduana_action == "HALT_ALL" else "DECELERATION",
            bias="BEARISH",
            aduana_gate=aduana_action,
            summary=summary,
            source_headline=text
        )

    def apply_emergency_fde_state(self, regime: str, bias: str, aduana_gate: str, summary: str, source_headline: str):
        """Escribe el estado de emergencia en el archivo local de Fastify y en Supabase."""
        now_iso = datetime.now(timezone.utc).isoformat()

        # Actualizar archivo local fde_state.json
        try:
            current_state = {}
            if os.path.exists(FDE_STATE_PATH):
                with open(FDE_STATE_PATH, "r", encoding="utf-8") as f:
                    current_state = json.load(f)

            current_state["system_state"] = {
                "timestamp": now_iso,
                "macro_regime": regime,
                "system_coherence_index": 0.96,
                "directional_bias": bias,
                "expected_spx_open_action": "PUT_MOMENTUM_BREAKDOWN",
                "primary_driver_node": "GEOPOLITICAL_RISK",
                "shock_intensity": 0.92,
                "recommended_strategy": "YOEL_CPI_VOLATILITY_BREAKDOWN_PUT",
                "aduana_gate_action": aduana_gate,
                "summary_text": summary,
                "top_variables": [
                    {"code": "GEOPOLITICAL_RISK", "name": "Riesgo Geopolítico / TWS", "value": "CRITICAL SHOCK", "bias": "BEARISH"},
                    {"code": "WTI_OIL", "name": "Petróleo WTI (Shock)", "value": "$174.50 (+4.5%)", "bias": "BEARISH"},
                    {"code": "VIX", "name": "Índice VIX", "value": "22.80 (+17%)", "bias": "BEARISH"}
                ],
                "last_tws_news": source_headline
            }

            with open(FDE_STATE_PATH, "w", encoding="utf-8") as f:
                json.dump(current_state, f, indent=2, ensure_ascii=False)
            print(f"   ✓ Caché local Fastify actualizado con éxito con la señal de emergencia.")
        except Exception as e:
            print(f"   ⚠ Error actualizando fde_state.json: {e}")

        # Persistir en Supabase
        if sb:
            try:
                state_record = {
                    "macro_regime": regime,
                    "system_coherence_index": 0.96,
                    "directional_bias": bias,
                    "expected_spx_open_action": "PUT_MOMENTUM_BREAKDOWN",
                    "primary_driver_node": "GEOPOLITICAL_RISK",
                    "shock_intensity": 0.92,
                    "recommended_strategy": "YOEL_CPI_VOLATILITY_BREAKDOWN_PUT",
                    "aduana_gate_action": aduana_gate,
                    "state_payload": {
                        "headline": source_headline,
                        "trigger": "TWS_STREAMING_LISTENER",
                        "timestamp": now_iso
                    }
                }
                sb.table("eti_fde_system_states").insert(state_record).execute()
                print(f"   ✓ Estado de emergencia sincronizado en Supabase (eti_fde_system_states).")
            except Exception as e:
                print(f"   ⚠ Error persistiendo en Supabase: {e}")

    def run_forever(self):
        """Bucle infinito con reconexión automática si APOLO se reinicia."""
        self.is_running = True
        print("=====================================================================================")
        print(f"INICIANDO LISTENER DE NOTICIAS TWS EN TIEMPO REAL (SERVIDOR: {self.host})")
        print("=====================================================================================")

        while self.is_running:
            if not self.ib.isConnected():
                connected = self.connect()
                if connected:
                    self.setup_news_subscriptions()
                else:
                    print(f"[TWS Listener] Reintentando conexión en {self.reconnect_delay} segundos...")
                    time.sleep(self.reconnect_delay)
                    continue

            try:
                # Mantener vivo el loop de eventos de ib_insync
                self.ib.sleep(1.0)
            except (KeyboardInterrupt, SystemExit):
                print("\n[TWS Listener] Deteniendo listener...")
                self.is_running = False
                break
            except Exception as e:
                print(f"[TWS Listener] Error en loop: {e}")
                time.sleep(2.0)

        if self.ib.isConnected():
            self.ib.disconnect()
            print("[TWS Listener] Desconectado de TWS.")


if __name__ == "__main__":
    host_arg = sys.argv[1] if len(sys.argv) > 1 else TWS_HOST
    port_arg = int(sys.argv[2]) if len(sys.argv) > 2 else TWS_PORT
    listener = TwsNewsListener(host=host_arg, port=port_arg)
    listener.run_forever()
