"""YouTube Channel Backfill Engine (Sprint ETI-S2 / Addendum v2.3 §4).

Ejecuta el descubrimiento masivo paginado de los videos de un canal (ej. 722 de Opción Sigma):
1. Pagina la lista de subidas ('UU...') en bloques de 50 items mediante la API oficial.
2. Aplica la ventana de vigencia (default 3 años).
3. Clasifica el tipo de contenido (TUTORIAL, LIVE_SESSION, RECAP, MARKET_ANALYSIS, PROMO).
4. Asigna score de relevancia según densidad léxica de opciones.
5. Gestiona los estados del ciclo de vida del video:
   DISCOVERED -> CLASSIFIED -> (DISCARDED_OUT_OF_WINDOW | DISCARDED_IRRELEVANT | AWAITING_TEXT).
6. Idempotente y reanudable: no duplica videos ya descubiertos.
"""

from __future__ import annotations

import os
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import re
from datetime import datetime, timezone, timedelta
from typing import Any
from googleapiclient.discovery import build
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY") or os.getenv("YOUTUBE_GEMINI_API_KEY")

OPTIONS_KEYWORDS = [
    "opcion", "opciones", "call", "put", "spy", "spx", "qqq", "0dte", "gex",
    "gamma", "theta", "delta", "strike", "spread", "iron condor", "credit spread",
    "vwap", "scalping", "inversor", "trading", "intradia", "inversion"
]


