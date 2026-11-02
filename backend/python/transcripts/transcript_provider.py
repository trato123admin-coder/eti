"""TranscriptProvider Interface & UserUploadProvider (Sprint ETI-S3 / Addendum v2.3 §3).

Desacopla la obtención de texto del origen del video mediante un contrato formal:
1. UserUploadProvider: Carga masiva de subtítulos (.srt, .vtt, .txt, .json) o pegado directo.
2. Emparejamiento automático por Video ID en el nombre de archivo o título difuso.
3. Cola priorizada de texto pendiente: ordena los videos que esperan texto por valor esperado
   para que el usuario aporte primero los Top 30 con mayor densidad de reglas.
4. Glosario de dominio financiero para normalizar términos de opciones.
"""

from __future__ import annotations

import os
import re
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)


@dataclass
class TranscriptSegment:
    start_seconds: float
    duration_seconds: float
    text: str


@dataclass
class TranscriptResult:
    video_id: str
    full_text: str
    segments: list[TranscriptSegment]
    language: str = "es"
    confidence: float = 1.00
    provenance: str = "USER_PROVIDED" # 'USER_PROVIDED', 'OFFICIAL_CAPTION'
    word_count: int = 0
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# -----------------------------------------------------------------------------
# Glosario de Dominio Financiero (Normalización de Opciones)
# -----------------------------------------------------------------------------
GLOSSARY_REPLACEMENTS = [
    (r"\b(cero\s+dte|0\s+dte|zero\s+dte|cero\s+de\s+te\s+e)\b", "0DTE"),
    (r"\b(s\s*px|sp\s*x|espe\s*equis)\b", "SPX"),
    (r"\b(s\s*py|sp\s*y|espe\s*i)\b", "SPY"),
    (r"\b(q\s*q\s*q|cu\s*cu\s*cu|triple\s*q)\b", "QQQ"),
    (r"\b(g\s*ex|ge\s*x|gamma\s*exposure)\b", "GEX"),
    (r"\b(v\s*wap|uve\s*wap|b\s*wap)\b", "VWAP"),
    (r"\b(manines|money\s*ness)\b", "Moneyness"),
    (r"\b(at\s*the\s*money|en\s*el\s*dinero)\b", "ATM"),
    (r"\b(out\s*of\s*the\s*money|fuera\s*del\s*dinero)\b", "OTM"),
    (r"\b(in\s*the\s*money|dentro\s*del\s*dinero)\b", "ITM"),
]


def normalize_with_glossary(text: str) -> str:
    """Aplica el glosario de dominio para corregir errores de fonética de transcripciones."""
    normalized = text
    for pattern, replacement in GLOSSARY_REPLACEMENTS:
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
    return normalized


# -----------------------------------------------------------------------------
# Contrato Formal TranscriptProvider
# -----------------------------------------------------------------------------
class TranscriptProvider(ABC):
    @abstractmethod
    def get_text(self, video_id: str) -> TranscriptResult | None:
        """Obtiene el texto con timestamps para un video dado."""
        pass


