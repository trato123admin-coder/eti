"""AI Knowledge Extractor & Rule Consensus Synthesizer.
Sprint: ETI-S4

Utiliza Google Gemini para convertir segmentos de video en entidades estructuradas:
- Estrategias y Operaciones relatadas en Opciones (CALL/PUT)
- Clasificación de Afirmaciones (EXPLICIT_RULE, INFERRED_RULE, LIVE_CLAIM, RECAP_CLAIM)
- Minería de Reglas: Regla Estándar (Consenso de los 5) vs. Reglas Únicas (Excepciones situacionales)
- Trazabilidad estricta a la URL de YouTube y timestamp de inicio/fin.
"""

from __future__ import annotations

import os
import json
import urllib.request
import urllib.error
from typing import Any
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("YOUTUBE_GEMINI_API_KEY")

EXTRACTION_SYSTEM_PROMPT = """Eres el motor de extracción de conocimiento para eTrade Trading Intelligence (ETI).
Tu tarea es analizar transcripciones de traders de opciones en YouTube (SPY, QQQ, SPX, 0DTE) y extraer conocimiento operativo estructurado.

REGLAS NO NEGOCIABLES:
1. NO INVENTES NADA: Si el trader no menciona un strike, prima, hora o stop loss exacto, asigna NULL y agrégalo a unknown_fields.
2. DISTINGUE AFIRMACIONES:
   - EXPLICIT_RULE: El trader dice directamente una regla ("siempre espero el retest del VWAP").
   - INFERRED_RULE: Tú deduces una regla a partir de sus comentarios.
   - RECAP_CLAIM: El trader cuenta una operación que hizo ("compré 10 contratos del Call 560 y gané $400").
   - LIVE_CLAIM: Operación transmitida en directo.
3. CONTRATOS DE OPCIONES: Identifica si operó CALL o PUT, si es 0DTE o posterior, y el subyacente.
4. RESPUESTA ESTRICTA EN JSON. No agregues texto fuera del bloque JSON.

Estructura JSON requerida:
{
  "strategies": [
    {
      "name": "NOMBRE_ESTRATEGIA",
      "underlying": "SPY",
      "direction": "CALL" | "PUT",
      "timeframe": "1m" | "2m" | "5m" | "15m",
      "nature": "STANDARD_CONSENSUS" | "UNIQUE_EXCEPTION",
      "description": "...",
      "rules": [
        {
          "rule_type": "ENTRY_TRIGGER" | "CONFIRMATION" | "INVALIDATION" | "STOP_LOSS" | "TAKE_PROFIT",
          "condition_code": "...",
          "rule_nature": "STANDARD_CONSENSUS" | "UNIQUE_EXCEPTION",
          "parameters": {},
          "activation_context": {}
        }
      ]
    }
  ],
  "operations": [
    {
      "underlying": "SPY",
      "contract_type": "CALL" | "PUT",
      "strike": null,
      "dte": 0,
      "declared_entry_premium": null,
      "declared_exit_premium": null,
      "declared_pnl_usd": null,
      "claim_type": "RECAP_CLAIM",
      "unknown_fields": []
    }
  ]
}
"""


