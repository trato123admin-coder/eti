import os
import sys
from datetime import datetime
from dotenv import load_dotenv

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from googleapiclient.discovery import build

YT_KEY = os.getenv("YOUTUBE_API_KEY")
yt = build("youtube", "v3", developerKey=YT_KEY)

CHANNELS = [
    {
        "name": "Yoel Sardiñas",
        "channel_id": "UCza3Q6Oo2jFgmu9UZpXYUwQ",
        "uploads_id": "UUza3Q6Oo2jFgmu9UZpXYUwQ",
        "source_id": "6c4d8e4f-8669-4de0-8253-17007aa232fc"
    },
    {
        "name": "Opción Sigma",
        "channel_id": "UCjbEAhCd_8bEEbPbs4kJPEA",
        "uploads_id": "UUjbEAhCd_8bEEbPbs4kJPEA",
        "source_id": "e1b5d486-bdac-4ed4-b23c-273d35ab7e0f"
    },
    {
        "name": "John Carter / Simpler",
        "channel_id": "UCukKZsfpQOkj3_L47VbvvSg",
        "uploads_id": "UUukKZsfpQOkj3_L47VbvvSg",
        "source_id": "f31b5792-839a-46f6-beee-0fc3b55eacd6"
    }
]

START_DATE = "2025-07-01T00:00:00Z"
END_DATE = "2025-12-31T23:59:59Z"

print(f"Buscando videos entre {START_DATE[:10]} y {END_DATE[:10]}...")

results = {}

for ch in CHANNELS:
    name = ch["name"]
    uploads_id = ch["uploads_id"]
    matched_videos = []
    next_page_token = None
    stop_channel = False
    pages = 0

    print(f"\nExplorando {name}...")

    while not stop_channel and pages < 15:
        pages += 1
        kwargs = {
            "part": "snippet,contentDetails",
            "playlistId": uploads_id,
            "maxResults": 50
        }
        if next_page_token:
            kwargs["pageToken"] = next_page_token

        try:
            res = yt.playlistItems().list(**kwargs).execute()
        except Exception as e:
            print(f"  Error en API: {e}")
            break

        items = res.get("items", [])
        if not items:
            break

        for item in items:
            snip = item["snippet"]
            pub = snip.get("publishedAt", "")
            vid_id = item["contentDetails"]["videoId"]
            title = snip.get("title", "")

            if pub > END_DATE:
                # Video más reciente que la ventana (ej. 2026), seguir avanzando hacia atrás
                continue
            elif pub >= START_DATE:
                # Video DENTRO del 2do Semestre 2025
                matched_videos.append({
                    "video_id": vid_id,
                    "title": title,
                    "published_at": pub,
                    "url": f"https://www.youtube.com/watch?v={vid_id}"
                })
            else:
                # Ya llegamos a videos anteriores al 1 de Julio de 2025 (ej. Junio 2025)
                # Como la lista de uploads está ordenada descendentemente, podemos parar
                stop_channel = True
                break

        next_page_token = res.get("nextPageToken")
        if not next_page_token:
            break

    results[name] = matched_videos
    print(f"  ✓ {name}: Encontrados {len(matched_videos)} videos en 2025-S2 (examinadas {pages} páginas).")

print("\n--- RESUMEN SEMESTRE 2 (2025) ---")
total_all = 0
for name, vids in results.items():
    print(f"{name}: {len(vids)} videos")
    total_all += len(vids)
    for v in vids[:2]:
        print(f"   - [{v['published_at'][:10]}] {v['title'][:60]}")
print(f"TOTAL: {total_all} videos listos para procesar.")
