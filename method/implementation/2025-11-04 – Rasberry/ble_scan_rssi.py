#!/usr/bin/env python3
import sys, asyncio
# --- Windows: event loop policy (Python 3.13) ---
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import time, math, csv, os, json
from collections import defaultdict, deque
from bleak import BleakScanner

# ============ CONFIG GÉNÉRALE ============
LOG_CSV = os.path.expanduser("~/ble_multi_rssi_log.csv")  # "" pour désactiver
SMOOTH_WINDOW = 5                                         # médiane glissante par adresse
PATH_LOSS_EXP_DEFAULT = 2.2                               # 2.0–3.0 selon l’environnement
TX_POWER_DEFAULT = -49                                    # fallback si non défini côté user
ADAPTER_LINUX = "hci0"                                    # ignoré sur Windows
DISCOVERY_FILTER = {"Transport": "le", "DuplicateData": True}
# =========================================

# -------- Registre utilisateurs ----------

DEFAULT_USERS = [
    {
        "id": "user1",
        "label": "King375",
        "name": "King375",                       # match par nom (advertising name)
        "service_uuid": "",                      # ex: "12345678-1234-5678-1234-56789abcdef0"
        "manuf_id": None,                        # ex: 0xFFFF
        "manuf_prefix_hex": "",                  # ex: "4645454C" (ASCII "FEEL")
        "tx_power": -49,                         # calibré à 1 m pour CE device
        "path_loss_exp": 2.2                     # optionnel, sinon fallback global
    },
    # Pattern Ajout de User par défaut
    # {
    #   "id": "user2",
    #   "label": "FeelView",
    #   "name": "FeelView",
    #   "service_uuid": "12345678-1234-5678-1234-56789abcdef0",
    #   "manuf_id": 0xFFFF,
    #   "manuf_prefix_hex": "4645454C",
    #   "tx_power": -52,
    #   "path_loss_exp": 2.4
    # }
]

def load_users():
    """Charge users depuis users.json si présent, sinon DEFAULT_USERS."""
    path = os.path.expanduser("~/users.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("users", DEFAULT_USERS)
    return DEFAULT_USERS

USERS = load_users()

# Pre-compute structures
for u in USERS:
    u.setdefault("id", u.get("label", u.get("name", "unknown")))
    u.setdefault("label", u["id"])
    u.setdefault("tx_power", TX_POWER_DEFAULT)
    u.setdefault("path_loss_exp", PATH_LOSS_EXP_DEFAULT)
    # bytes du prefixe manufacturer
    mp = (u.get("manuf_prefix_hex") or "").strip()
    u["_manuf_prefix_bytes"] = bytes.fromhex(mp) if mp else b""
    # normalisation uuid
    su = (u.get("service_uuid") or "").strip()
    u["_service_uuid_lower"] = su.lower()

def rssi_to_distance(rssi, tx_power, n):
    return 10 ** ((tx_power - rssi) / (10.0 * n))

def adv_matches_user(name: str, adv, user: dict) -> bool:
    """Retourne True si l’advertisement matche ce user via l’un des critères renseignés."""
    # 1) Nom exact
    if user.get("name"):
        if name and name.lower() == user["name"].lower():
            return True

    # 2) Service UUID
    if user.get("_service_uuid_lower"):
        uuids = adv.service_uuids or []
        for u in uuids:
            if u and u.lower() == user["_service_uuid_lower"]:
                return True

    # 3) Manufacturer Data
    if user.get("manuf_id") is not None:
        payload = (adv.manufacturer_data or {}).get(int(user["manuf_id"]))
        if payload is not None:
            prefix = user["_manuf_prefix_bytes"]
            if not prefix or (bytes(payload).startswith(prefix)):
                return True

    # Si aucun critère défini : on ne matche pas
    return False

# Buffers lissage: par (user_id, adresse_aléatoire) dès que on reconnait du RSSI
buffers = defaultdict(lambda: deque(maxlen=SMOOTH_WINDOW))

# Mapping adresse : dernier user_id reconnu (utile si plusieurs pub matchent)
last_addr_user = {}

# CSV
csv_writer = None
csv_file = None
if LOG_CSV:
    new = not os.path.exists(LOG_CSV)
    csv_file = open(LOG_CSV, "a", newline="", encoding="utf-8")
    csv_writer = csv.writer(csv_file)
    if new:
        csv_writer.writerow([
            "time_iso","user_id","user_label","address","name",
            "rssi_dbm","rssi_median_dbm","dist_m","dist_median_m"
        ])

def on_adv(dev, adv):
    if adv.rssi is None:
        return

    name = adv.local_name or dev.name or ""
    matched_user = None
    for user in USERS:
        if adv_matches_user(name, adv, user):
            matched_user = user
            break

    if not matched_user:
        return  # pub ignorée (pas un user connu)

    user_id = matched_user["id"]
    label = matched_user["label"]
    tx = matched_user.get("tx_power", TX_POWER_DEFAULT)
    n = matched_user.get("path_loss_exp", PATH_LOSS_EXP_DEFAULT)

    addr = dev.address
    key = (user_id, addr)
    q = buffers[key]
    q.append(adv.rssi)

    rssi_now = adv.rssi
    dist_now = rssi_to_distance(rssi_now, tx, n)
    rssi_med = sorted(q)[len(q)//2]
    dist_med = rssi_to_distance(rssi_med, tx, n)
    last_addr_user[addr] = user_id

    ts_h = time.strftime("%H:%M:%S")
    print(
        f"{ts_h} | {label:10s} | {addr:17s} | {name:12s} | "
        f"RSSI {rssi_now:4d} dBm (med {rssi_med:4d}) | "
        f"≈ {dist_now:5.2f} m (med {dist_med:5.2f} m)"
    )

    if csv_writer:
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        csv_writer.writerow([
            ts, user_id, label, addr, name,
            rssi_now, rssi_med,
            f"{dist_now:.3f}", f"{dist_med:.3f}"
        ])

async def main():
    print("🔍 BLE multi-users (Ctrl+C pour arrêter)")
    print("Utilisateurs chargés :")
    for u in USERS:
        crit = []
        if u.get("name"): crit.append(f"name='{u['name']}'")
        if u.get("_service_uuid_lower"): crit.append(f"uuid={u['service_uuid']}")
        if u.get("manuf_id") is not None:
            sfx = f", prefix={u.get('manuf_prefix_hex','')}" if u.get('manuf_prefix_hex') else ""
            crit.append(f"manuf=0x{int(u['manuf_id']):04X}{sfx}")
        print(f" • {u['id']} ({u['label']}): " + ("; ".join(crit) or "(aucun critère)"))
    print()

    scanner_kwargs = dict(
        detection_callback=on_adv,
        discovery_filter=DISCOVERY_FILTER,
    )
    # Adapter uniquement sous Linux
    if not sys.platform.startswith("win"):
        scanner_kwargs["adapter"] = ADAPTER_LINUX

    scanner = BleakScanner(**scanner_kwargs)
    await scanner.start()
    try:
        while True:
            await asyncio.sleep(1.0)
    except KeyboardInterrupt:
        pass
    finally:
        await scanner.stop()
        if csv_file:
            csv_file.close()
        print("\n🛑 Scan arrêté.")

if __name__ == "__main__":
    asyncio.run(main())
