"""Ingestion Estimator & Dry Run Calculator (Sprint ETI-S2 / Addendum v2.3 §2.4).

Calcula la estimación previa transparente de costes, cuotas de API y tiempos
antes de que el usuario confirme el lanzamiento del backfill de un canal.
"""

from __future__ import annotations

import math
from typing import Any


def calculate_dry_run_estimate(
    total_videos: int,
    validity_window_years: int = 3,
    avg_minutes_per_video: float = 22.0,
    llm_cost_per_million_tokens: float = 0.075 # Tarifa de Gemini 3.5 Flash
) -> dict[str, Any]:
    """
    Calcula una estimación matemática fundamentada del proceso de backfill.
    """
    # 1. Proyección de videos que superan la ventana de vigencia (ej. últimos 3 años)
    # Típicamente los últimos 3 años representan entre el 35% y el 45% del catálogo histórico
    retention_ratio = min(1.0, (validity_window_years / 7.0))
    estimated_relevant_videos = math.ceil(total_videos * retention_ratio * 0.75) # 75% pasan filtro de opciones

    # 2. Horas y tokens estimados
    total_hours = round((estimated_relevant_videos * avg_minutes_per_video) / 60.0, 1)
    
    # 1 minuto de habla = ~150 palabras = ~200 tokens
    # Un video de 22 min = ~4,400 tokens de transcripción + ~6,000 tokens de prompt de extracción = ~10,400 tokens
    tokens_per_video = int(avg_minutes_per_video * 200 + 6000)
    estimated_tokens_input = estimated_relevant_videos * tokens_per_video
    
    # 3. Coste estimado en USD
    estimated_cost_usd = round((estimated_tokens_input / 1_000_000.0) * llm_cost_per_million_tokens, 2)
    estimated_cost_usd = max(0.10, estimated_cost_usd) # Mínimo $0.10 USD

    # 4. Consumo de Cuota de YouTube Data API v3
    # Paginación de uploads playlist en bloques de 50 = ceil(total_videos / 50) llamadas playlistItems.list
    # Cada llamada = 1 unidad de cuota (de 10,000 unidades diarias disponibles por defecto)
    quota_units_discovery = math.ceil(total_videos / 50.0) + 2 # +2 para canal y uploads playlist

    # 5. Duración estimada del backfill de metadatos (a 1 seg por página de 50 videos)
    duration_minutes = math.ceil(quota_units_discovery * 1.5 / 60.0) + 1

    return {
        "channel_total_videos": total_videos,
        "validity_window_years": validity_window_years,
        "estimated_relevant_videos": estimated_relevant_videos,
        "estimated_total_hours": total_hours,
        "estimated_tokens_input": estimated_tokens_input,
        "estimated_cost_usd": estimated_cost_usd,
        "estimated_youtube_quota_units": quota_units_discovery,
        "youtube_daily_quota_pct": round((quota_units_discovery / 10000.0) * 100.0, 2),
        "estimated_duration_minutes": duration_minutes,
        "formula_assumptions": {
            "avg_video_minutes": avg_minutes_per_video,
            "tokens_per_video": tokens_per_video,
            "llm_model": "Gemini 3.5 Flash",
            "llm_rate_usd_per_1m": llm_cost_per_million_tokens,
            "youtube_quota_limit": 10000
        }
    }


if __name__ == "__main__":
    est = calculate_dry_run_estimate(722, validity_window_years=3)
    print("=================================================================")
    print("ESTIMACIÓN DRY RUN PREVIA PARA CANAL DE 722 VIDEOS (OPCIÓN SIGMA):")
    print(f"- Videos dentro de ventana ({est['validity_window_years']} años): ~{est['estimated_relevant_videos']} videos")
    print(f"- Horas estimadas de contenido relevante: ~{est['estimated_total_hours']} horas")
    print(f"- Tokens totales proyectados: ~{est['estimated_tokens_input']:,} tokens")
    print(f"- Costo proyectado en USD: ${est['estimated_cost_usd']} USD (con Gemini 3.5 Flash)")
    print(f"- Consumo de cuota YouTube: {est['estimated_youtube_quota_units']} unidades ({est['youtube_daily_quota_pct']}% del cupo diario de 10,000)")
    print(f"- Tiempo estimado de descubrimiento: ~{est['estimated_duration_minutes']} minutos")
    print("=================================================================")
