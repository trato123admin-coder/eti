"""YouTube Metadata Collector & Smart Content Filtering Engine (L1).
Sprint: ETI-S2

Descubre videos de 5 canales de opciones sobre índices de EE.UU. (SPY/QQQ/SPX),
aplica el filtro de relevancia por metadatos (título, descripción, tags) y
descarta contenido irrelevante antes de solicitar transcripciones pesadas.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from typing import Any
import re
from dotenv import load_dotenv

# Cargar variables de .env.local
ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# -----------------------------------------------------------------------------
# Taxonomía y Diccionario de Palabras Clave para Filtro Inteligente L1
# -----------------------------------------------------------------------------
HIGH_PRIORITY_KEYWORDS = [
    r"\bspy\b", r"\bqqq\b", r"\bspx\b", r"\b0dte\b", r"\boptions\b", r"\bopciones\b",
    r"\bcall\b", r"\bput\b", r"\bcalls\b", r"\bputs\b", r"\bvwap\b", r"\bema\b",
    r"\bbreakout\b", r"\bgap\b", r"\bgamma\b", r"\bgex\b", r"\biv\b", r"\bimplied volatility\b",
    r"\blive trading\b", r"\brecap\b", r"\bday trade\b", r"\bday trading\b", r"\bscalping\b",
    r"\border blocks\b", r"\bfvg\b", r"\bliquidity\b", r"\brisk management\b", r"\bstop loss\b"
]

EXCLUSION_KEYWORDS = [
    r"\bvlog\b", r"\blifestyle\b", r"\bviaje\b", r"\btravel\b", r"\bmi nuevo auto\b",
    r"\bgym\b", r"\brutina\b", r"\bmotivation\b", r"\bshorts\b", r"\breel\b",
    r"\bcrypto mining\b", r"\bmemecoin\b", r"\bforex broker review\b"
]


def compute_l1_relevance_score(title: str, description: str) -> tuple[float, str]:
    """Calcula el score de relevancia L1 (0-100) y determina el motivo si es descartado."""
    text = f"{title} {description}".lower()

    # 1. Chequeo de exclusión directa
    for ex_pattern in EXCLUSION_KEYWORDS:
        if re.search(ex_pattern, text):
            return 10.0, f"Excluido por contenido ajeno o de entretenimiento ({ex_pattern})"

    # 2. Conteo de coincidencias clave
    matches = 0
    matched_terms = []
    for kw in HIGH_PRIORITY_KEYWORDS:
        if re.search(kw, text):
            matches += 1
            matched_terms.append(kw.replace(r"\b", ""))

    # 3. Ponderación por presencia en título
    title_matches = sum(1 for kw in HIGH_PRIORITY_KEYWORDS if re.search(kw, title.lower()))

    # Score base: 20 pts por coincidencia en título, 8 pts por descripción
    score = min(100.0, (title_matches * 25.0) + (matches * 8.0))

    if score >= 70.0:
        reason = f"Alta relevancia para opciones intradía ({', '.join(matched_terms[:4])})"
    elif score >= 40.0:
        reason = f"Relevancia moderada ({', '.join(matched_terms[:3])})"
    else:
        reason = "Puntaje insuficiente: no contiene suficientes términos operativos de opciones"

    return round(score, 2), reason


class YouTubeCollectorService:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Credenciales de Supabase no disponibles")
        self.sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def register_pilot_channels(self, channels: list[dict[str, Any]]):
        """Registra los 5 canales de YouTube arquetípicos en eti_sources."""
        for ch in channels:
            data = {
                "platform": "YOUTUBE",
                "channel_id": ch["channel_id"],
                "channel_title": ch["channel_title"],
                "channel_url": ch["channel_url"],
                "description": ch.get("description", ""),
                "trader_archetype": ch.get("trader_archetype", "MOMENTUM_SCALPER"),
                "priority_weight": ch.get("priority_weight", 1.0),
                "is_active": True,
            }
            try:
                self.sb.table("eti_sources").upsert(data, on_conflict="channel_id").execute()
                print(f"Canal registrado: {ch['channel_title']} ({ch['trader_archetype']})")
            except Exception as e:
                print(f"Error registrando canal {ch['channel_title']}: {e}")

    def evaluate_and_index_video(self, source_id: str, video_data: dict[str, Any]):
        """Evalúa un video descubierto con el filtro L1 y lo persiste en eti_videos."""
        score, reason = compute_l1_relevance_score(video_data["title"], video_data.get("description", ""))
        status = "TRANSCRIPT_PENDING" if score >= 70.0 else "FILTER_REJECTED"

        record = {
            "source_id": source_id,
            "external_video_id": video_data["video_id"],
            "title": video_data["title"],
            "description": video_data.get("description", ""),
            "published_at": video_data["published_at"],
            "duration_seconds": video_data.get("duration_seconds", 0),
            "video_url": f"https://www.youtube.com/watch?v={video_data['video_id']}",
            "relevance_score": score,
            "processing_status": status,
            "discard_reason": reason if status == "FILTER_REJECTED" else None,
        }

        try:
            self.sb.table("eti_videos").upsert(record, on_conflict="external_video_id").execute()
            print(f"Video {video_data['video_id']} evaluado: Score {score} -> {status}")
        except Exception as e:
            print(f"Error indexando video {video_data['video_id']}: {e}")


# Canales Arquetípicos Iniciales para Opciones
SAMPLE_5_CHANNELS = [
    {
        "channel_id": "UC_YT01_MOMENTUM_SCALPER",
        "channel_title": "Scalping & Momentum Options",
        "channel_url": "https://www.youtube.com/@ScalpingOptionsTrader",
        "trader_archetype": "MOMENTUM_SCALPER",
        "description": "Trading intradía en SPY y QQQ con 0DTE y cruces de VWAP y EMA 9/20."
    },
    {
        "channel_id": "UC_YT02_SMART_MONEY_LEVELS",
        "channel_title": "Institutional Levels & Liquidity",
        "channel_url": "https://www.youtube.com/@SmartMoneyOptions",
        "trader_archetype": "SMART_MONEY",
        "description": "Operativa institucional de opciones basada en Order Blocks y FVG."
    },
    {
        "channel_id": "UC_YT03_GEX_OPTIONS_FLOW",
        "channel_title": "Gamma Exposure & Unusual Flow",
        "channel_url": "https://www.youtube.com/@GammaFlowTrading",
        "trader_archetype": "GEX_FLOW",
        "description": "Estrategias de volatilidad, niveles GEX y flujo inusual de contratos."
    },
    {
        "channel_id": "UC_YT04_MEAN_REVERSION_GAPS",
        "channel_title": "Gap Fade & Statistical Mean Reversion",
        "channel_url": "https://www.youtube.com/@GapFadeOptions",
        "trader_archetype": "MEAN_REVERSION",
        "description": "Desvanecimiento de gaps de apertura y extremos estadísticos con opciones."
    },
    {
        "channel_id": "UC_YT05_RISK_MANAGEMENT_SPREADS",
        "channel_title": "Asymmetric Spreads & Risk Management",
        "channel_url": "https://www.youtube.com/@OptionsRiskMaster",
        "trader_archetype": "RISK_SPREADS",
        "description": "Gestión de capital, credit spreads y control estricto de drawdown."
    }
]

if __name__ == "__main__":
    print("Iniciando colector de metadatos de YouTube...")
    collector = YouTubeCollectorService()
    collector.register_pilot_channels(SAMPLE_5_CHANNELS)
