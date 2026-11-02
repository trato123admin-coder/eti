import os
import sys
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from googleapiclient.discovery import build

YT_KEY = os.getenv("YOUTUBE_API_KEY")
if not YT_KEY:
    print("ERROR: YOUTUBE_API_KEY no encontrada")
    sys.exit(1)

yt = build("youtube", "v3", developerKey=YT_KEY)

channels = [
    ("Yoel Sardiñas", "UCza3Q6Oo2jFgmu9UZpXYUwQ"),
    ("Opción Sigma", "UCjbEAhCd_8bEEbPbs4kJPEA"),
    ("John Carter / Simpler", "UCukKZsfpQOkj3_L47VbvvSg")
]

for name, ch_id in channels:
    uploads_id = "UU" + ch_id[2:]
    try:
        res = yt.playlistItems().list(
            part="snippet",
            playlistId=uploads_id,
            maxResults=5
        ).execute()
        print(f"=== {name} (Uploads: {uploads_id}) ===")
        for item in res.get("items", []):
            snip = item["snippet"]
            pub = snip.get("publishedAt", "")
            title = snip.get("title", "")
            print(f"  [{pub}] {title}")
    except Exception as e:
        print(f"Error consultando {name}: {e}")
