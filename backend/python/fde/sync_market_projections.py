import os
import sys
import json
import urllib.request
from datetime import datetime, timezone
from dotenv import load_dotenv

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env.local"))
load_dotenv(ENV_PATH)

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
sb = create_client(SUPABASE_URL, SUPABASE_KEY) if (SUPABASE_URL and SUPABASE_KEY) else None

def sync_projections():
    url = "http://localhost:3001/api/eti/v1/market/projections"
    try:
        with urllib.request.urlopen(url, timeout=5) as res:
            data = json.loads(res.read().decode())
    except Exception as e:
        print(f"Error consultando Fastify engine: {e}")
        return

    # 1. Guardar archivo local en disco para el Robot eTrade
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engine", "src", "data"))
    os.makedirs(target_dir, exist_ok=True)
    target_file = os.path.join(target_dir, "market_projections.json")

    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✓ Snapshot persistido en disco: {target_file}")

    # 2. Persistir en Supabase dentro de eti_fde_system_states
    if sb:
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            state_record = {
                "macro_regime": "DECELERATION",
                "system_coherence_index": 0.88,
                "directional_bias": "BEARISH",
                "expected_spx_open_action": "PUT_MOMENTUM_BREAKDOWN",
                "primary_driver_node": "YIELD_10Y",
                "shock_intensity": 0.72,
                "recommended_strategy": "YOEL_CPI_VOLATILITY_BREAKDOWN_PUT",
                "aduana_gate_action": "ALLOW_PUTS_ONLY",
                "state_payload": {
                    "type": "SINGLE_STOCK_PROJECTIONS_SNAPSHOT",
                    "projections": data.get("projections", []),
                    "timestamp": now_iso
                }
            }
            sb.table("eti_fde_system_states").insert(state_record).execute()
            print("✓ Proyecciones de acciones sincronizadas en Supabase (eti_fde_system_states).")
        except Exception as e:
            print(f"Error sincronizando en Supabase: {e}")

if __name__ == "__main__":
    sync_projections()
