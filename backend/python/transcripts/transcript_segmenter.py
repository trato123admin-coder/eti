"""Transcript Access & Semantic Segmenter (L3 Chunking).
Sprint: ETI-S3

Obtiene subtítulos y transcripciones autorizadas mediante interfaces permitidas,
segmenta el texto preservando marcas de tiempo (start_seconds, end_seconds)
y filtra los fragmentos que discuten operativa real de opciones.
"""

from __future__ import annotations

import os
import re
from typing import Any
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from supabase import create_client, Client
from youtube_transcript_api import YouTubeTranscriptApi

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

OPTIONS_TOPIC_REGEX = {
    "OPTIONS_ENTRY": r"\b(call|put|strike|contrato|entré|compré|fill|breakout|vwap|cruza|cruce|in)\b",
    "STOP_LOSS": r"\b(stop|salida|invalida|corte|riesgo|pérdida|sl|risk)\b",
    "TAKE_PROFIT": r"\b(profit|ganancia|target|tome|cerré|tp|scalp|salí)\b",
    "RECAP_TRADE": r"\b(operé|hice|hoy operamos|resultado|gané|perdí|p&l|trade recap)\b",
    "MARKET_REGIME": r"\b(tendencia|rango|volatilidad|iv|gex|gamma|gap|premarket|apertura)\b"
}


class TranscriptSegmenterService:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Credenciales de Supabase no disponibles")
        self.sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.yt_api = YouTubeTranscriptApi()

    def get_transcript_for_video(self, video_id: str, languages=("es", "en")) -> list[dict[str, Any]] | None:
        """Obtiene subtítulos del video preservando marcas de tiempo."""
        try:
            transcript = self.yt_api.fetch(video_id, languages=languages)
            snippets = []
            for item in transcript.snippets:
                snippets.append({
                    "text": item.text,
                    "start": int(getattr(item, "start", 0)),
                    "duration": int(getattr(item, "duration", 0))
                })
            return snippets
        except Exception as e:
            print(f"No se pudieron obtener subtítulos para {video_id}: {e}")
            return None

    def segment_and_filter(self, video_uuid: str, raw_snippets: list[dict[str, Any]], chunk_window_sec: int = 90) -> list[dict[str, Any]]:
        """
        Agrupa snippets en chunks con ventana deslizante y detecta temas operativos de opciones.
        Guarda en eti_video_segments solo los fragmentos relevantes.
        """
        if not raw_snippets:
            return []

        segments = []
        current_chunk = []
        chunk_start = raw_snippets[0]["start"]

        for snip in raw_snippets:
            current_chunk.append(snip["text"])
            chunk_end = snip["start"] + snip["duration"]

            # Si el bloque supera la ventana temporal
            if (chunk_end - chunk_start) >= chunk_window_sec:
                chunk_text = " ".join(current_chunk)
                topic = self._classify_topic(chunk_text)

                if topic != "IRRELEVANT":
                    segments.append({
                        "video_id": video_uuid,
                        "start_seconds": chunk_start,
                        "end_seconds": chunk_end,
                        "topic": topic,
                        "summary": chunk_text[:280] + ("..." if len(chunk_text) > 280 else ""),
                        "text_sample": chunk_text,
                        "confidence": 0.85
                    })

                current_chunk = []
                chunk_start = chunk_end

        # Procesar último bloque
        if current_chunk:
            chunk_text = " ".join(current_chunk)
            topic = self._classify_topic(chunk_text)
            if topic != "IRRELEVANT":
                segments.append({
                    "video_id": video_uuid,
                    "start_seconds": chunk_start,
                    "end_seconds": raw_snippets[-1]["start"] + raw_snippets[-1]["duration"],
                    "topic": topic,
                    "summary": chunk_text[:280] + ("..." if len(chunk_text) > 280 else ""),
                    "text_sample": chunk_text,
                    "confidence": 0.80
                })

        return segments

    def _classify_topic(self, text: str) -> str:
        """Determina el tema principal del segmento o lo descarta si es irrelevante."""
        text_lower = text.lower()
        topic_scores = {}

        for topic, pattern in OPTIONS_TOPIC_REGEX.items():
            matches = len(re.findall(pattern, text_lower))
            if matches > 0:
                topic_scores[topic] = matches

        if not topic_scores:
            return "IRRELEVANT"

        # Retorna el tópico con mayor densidad
        return max(topic_scores, key=topic_scores.get)

    def persist_segments(self, segments: list[dict[str, Any]]):
        """Guarda los segmentos relevantes en eti_video_segments."""
        for seg in segments:
            try:
                self.sb.table("eti_video_segments").insert(seg).execute()
            except Exception as e:
                print(f"Error insertando segmento: {e}")