class AIKnowledgeExtractorService:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Credenciales de Supabase no configuradas")
        self.sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.api_key = GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("YOUTUBE_GEMINI_API_KEY no encontrada en .env.local")

    def call_gemini(self, prompt: str, model: str = "models/gemini-3.8-flash") -> dict[str, Any] | None:
        """Invoca a Google Gemini REST API de forma determinística."""
        url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": EXTRACTION_SYSTEM_PROMPT},
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                text_response = result["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text_response)
        except Exception as e:
            print(f"Error invocando Gemini API: {e}")
            return None

    def extract_from_segment(self, segment_id: str, video_id: str, source_id: str, segment_text: str):
        """Extrae conocimiento de un segmento y lo almacena en la base de datos."""
        prompt = f"Analiza la siguiente transcripción de un trader de opciones:\n\n{segment_text}"
        data = self.call_gemini(prompt)
        if not data:
            return

        # 1. Procesar Estrategias y Reglas
        for strat in data.get("strategies", []):
            try:
                # Upsert de estrategia canónica
                strat_record = {
                    "name": strat["name"],
                    "underlying": strat.get("underlying", "SPY"),
                    "direction": strat.get("direction", "CALL"),
                    "primary_timeframe": strat.get("timeframe", "5m"),
                    "nature": strat.get("nature", "STANDARD_CONSENSUS"),
                    "description": strat.get("description", ""),
                    "lifecycle_status": "STRUCTURED",
                    "evidence_level": "E0"
                }
                res = self.sb.table("eti_strategies").upsert(strat_record, on_conflict="name").execute()
                strategy_uuid = res.data[0]["id"]

                # Crear versión inmutable
                version_record = {
                    "strategy_id": strategy_uuid,
                    "version_number": 1,
                    "dsl_definition": strat,
                    "hash": str(hash(json.dumps(strat, sort_keys=True))),
                    "is_active": True
                }
                v_res = self.sb.table("eti_strategy_versions").upsert(version_record, on_conflict="strategy_id,version_number").execute()
                version_uuid = v_res.data[0]["id"]

                # Insertar Reglas
                for rule in strat.get("rules", []):
                    rule_record = {
                        "strategy_version_id": version_uuid,
                        "rule_type": rule.get("rule_type", "ENTRY_TRIGGER"),
                        "rule_nature": rule.get("rule_nature", "STANDARD_CONSENSUS"),
                        "condition_code": rule.get("condition_code", "GENERIC_CONDITION"),
                        "parameters": rule.get("parameters", {}),
                        "activation_context": rule.get("activation_context", {}),
                        "source_author_id": source_id
                    }
                    self.sb.table("eti_strategy_rules").insert(rule_record).execute()

            except Exception as e:
                print(f"Error persistiendo estrategia: {e}")

        # 2. Procesar Operaciones Relatadas (Para Vía A: Replay)
        for op in data.get("operations", []):
            try:
                op_record = {
                    "source_id": source_id,
                    "video_id": video_id,
                    "segment_id": segment_id,
                    "underlying": op.get("underlying", "SPY"),
                    "contract_type": op.get("contract_type", "CALL"),
                    "strike": op.get("strike"),
                    "dte": op.get("dte", 0),
                    "declared_entry_premium": op.get("declared_entry_premium"),
                    "declared_exit_premium": op.get("declared_exit_premium"),
                    "declared_pnl_usd": op.get("declared_pnl_usd"),
                    "claim_type": op.get("claim_type", "RECAP_CLAIM"),
                    "unknown_fields": op.get("unknown_fields", [])
                }
                self.sb.table("eti_operations").insert(op_record).execute()
                print(f"Operación declarada persistida: {op_record['underlying']} {op_record['contract_type']}")
            except Exception as e:
                print(f"Error persistiendo operación: {e}")


if __name__ == "__main__":
    print("Probando extractor de IA con Gemini...")
    extractor = AIKnowledgeExtractorService()
    sample_text = (
        "Hoy operamos SPY en apertura. Esperé a las 9:45 AM a que el precio confirmara por encima de VWAP. "
        "Cuando la EMA 9 cruzó al alza la EMA 20, compré 10 contratos Call strike 565 con vencimiento hoy 0DTE "
        "a 1.20 dólares. Puse mi stop loss técnico en el mínimo de la vela de 5 minutos, arriesgando 15% de la prima. "
        "Salí en $1.85 cuando tocó la resistencia previa, sacando $650 de profit neto."
    )
    result = extractor.call_gemini(sample_text)
    print("Extracción estructurada generada por Gemini:")
    print(json.dumps(result, indent=2))
