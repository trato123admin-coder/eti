"""YouTube Source Resolver (Sprint ETI-S2 / Addendum v2.3 §2).

Resuelve de forma robusta cualquier formato de entrada del usuario hacia un channel_id verificado:
- @handle (ej. @OPCIONSIGMA)
- ID directo de canal (UC...)
- URL completa de canal, video o lista de reproducción
- Nombre o búsqueda libre (ej. 'Gala Trades', 'Luis Hernan Silva') con retorno de candidatos interactivos.

Garantía: NUNCA registra una Fuente sin channel_id oficial verificado por la API de YouTube.
"""

from __future__ import annotations

import os
import re
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from typing import Any
from googleapiclient.discovery import build
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY") or os.getenv("YOUTUBE_GEMINI_API_KEY")


class SourceResolver:
    def __init__(self, api_key: str | None = YOUTUBE_API_KEY):
        if not api_key:
            raise ValueError("YOUTUBE_API_KEY no encontrada en .env.local")
        self.yt = build("youtube", "v3", developerKey=api_key)

    def resolve(self, input_query: str) -> dict[str, Any]:
        """
        Analiza el input y resuelve al channel_id oficial con su ficha de metadatos.
        Si es una búsqueda ambigua, retorna los candidatos más probables.
        """
        clean_input = input_query.strip()
        sys.stderr.write(f"\n[SourceResolver] Analizando entrada: '{clean_input}'...\n")

        # 1. Detectar si es un @handle (ej. @OPCIONSIGMA o youtube.com/@OPCIONSIGMA)
        handle_match = re.search(r"@([a-zA-Z0-9_\-\.]+)", clean_input)
        if handle_match:
            handle = handle_match.group(1)
            return self._resolve_by_handle(handle)

        # 2. Detectar si es un channel_id directo (UC...)
        chan_match = re.search(r"(UC[a-zA-Z0-9_\-]{22})", clean_input)
        if chan_match:
            channel_id = chan_match.group(1)
            return self._resolve_by_channel_id(channel_id)

        # 3. Detectar si es URL de video (youtube.com/watch?v=... o youtu.be/...)
        video_match = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_\-]{11})", clean_input)
        if video_match:
            video_id = video_match.group(1)
            return self._resolve_by_video_id(video_id)

        # 4. En cualquier otro caso: Búsqueda por Nombre / Texto libre
        return self._search_channel_candidates(clean_input)

    def _resolve_by_handle(self, handle: str) -> dict[str, Any]:
        """Resuelve mediante la llamada oficial channels.list(forHandle=...)."""
        clean_handle = handle.lstrip("@")
        try:
            res = self.yt.channels().list(
                part="snippet,contentDetails,statistics",
                forHandle=clean_handle
            ).execute()

            items = res.get("items", [])
            if not items:
                # Fallback: búsqueda por handle si forHandle falla
                return self._search_channel_candidates(f"@{clean_handle}")

            item = items[0]
            return self._format_channel_record(item, resolution_type="HANDLE", handle=f"@{clean_handle}")
        except Exception as e:
            sys.stderr.write(f"[SourceResolver Error] Fallo al resolver handle @{clean_handle}: {e}\n")
            return self._search_channel_candidates(clean_handle)

    def _resolve_by_channel_id(self, channel_id: str) -> dict[str, Any]:
        """Resuelve directamente por ID."""
        res = self.yt.channels().list(
            part="snippet,contentDetails,statistics",
            id=channel_id
        ).execute()

        items = res.get("items", [])
        if not items:
            return {"status": "NOT_FOUND", "message": f"Canal no encontrado para el ID {channel_id}"}

        item = items[0]
        return self._format_channel_record(item, resolution_type="CHANNEL_ID")

    def _resolve_by_video_id(self, video_id: str) -> dict[str, Any]:
        """Obtiene el canal propietario de un video dado."""
        res = self.yt.videos().list(part="snippet", id=video_id).execute()
        items = res.get("items", [])
        if not items:
            return {"status": "NOT_FOUND", "message": f"Video {video_id} no encontrado"}

        channel_id = items[0]["snippet"]["channelId"]
        return self._resolve_by_channel_id(channel_id)

    def _search_channel_candidates(self, query: str) -> dict[str, Any]:
        """Busca candidatos en YouTube para que el usuario confirme (ej. Gala Trades)."""
        sys.stderr.write(f"[SourceResolver] Buscando candidatos para: '{query}'...\n")
        res = self.yt.search().list(
            part="snippet",
            q=query,
            type="channel",
            maxResults=5
        ).execute()

        candidates = []
        channel_ids = [item["snippet"]["channelId"] for item in res.get("items", [])]

        if not channel_ids:
            return {"status": "NO_CANDIDATES", "query": query, "candidates": []}

        # Obtener estadísticas de los candidatos
        chan_details = self.yt.channels().list(
            part="snippet,statistics",
            id=",".join(channel_ids)
        ).execute().get("items", [])

        for c in chan_details:
            snippet = c.get("snippet", {})
            stats = c.get("statistics", {})
            candidates.append({
                "channel_id": c["id"],
                "title": snippet.get("title"),
                "handle": snippet.get("customUrl"),
                "description": snippet.get("description", "")[:180] + "...",
                "thumbnail_url": snippet.get("thumbnails", {}).get("default", {}).get("url"),
                "video_count": int(stats.get("videoCount", 0)),
                "subscriber_count": int(stats.get("subscriberCount", 0))
            })

        # Si hay un candidato exacto obvio
        is_exact = len(candidates) == 1 or (len(candidates) > 0 and candidates[0]["video_count"] > 50)

        return {
            "status": "CANDIDATES_FOUND",
            "resolution_type": "SEARCH_QUERY",
            "is_exact_match": is_exact,
            "best_match": candidates[0] if candidates else None,
            "candidates": candidates
        }

    def _format_channel_record(self, item: dict[str, Any], resolution_type: str, handle: str | None = None) -> dict[str, Any]:
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        content_details = item.get("contentDetails", {})

        uploads_playlist_id = content_details.get("relatedPlaylists", {}).get("uploads")
        if not uploads_playlist_id:
            # En YouTube, el uploads playlist es cambiar 'UC' por 'UU' en el channel_id
            chan_id = item["id"]
            uploads_playlist_id = "UU" + chan_id[2:] if chan_id.startswith("UC") else None

        return {
            "status": "RESOLVED_VERIFIED",
            "resolution_type": resolution_type,
            "channel_id": item["id"],
            "title": snippet.get("title"),
            "handle": handle or snippet.get("customUrl"),
            "description": snippet.get("description", ""),
            "country": snippet.get("country", "ES/US"),
            "published_at": snippet.get("publishedAt"),
            "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url"),
            "uploads_playlist_id": uploads_playlist_id,
            "video_count": int(stats.get("videoCount", 0)),
            "subscriber_count": int(stats.get("subscriberCount", 0)),
            "view_count": int(stats.get("viewCount", 0)),
            "custom_url": snippet.get("customUrl")
        }


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="YouTube Source Resolver CLI")
    parser.add_argument("--query", "-q", type=str, help="Handle, channel ID, URL o término de búsqueda")
    args = parser.parse_args()

    resolver = SourceResolver()
    if args.query:
        result = resolver.resolve(args.query)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        # 1. Probar con Opción Sigma (@OPCIONSIGMA)
        res_opcion = resolver.resolve("https://www.youtube.com/@OPCIONSIGMA/videos")
        print(f"\n[Test Opción Sigma]: ID Verificado={res_opcion.get('channel_id')} | Título='{res_opcion.get('title')}' | Videos={res_opcion.get('video_count')}")

        # 2. Probar con Gala Trades (búsqueda de candidatos)
        res_gala = resolver.resolve("Gala Trades options")
        print(f"\n[Test Gala Trades]: Status={res_gala.get('status')} | Candidatos={len(res_gala.get('candidates', []))}")
        if res_gala.get("candidates"):
            c = res_gala["candidates"][0]
            print(f"   Mejor candidato: {c['title']} ({c['channel_id']}) con {c['video_count']} videos")