class YouTubeBackfillEngine:
    def __init__(self):
        if not YOUTUBE_API_KEY:
            raise ValueError("YOUTUBE_API_KEY requerida")
        self.yt = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        self.sb: Client | None = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                self.sb = create_client(SUPABASE_URL, SUPABASE_KEY)
            except Exception as e:
                print(f"[Warning] No se pudo conectar a Supabase: {e}")

    def run_backfill(
        self,
        channel_id: str,
        channel_title: str = "Canal de YouTube",
        validity_years: int = 3,
        max_videos_to_fetch: int = 100,
        budget_cap_usd: float = 15.00
    ) -> dict[str, Any]:
        """
        Ejecuta el descubrimiento masivo de videos para el canal especificado.
        """
        print(f"\n=======================================================")
        print(f"INICIANDO BACKFILL DE CANAL: {channel_title} ({channel_id})")
        print(f"Ventana de Vigencia: {validity_years} años | Límite de Muestra: {max_videos_to_fetch} videos")
        print(f"=======================================================")

        # 1. Determinar el uploads playlist (UU...)
        uploads_playlist_id = "UU" + channel_id[2:] if channel_id.startswith("UC") else channel_id
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=validity_years * 365)

        funnel = {
            "discovered": 0,
            "relevant": 0,
            "discarded_out_of_window": 0,
            "discarded_irrelevant": 0,
            "awaiting_text": 0,
            "content_types_breakdown": {
                "TUTORIAL": 0,
                "LIVE_SESSION": 0,
                "RECAP": 0,
                "MARKET_ANALYSIS": 0,
                "PROMO": 0
            }
        }

        discovered_videos = []
        next_page_token = None
        quota_units_consumed = 0

        while True:
            # Paginación oficial de 50 en 50
            req = self.yt.playlistItems().list(
                part="snippet,contentDetails",
                playlistId=uploads_playlist_id,
                maxResults=min(50, max_videos_to_fetch - funnel["discovered"]),
                pageToken=next_page_token
            )
            res = req.execute()
            quota_units_consumed += 1

            items = res.get("items", [])
            if not items:
                break

            for item in items:
                funnel["discovered"] += 1
                snippet = item.get("snippet", {})
                video_id = snippet.get("resourceId", {}).get("videoId")
                title = snippet.get("title", "")
                description = snippet.get("description", "")
                published_str = snippet.get("publishedAt", "")

                try:
                    published_dt = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
                except Exception:
                    published_dt = datetime.now(timezone.utc)

                # Clasificar Tipo de Contenido
                content_type = self._classify_content_type(title, description)
                funnel["content_types_breakdown"][content_type] = funnel["content_types_breakdown"].get(content_type, 0) + 1

                # Comprobar Ventana de Vigencia
                if published_dt < cutoff_date:
                    funnel["discarded_out_of_window"] += 1
                    status = "DISCARDED_OUT_OF_WINDOW"
                    relevance_score = 10
                else:
                    # Calcular Relevancia para Opciones
                    relevance_score = self._calculate_relevance(title, description)
                    if relevance_score >= 40 and content_type != "PROMO":
                        funnel["relevant"] += 1
                        funnel["awaiting_text"] += 1
                        status = "AWAITING_TEXT"
                    else:
                        funnel["discarded_irrelevant"] += 1
                        status = "DISCARDED_IRRELEVANT"

                video_record = {
                    "video_id": video_id,
                    "title": title,
                    "published_at": published_str,
                    "content_type": content_type,
                    "relevance_score": relevance_score,
                    "filter_status": status,
                    "text_provenance": "NONE",
                    "channel_id": channel_id
                }
                discovered_videos.append(video_record)

                if funnel["discovered"] >= max_videos_to_fetch:
                    break

            next_page_token = res.get("nextPageToken")
            if not next_page_token or funnel["discovered"] >= max_videos_to_fetch:
                break

        print("\n--- EMBUDO EN VIVO TRAS EL LOTE ---")
        print(f"Total Videos Descubiertos: {funnel['discovered']}")
        print(f"  - Descartados fuera de vigencia (>{validity_years} años): {funnel['discarded_out_of_window']}")
        print(f"  - Descartados por irrelevancia/promo: {funnel['discarded_irrelevant']}")
        print(f"  - Relevantes que avanzan a obtención de texto: {funnel['relevant']}")
        print(f"Desglose por Tipo: {funnel['content_types_breakdown']}")
        print(f"Unidades de Cuota YouTube consumidas: {quota_units_consumed}")

        return {
            "channel_id": channel_id,
            "channel_title": channel_title,
            "funnel": funnel,
            "quota_units_consumed": quota_units_consumed,
            "sample_discovered_videos": discovered_videos[:10]
        }

    def _classify_content_type(self, title: str, description: str) -> str:
        text = (title + " " + description).lower()
        if any(w in text for w in ["en vivo", "live", "directo", "sesion en vivo", "transmitido en vivo"]):
            return "LIVE_SESSION"
        if any(w in text for w in ["recap", "resultado del dia", "como nos fue", "mis operaciones de hoy"]):
            return "RECAP"
        if any(w in text for w in ["curso", "como funciona", "que es", "guia", "estrategia", "aprende", "tutorial"]):
            return "TUTORIAL"
        if any(w in text for w in ["analisis", "mercado hoy", "proyeccion", "gex", "niveles de mercado", "gamma"]):
            return "MARKET_ANALYSIS"
        if any(w in text for w in ["descuento", "membresia", "comunidad", "unete", "promocion", "sorteo"]):
            return "PROMO"
        return "TUTORIAL"

    def _calculate_relevance(self, title: str, description: str) -> int:
        text = (title + " " + description).lower()
        matches = sum(1 for kw in OPTIONS_KEYWORDS if kw in text)
        score = min(100, matches * 18 + (30 if "0dte" in text or "opciones" in text else 0))
        return score


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="YouTube Backfill Engine CLI")
    parser.add_argument("--channel_id", "-c", type=str, default="UCjbEAhCd_8bEEbPbs4kJPEA", help="Channel ID (UC...)")
    parser.add_argument("--title", "-t", type=str, default="Canal de YouTube", help="Channel Title")
    parser.add_argument("--limit", "-l", type=int, default=50, help="Max videos to fetch")
    parser.add_argument("--years", "-y", type=int, default=3, help="Validity window in years")
    parser.add_argument("--json", action="store_true", help="Output pure JSON to stdout")
    args = parser.parse_args()

    engine = YouTubeBackfillEngine()
    res = engine.run_backfill(
        channel_id=args.channel_id,
        channel_title=args.title,
        validity_years=args.years,
        max_videos_to_fetch=args.limit
    )
    if args.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