# -----------------------------------------------------------------------------
# Proveedor 1: Carga Masiva por el Usuario (UserUploadProvider)
# -----------------------------------------------------------------------------
class UserUploadProvider(TranscriptProvider):
    def __init__(self):
        self.uploaded_transcripts: dict[str, TranscriptResult] = {}

    def get_text(self, video_id: str) -> TranscriptResult | None:
        return self.uploaded_transcripts.get(video_id)

    def ingest_srt_content(self, video_id: str, srt_content: str, language: str = "es") -> TranscriptResult:
        """Parsea contenido en formato SRT estándar y genera los tramos con timestamps."""
        segments: list[TranscriptSegment] = []
        raw_blocks = srt_content.strip().split("\n\n")

        full_text_parts = []
        for block in raw_blocks:
            lines = [line.strip() for line in block.split("\n") if line.strip()]
            if len(lines) >= 3:
                # Línea 1: Número de secuencia
                # Línea 2: Timestamps (ej. 00:01:20,000 --> 00:01:25,500)
                time_line = lines[1]
                time_match = re.search(r"(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})", time_line)
                if time_match:
                    start_sec = self._parse_timestamp_to_seconds(time_match.group(1))
                    end_sec = self._parse_timestamp_to_seconds(time_match.group(2))
                    dur_sec = max(0.5, end_sec - start_sec)
                    text = " ".join(lines[2:])
                    text = normalize_with_glossary(text)
                    segments.append(TranscriptSegment(start_seconds=start_sec, duration_seconds=dur_sec, text=text))
                    full_text_parts.append(text)

        full_text = " ".join(full_text_parts)
        result = TranscriptResult(
            video_id=video_id,
            full_text=full_text,
            segments=segments,
            language=language,
            confidence=0.95,
            provenance="USER_PROVIDED",
            word_count=len(full_text.split())
        )
        self.uploaded_transcripts[video_id] = result
        return result

    def match_file_to_video_id(self, file_name: str, discovered_videos: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Empareja automáticamente un archivo (.srt/.vtt) con un video:
        1. Si contiene el video_id (11 caracteres alfanuméricos).
        2. Si el nombre coincide de forma difusa con el título.
        """
        clean_name = os.path.splitext(file_name)[0]

        # 1. Búsqueda de Video ID directo en el nombre separando por delimitadores
        potential_ids = [t for t in re.split(r"[^a-zA-Z0-9\-]", clean_name) if len(t) == 11]
        for cand_id in potential_ids:
            for v in discovered_videos:
                if v.get("video_id") == cand_id:
                    return {
                        "matched": True,
                        "video_id": cand_id,
                        "title": v.get("title"),
                        "method": "EXACT_VIDEO_ID",
                        "confidence": 1.00
                    }

        # 2. Búsqueda por coincidencia de palabras del título
        best_match = None
        best_score = 0.0
        words_in_filename = set(re.findall(r"\w+", clean_name.lower()))

        for v in discovered_videos:
            title_words = set(re.findall(r"\w+", v.get("title", "").lower()))
            if not title_words:
                continue
            intersection = words_in_filename.intersection(title_words)
            score = len(intersection) / float(len(title_words))
            if score > best_score and score >= 0.40:
                best_score = score
                best_match = v

        if best_match:
            return {
                "matched": True,
                "video_id": best_match.get("video_id"),
                "title": best_match.get("title"),
                "method": "TITLE_FUZZY",
                "confidence": round(best_score, 2)
            }

        return {"matched": False, "method": "UNMATCHED", "confidence": 0.0}

    def _parse_timestamp_to_seconds(self, ts_str: str) -> float:
        clean = ts_str.replace(",", ".")
        parts = clean.split(":")
        h = float(parts[0])
        m = float(parts[1])
        s = float(parts[2])
        return h * 3600.0 + m * 60.0 + s


# -----------------------------------------------------------------------------
# Cola Priorizada de Texto Pendiente (§3.3)
# -----------------------------------------------------------------------------
def get_prioritized_pending_queue(videos: list[dict[str, Any]], top_n: int = 30) -> list[dict[str, Any]]:
    """
    Ordena los videos que están en estado 'AWAITING_TEXT' por valor esperado:
    - Prioridad: TUTORIAL (1.3x) > LIVE_SESSION (1.0x) > RECAP (0.9x)
    - Relevancia calculada
    - Recencia
    """
    pending = [v for v in videos if v.get("filter_status") == "AWAITING_TEXT"]

    def calculate_priority_score(v: dict[str, Any]) -> float:
        base_rel = float(v.get("relevance_score", 50))
        ctype = v.get("content_type", "TUTORIAL")
        multiplier = 1.3 if ctype == "TUTORIAL" else (1.1 if ctype == "LIVE_SESSION" else 0.9)
        return base_rel * multiplier

    pending.sort(key=calculate_priority_score, reverse=True)
    return pending[:top_n]


if __name__ == "__main__":
    provider = UserUploadProvider()
    
    # Simular emparejamiento con video de Opción Sigma
    mock_videos = [
        {"video_id": "ABC123xyz89", "title": "Estrategia 0DTE en SPX con Niveles GEX en Vivo", "filter_status": "AWAITING_TEXT", "relevance_score": 90, "content_type": "LIVE_SESSION"},
        {"video_id": "TUT999abc11", "title": "Como Operar Opciones CALL y PUT desde Cero Tutorial", "filter_status": "AWAITING_TEXT", "relevance_score": 85, "content_type": "TUTORIAL"}
    ]

    match_res = provider.match_file_to_video_id("opcion_sigma_ABC123xyz89.srt", mock_videos)
    print("=================================================================")
    print(f"TEST EMPAREJAMIENTO DE SUBTÍTULO: Matched={match_res['matched']} | ID={match_res.get('video_id')} | Método={match_res.get('method')}")

    # Simular parseo de subtítulo SRT con glosario
    sample_srt = """1
00:00:05,000 --> 00:00:10,000
Bienvenidos hoy vamos a ver una estrategia cero dte en s px con uve wap.

2
00:00:10,500 --> 00:00:15,000
Esperamos el cruce de del tas sobre g ex wall para comprar calls at the money.
"""
    res = provider.ingest_srt_content("ABC123xyz89", sample_srt)
    print(f"\nTexto normalizado con glosario financiero:")
    print(f"'{res.full_text}'")
    print(f"Tramos parseados: {len(res.segments)} tramos | Palabras: {res.word_count}")
    print("=================================================================")
