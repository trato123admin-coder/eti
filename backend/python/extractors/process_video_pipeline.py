"""Pipeline End-to-End: Transcripción -> Segmentación L3 -> Extracción IA (ETI-S3 & S4).

Toma los videos en estado 'TRANSCRIPT_PENDING', obtiene los subtítulos con marcas de tiempo,
filtra los bloques sobre opciones intradía, ejecuta la extracción con Gemini (gemini-3.8-flash)
y persiste estrategias, reglas (estándar vs excepciones) y operaciones relatadas.
"""

from __future__ import annotations

import os
import sys
import json
import time
import urllib.request
from datetime import datetime

# Asegurar encoding UTF-8 en consola de Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from supabase import create_client, Client
from youtube_transcript_api import YouTubeTranscriptApi

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("YOUTUBE_GEMINI_API_KEY")

EXTRACTION_SYSTEM_PROMPT = """Eres el analista cuantitativo de eTrade Trading Intelligence (ETI).
Analiza el siguiente segmento de video de un trader de opciones sobre SPY/QQQ/SPX y extrae conocimiento operativo en JSON estricto.

REGLAS OBLIGATORIAS:
1. No inventes: Si no se dice un dato, usa null y agrégalo a unknown_fields.
2. Distingue reglas:
   - STANDARD_CONSENSUS: Reglas universales de confluencia (ej. esperar VWAP, cruces EMA, control de pérdidas).
   - UNIQUE_EXCEPTION: Reglas de nicho o setups específicos del autor (ej. overrides de scalping 0DTE, desvanecimiento de gaps).
3. Distingue tipo de afirmación: EXPLICIT_RULE, INFERRED_RULE, RECAP_CLAIM, LIVE_CLAIM.
4. Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "strategies": [
    {
      "name": "SPY_0DTE_MOMENTUM_VWAP",
      "underlying": "SPY",
      "direction": "CALL",
      "timeframe": "1m",
      "nature": "STANDARD_CONSENSUS",
      "description": "...",
      "rules": [
        {
          "rule_type": "ENTRY_TRIGGER",
          "rule_nature": "STANDARD_CONSENSUS",
          "condition_code": "PRICE_ABOVE_VWAP",
          "parameters": {},
          "activation_context": {}
        }
      ]
    }
  ],
  "operations": [
    {
      "underlying": "SPY",
      "contract_type": "CALL",
      "strike": null,
      "dte": 0,
      "declared_entry_premium": 1.85,
      "declared_exit_premium": null,
      "declared_pnl_usd": null,
      "claim_type": "RECAP_CLAIM",
      "unknown_fields": ["strike", "declared_pnl_usd"]
    }
  ]
}
"""


