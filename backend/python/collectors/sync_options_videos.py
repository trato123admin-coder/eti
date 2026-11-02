"""Sincronizador de Videos de Opciones Reales desde YouTube.
Sprint: ETI-S2 (Knowledge Discovery & Filtering L1)

Busca videos relevantes de trading de opciones (SPY, QQQ, SPX, 0DTE)
utilizando la YouTube Data API v3 verificada, aplica el filtro L1 de metadatos
y persiste los canales en `eti_sources` y los videos en `eti_videos` de Supabase.
"""

from __future__ import annotations

import os
import json
import urllib.request
import urllib.parse
from datetime import datetime
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from supabase import create_client, Client
from youtube_metadata_collector import compute_l1_relevance_score

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
YT_KEY = os.getenv("YOUTUBE_API_KEY")

QUERIES_OPCIONES = [
    ("SPY 0DTE options live trade recap", "MOMENTUM_SCALPER"),
    ("SPY options VWAP 9 EMA day trading strategy", "PRICE_ACTION"),
    ("Options trading gamma exposure GEX flow SPX", "GEX_FLOW"),
    ("Options day trading order blocks fair value gap SPY", "SMART_MONEY"),
    ("SPY options credit spread risk management", "RISK_SPREADS")
]


def sync_real_options_videos(max_per_query: int = 5):
    if not SUPABASE_URL or not SUPABASE_KEY or not YT_KEY:
        print("Error: Variables de entorno incompletas en .env.local")
        return

    sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    total_indexed = 0
    total_discarded = 0

    print("=== INICIANDO DESCUBRIMIENTO REAL EN YOUTUBE (ETI-S2) ===")

    for query, archetype in QUERIES_OPCIONES:
        print(f"\nBuscando: '{query}' [Arquetipo: {archetype}]...")
        url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={urllib.parse.quote(query)}&type=video&maxResults={max_per_query}&key={YT_KEY}"

        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                items = data.get("items", [])
                print(f"  -> Encontrados {len(items)} videos.")

                for it in items:
                    snippet = it["snippet"]
                    ch_id = snippet["channelId"]
                    ch_title = snippet["channelTitle"]
                    vid_id = it["id"]["videoId"]
                    title = snippet["title"]
                    desc = snippet.get("description", "")
                    pub_at = snippet.get("publishedAt", datetime.utcnow().isoformat())

                    # 1. Registrar o actualizar Canal en eti_sources
                    source_payload = {
                        "platform": "YOUTUBE",
                        "channel_id": ch_id,
                        "channel_title": ch_title,
                        "channel_url": f"https://www.youtube.com/channel/{ch_id}",
                        "description": f"Canal de opciones enfocado en {archetype}",
                        "trader_archetype": archetype,
                        "is_active": True,
                        "last_synced_at": datetime.utcnow().isoformat()
                    }
                    s_res = sb.table("eti_sources").upsert(source_payload, on_conflict="channel_id").execute()
                    source_uuid = s_res.data[0]["id"]

                    # 2. Evaluar Filtro Inteligente L1
                    score, reason = compute_l1_relevance_score(title, desc)
                    status = "TRANSCRIPT_PENDING" if score >= 60.0 else "FILTER_REJECTED"

                    video_payload = {
                        "source_id": source_uuid,
                        "external_video_id": vid_id,
                        "title": title,
                        "description": desc,
                        "published_at": pub_at,
                        "video_url": f"https://www.youtube.com/watch?v={vid_id}",
                        "relevance_score": score,
                        "processing_status": status,
                        "discard_reason": reason if status == "FILTER_REJECTED" else None,
                        "metadata": {"search_query": query, "archetype": archetype}
                    }

                    sb.table("eti_videos").upsert(video_payload, on_conflict="external_video_id").execute()

                    if status == "TRANSCRIPT_PENDING":
                        total_indexed += 1
                        print(f"    [ACEPTADO - Score {score}] {ch_title}: {title[:55]}...")
                    else:
                        total_discarded += 1
                        print(f"    [DESCARTADO - Score {score}] {title[:55]}... ({reason})")

        except Exception as e:
            print(f"Error procesando query '{query}': {e}")

    print("\n=== RESUMEN DE LA SINCRONIZACIÓN L1 ===")
    print(f"Videos Relevantes para Análisis de Opciones (Score >= 60): {total_indexed}")
    print(f"Videos Descartados por Filtro Inteligente: {total_discarded}")


if __name__ == "__main__":
    sync_real_options_videos(max_per_query=4)
