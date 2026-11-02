"""Direct YouTube Caption Fetcher with HTML parser fallback.
Sprint: ETI-S4C / Addendum v2.3

Permite extraer subtítulos directamente desde los metadatos de la página de YouTube
cuando youtube_transcript_api sufre rate limiting o bloqueos de IP.
"""

import urllib.request
import json
import re
import xml.etree.ElementTree as ET
from typing import Optional, List, Dict

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
}

def fetch_direct_transcript(video_id: str) -> Optional[List[Dict[str, str]]]:
    """Descarga los fragmentos de transcripción parseando el timedtext oficial de YouTube."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        # Buscar captionTracks
        match = re.search(r'"captionTracks":(\[.*?\])', html)
        if not match:
            return None

        tracks = json.loads(match.group(1))
        if not tracks:
            return None

        # Preferir español, o el primer track disponible
        selected_track = tracks[0]
        for t in tracks:
            if t.get("languageCode", "").startswith("es"):
                selected_track = t
                break

        track_url = selected_track["baseUrl"]
        # Solicitar en formato xml estándar
        track_req = urllib.request.Request(track_url, headers=HEADERS)
        with urllib.request.urlopen(track_req, timeout=12) as t_resp:
            xml_data = t_resp.read().decode("utf-8", errors="ignore")

        root = ET.fromstring(xml_data)
        segments = []
        for elem in root.findall(".//text"):
            text = elem.text or ""
            start = float(elem.attrib.get("start", 0.0))
            dur = float(elem.attrib.get("dur", 0.0))
            if text.strip():
                # Reemplazar entidades HTML comunes
                text = text.replace("&#39;", "'").replace("&quot;", '"').replace("&amp;", "&")
                segments.append({
                    "start": start,
                    "duration": dur,
                    "text": text.strip()
                })

        return segments
    except Exception as e:
        print(f"Error descargando subtitulo directo para {video_id}: {e}")
        return None

if __name__ == "__main__":
    vid = "Kz9Pn7spZqI"
    segs = fetch_direct_transcript(vid)
    if segs:
        print(f"SUCCESS! {len(segs)} fragmentos extraídos de {vid}")
        print("Muestra:", " ".join(s["text"] for s in segs[:10]))
    else:
        print(f"Fallo al obtener subtítulos para {vid}")