def call_gemini(prompt: str) -> dict | None:
    models_to_try = [
        "models/gemini-3.5-flash",
        "models/gemini-3.7-flash",
        "models/gemini-3.8-flash",
        "models/gemini-flash-latest"
    ]
    payload = {
        "contents": [
            {"parts": [{"text": EXTRACTION_SYSTEM_PROMPT}, {"text": prompt}]}
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }
    data_bytes = json.dumps(payload).encode("utf-8")

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={GEMINI_KEY}"
        req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
        except Exception as e:
            print(f"   [Reintento] {model}: {e}")
            time.sleep(1)
    return None


def run_pipeline_for_video(video_row: dict, sb: Client, yt_api: YouTubeTranscriptApi):
    vid_id = video_row["external_video_id"]
    vid_uuid = video_row["id"]
    source_uuid = video_row["source_id"]
    title = video_row["title"]

    print(f"\n==================================================")
    print(f"PROCESANDO VIDEO: {title}")
    print(f"YouTube ID: {vid_id} (UUID: {vid_uuid})")
    print(f"==================================================")

    # 1. Obtener subtítulos oficiales
    try:
        transcript = yt_api.fetch(vid_id, languages=["en", "es"])
        snippets = transcript.snippets
        print(f"1. Transcripción obtenida con éxito ({len(snippets)} fragmentos)")
    except Exception as e:
        print(f"Error obteniendo transcripción: {e}")
        sb.table("eti_videos").update({"processing_status": "ERROR", "discard_reason": str(e)}).eq("id", vid_uuid).execute()
        return

    # 2. Segmentación Semántica L3 (Ventana de 120 segundos)
    current_texts = []
    chunk_start = snippets[0].start
    operative_chunks = []

    for snip in snippets:
        current_texts.append(snip.text)
        chunk_end = snip.start + snip.duration
        if (chunk_end - chunk_start) >= 120:
            full_text = " ".join(current_texts)
            operative_chunks.append({
                "start": chunk_start,
                "end": chunk_end,
                "text": full_text
            })
            current_texts = []
            chunk_start = chunk_end

    print(f"2. Generados {len(operative_chunks)} segmentos semánticos L3.")

    # 3. Guardar segmentos y procesar con Gemini
    total_strategies = 0
    total_operations = 0

    for i, chunk in enumerate(operative_chunks[:3]): # Procesar los primeros 3 bloques clave
        seg_record = {
            "video_id": vid_uuid,
            "start_seconds": int(chunk["start"]),
            "end_seconds": int(chunk["end"]),
            "topic": "OPTIONS_ENTRY",
            "summary": chunk["text"][:280] + "...",
            "text_sample": chunk["text"],
            "confidence": 0.90
        }
        seg_res = sb.table("eti_video_segments").insert(seg_record).execute()
        seg_uuid = seg_res.data[0]["id"]

        print(f"\n3. Analizando segmento {i+1} ({chunk['start']}s - {chunk['end']}s) con Gemini...")
        time.sleep(3)
        extracted_data = call_gemini(chunk["text"])

        if not extracted_data:
            print("   -> No se obtuvo respuesta de Gemini.")
            continue

        # A. Guardar Estrategias y Reglas
        for st in extracted_data.get("strategies", []):
            try:
                strat_name = st.get("name", f"STRAT_{vid_id}_{i}")
                raw_dir = str(st.get("direction") or "BOTH").upper()
                norm_dir = raw_dir if raw_dir in ('CALL', 'PUT', 'BOTH', 'NEUTRAL') else 'BOTH'

                strat_res = sb.table("eti_strategies").upsert({
                    "name": strat_name,
                    "underlying": st.get("underlying") or "SPY",
                    "direction": norm_dir,
                    "primary_timeframe": st.get("timeframe") or "5m",
                    "nature": st.get("nature") or "STANDARD_CONSENSUS",
                    "description": st.get("description", ""),
                    "lifecycle_status": "STRUCTURED",
                    "evidence_level": "E0"
                }, on_conflict="name").execute()
                strat_uuid = strat_res.data[0]["id"]

                # Versión
                ver_res = sb.table("eti_strategy_versions").upsert({
                    "strategy_id": strat_uuid,
                    "version_number": 1,
                    "dsl_definition": st,
                    "hash": str(hash(json.dumps(st, sort_keys=True))),
                    "is_active": True
                }, on_conflict="strategy_id,version_number").execute()
                ver_uuid = ver_res.data[0]["id"]

                # Reglas
                ALLOWED_RULE_TYPES = {'ENTRY_TRIGGER', 'CONFIRMATION', 'INVALIDATION', 'STOP_LOSS', 'TAKE_PROFIT', 'GATE_CONDITION'}
                for r in st.get("rules", []):
                    raw_type = str(r.get("rule_type", "ENTRY_TRIGGER")).upper()
                    if raw_type in ("ANALYSIS_FILTER", "FILTER", "PRECONDITION", "GATE"):
                        norm_type = "GATE_CONDITION"
                    elif raw_type in ALLOWED_RULE_TYPES:
                        norm_type = raw_type
                    else:
                        norm_type = "CONFIRMATION"

                    raw_nature = str(r.get("rule_nature", "STANDARD_CONSENSUS")).upper()
                    norm_nature = "UNIQUE_EXCEPTION" if "EXCEPTION" in raw_nature else "STANDARD_CONSENSUS"

                    sb.table("eti_strategy_rules").insert({
                        "strategy_version_id": ver_uuid,
                        "rule_type": norm_type,
                        "rule_nature": norm_nature,
                        "condition_code": r.get("condition_code", "GENERIC_TRIGGER"),
                        "parameters": r.get("parameters", {}),
                        "activation_context": r.get("activation_context", {}),
                        "source_author_id": source_uuid
                    }).execute()

                # Evidencia
                sb.table("eti_evidence").insert({
                    "strategy_id": strat_uuid,
                    "evidence_level": "E0",
                    "source_id": source_uuid,
                    "video_id": vid_uuid,
                    "segment_id": seg_uuid,
                    "description": f"Extracción de regla en YouTube {vid_id} a los {chunk['start']}s",
                    "metrics": {"start_seconds": chunk["start"], "end_seconds": chunk["end"]}
                }).execute()

                total_strategies += 1
                print(f"   [ESTRATEGIA IDENTIFICADA] {strat_name} ({st.get('nature')})")
            except Exception as e:
                print(f"   Error guardando estrategia: {e}")

        # B. Guardar Operaciones Declaradas (Vía A: Replay)
        for op in extracted_data.get("operations", []):
            try:
                sb.table("eti_operations").insert({
                    "source_id": source_uuid,
                    "video_id": vid_uuid,
                    "segment_id": seg_uuid,
                    "underlying": op.get("underlying", "SPY"),
                    "contract_type": op.get("contract_type", "CALL"),
                    "strike": op.get("strike"),
                    "dte": op.get("dte", 0),
                    "declared_entry_premium": op.get("declared_entry_premium"),
                    "declared_exit_premium": op.get("declared_exit_premium"),
                    "declared_pnl_usd": op.get("declared_pnl_usd"),
                    "claim_type": op.get("claim_type", "RECAP_CLAIM"),
                    "unknown_fields": op.get("unknown_fields", [])
                }).execute()
                total_operations += 1
                print(f"   [OPERACIÓN DECLARADA] {op.get('underlying')} {op.get('contract_type')} @ Premium: {op.get('declared_entry_premium')}")
            except Exception as e:
                print(f"   Error guardando operación: {e}")

    # 4. Actualizar estado del video a EXTRACTED
    sb.table("eti_videos").update({
        "processing_status": "EXTRACTED"
    }).eq("id", vid_uuid).execute()

    print(f"\nRESULTADO DEL PIPELINE PARA {vid_id}:")
    print(f"- Estrategias registradas: {total_strategies}")
    print(f"- Operaciones declaradas extraídas: {total_operations}")
    print(f"- Estado de video: EXTRACTED")


if __name__ == "__main__":
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    yt_api = YouTubeTranscriptApi()

    # Consultar todos los videos pendientes de opciones
    res = sb.table("eti_videos").select("*").eq("processing_status", "TRANSCRIPT_PENDING").order("relevance_score", desc=True).limit(8).execute()
    pending_videos = res.data or []
    print(f"=== INICIANDO PROCESAMIENTO EN LOTE ({len(pending_videos)} videos pendientes) ===")

    for idx, video in enumerate(pending_videos):
        print(f"\n>>> Video {idx+1}/{len(pending_videos)}: {video['title'][:60]}")
        run_pipeline_for_video(video, sb, yt_api)
        time.sleep(2)

    print("\n=== PROCESAMIENTO EN LOTE COMPLETADO ===")
