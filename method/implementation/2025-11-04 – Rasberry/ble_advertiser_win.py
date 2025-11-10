#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys, asyncio
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os, time, json, csv, pickle
from collections import defaultdict, deque
from statistics import median
from argparse import ArgumentParser
from bleak import BleakScanner

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_JSON_PATH = os.path.join(BASE_DIR, "users.json")
CALIB_PKL_PATH  = os.path.join(BASE_DIR, "ble_calib.pkl")
LOG_CSV         = os.path.join(BASE_DIR, "ble_multi_rssi_log.csv")

SMOOTH_WINDOW = 7
EMA_ALPHA = 0.25
OUTLIER_MAD_K = 2.5
PATH_LOSS_EXP_DEFAULT = 2.2
TX_POWER_DEFAULT = -49
DISCOVERY_FILTER = {"Transport":"le", "DuplicateData": True}
ADAPTER_LINUX = "hci0"

ZONES = [
    (8.0, 12.0, "Vous arrivez à la faculté d'informatique"),
    (6.0,  8.0, "Approche du site — vibration faible"),
    (4.0,  6.0, "Vibration moyenne"),
    (2.0,  4.0, "Vibreur fort"),
    (1.0,  2.0, "Vous êtes devant la faculté d'informatique. La porte est devant vous, elle s’ouvre en la poussant (porte double)")
]
ZONE_STICKY_K = 3
ZONE_MIN_REPEAT_S = 20.0

DEFAULT_USERS = [{
    "id": "user1",
    "label": "King375",
    "name": "King375",
    "service_uuid": "",
    "manuf_id": None,
    "manuf_prefix_hex": "",
    "tx_power": TX_POWER_DEFAULT,
    "path_loss_exp": PATH_LOSS_EXP_DEFAULT
}]

def load_users():
    if os.path.exists(USERS_JSON_PATH):
        try:
            with open(USERS_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            users = data.get("users", DEFAULT_USERS)
            if users:
                return users
        except Exception:
            pass
    return DEFAULT_USERS

def load_calib_overrides():
    if os.path.exists(CALIB_PKL_PATH):
        try:
            with open(CALIB_PKL_PATH, "rb") as f:
                obj = pickle.load(f)
            if isinstance(obj, dict):
                obj.setdefault("by_name", {})
                obj.setdefault("by_id", {})
                return obj
        except Exception:
            pass
    return {"by_name": {}, "by_id": {}}

def save_calib_overrides(overrides):
    with open(CALIB_PKL_PATH, "wb") as f:
        pickle.dump(overrides, f)
    print(f"💾 Calibration enregistrée dans {CALIB_PKL_PATH}")

USERS = load_users()
CAL_OVR = load_calib_overrides()

for u in USERS:
    u.setdefault("id", u.get("label", u.get("name", "unknown")))
    u.setdefault("label", u["id"])
    u.setdefault("tx_power", TX_POWER_DEFAULT)
    u.setdefault("path_loss_exp", PATH_LOSS_EXP_DEFAULT)
    mp = (u.get("manuf_prefix_hex") or "").strip()
    u["_manuf_prefix_bytes"] = bytes.fromhex(mp) if mp else b""
    su = (u.get("service_uuid") or "").strip()
    u["_service_uuid_lower"] = su.lower()
    if u["id"] in CAL_OVR["by_id"]:
        u["tx_power"] = CAL_OVR["by_id"][u["id"]]
    elif u.get("name") in CAL_OVR["by_name"]:
        u["tx_power"] = CAL_OVR["by_name"][u["name"]]

def rssi_to_distance(rssi, tx_power, n):
    return 10 ** ((tx_power - rssi) / (10.0 * n))

def mad(values):
    if not values: return 0.0
    m = median(values)
    return median([abs(x - m) for x in values])

def zone_for_dist(d):
    for a, b, msg in ZONES:
        if a <= d < b:
            return (a, b, msg)
    return None

def adv_matches_user(name: str, adv, user: dict) -> bool:
    if user.get("name") and name and name.lower() == user["name"].lower():
        return True
    if user.get("_service_uuid_lower"):
        for u in (adv.service_uuids or []):
            if u and u.lower() == user["_service_uuid_lower"]:
                return True
    if user.get("manuf_id") is not None:
        payload = (adv.manufacturer_data or {}).get(int(user["manuf_id"]))
        if payload is not None:
            pref = user["_manuf_prefix_bytes"]
            if not pref or bytes(payload).startswith(pref):
                return True
    return False

buffers = defaultdict(lambda: deque(maxlen=SMOOTH_WINDOW))
ema_rssi = {}
zone_counter = defaultdict(int)
zone_current = {}
last_zone_time = {}

cal_start_ts = {}
cal_samples = defaultdict(list)
CAL_MIN_SAMPLES = 12

csv_writer = None
csv_file = None
if LOG_CSV:
    try:
        new = not os.path.exists(LOG_CSV)
        csv_file = open(LOG_CSV, "a", newline="", encoding="utf-8")
        csv_writer = csv.writer(csv_file)
        if new:
            csv_writer.writerow([
                "time_iso","user_id","user_label","address","name",
                "rssi_now","rssi_med","rssi_ema",
                "dist_now","dist_med","dist_ema","zone"
            ])
    except Exception as e:
        print(f"⚠️ CSV désactivé ({e})")
        csv_writer = None

# ---- NEW: stop guard to avoid race after closing CSV ----
STOPPING = False

def make_on_adv(args, calib_done_event: asyncio.Event):
    calib_saved_for = set()

    def on_adv(dev, adv):
        global csv_writer, STOPPING
        if STOPPING:
            return  # ignore late events during shutdown
        if adv.rssi is None:
            return

        name = adv.local_name or dev.name or ""
        matched_user = None
        for user in USERS:
            if adv_matches_user(name, adv, user):
                matched_user = user
                break
        if not matched_user:
            return

        user_id = matched_user["id"]
        label   = matched_user["label"]
        txp     = matched_user.get("tx_power", TX_POWER_DEFAULT)
        n_exp   = matched_user.get("path_loss_exp", PATH_LOSS_EXP_DEFAULT)
        addr    = dev.address
        key     = (user_id, addr)

        # ---- Calibration mode ----
        if args.calib and key not in calib_saved_for:
            now = time.time()
            if key not in cal_start_ts:
                cal_start_ts[key] = now
                print(f"📏 Calibration démarrée pour {label} / {addr} (collecte {args.calib_seconds}s @~1 m)")
            cal_samples[key].append(int(adv.rssi))
            dur = now - cal_start_ts[key]
            if dur >= args.calib_seconds and len(cal_samples[key]) >= CAL_MIN_SAMPLES:
                est = int(round(median(cal_samples[key])))
                matched_user["tx_power"] = est
                if matched_user.get("name"):
                    CAL_OVR["by_name"][matched_user["name"]] = est
                CAL_OVR["by_id"][matched_user["id"]] = est
                save_calib_overrides(CAL_OVR)
                print(f"✅ TX_POWER calibré pour {label} / {addr}: {est} dBm (utilisé pour la distance)")
                calib_saved_for.add(key)
                # tell main() to stop
                calib_done_event.set()
                return

        # ---- Normal flow ----
        buf = buffers[key]
        buf.append(adv.rssi)
        m = median(buf)
        m_mad = mad(buf)
        if m_mad > 0 and abs(adv.rssi - m) > OUTLIER_MAD_K * m_mad:
            return

        if key not in ema_rssi:
            ema_rssi[key] = float(adv.rssi)
        else:
            ema_rssi[key] = EMA_ALPHA * adv.rssi + (1.0 - EMA_ALPHA) * ema_rssi[key]

        rssi_now = int(adv.rssi)
        rssi_med = int(round(m))
        rssi_ema = float(ema_rssi[key])

        dist_now = rssi_to_distance(rssi_now, txp, n_exp)
        dist_med = rssi_to_distance(rssi_med, txp, n_exp)
        dist_ema = rssi_to_distance(rssi_ema, txp, n_exp)

        ts_h = time.strftime("%H:%M:%S")
        print(
            f"{ts_h} | {label:10s} | {addr:17s} | {name:12s} | "
            f"RSSI {rssi_now:4d} dBm (med {rssi_med:4d}, ema {int(round(rssi_ema)):4d}) | "
            f"≈ {dist_now:5.2f} m (med {dist_med:5.2f} m, ema {dist_ema:5.2f} m)"
        )

        z = zone_for_dist(dist_ema)
        key_zone = (user_id, addr)
        if z is not None:
            cur = zone_current.get(key_zone)
            if cur != z:
                zone_counter[(key_zone, z)] += 1
                if cur is not None and (key_zone, cur) in zone_counter:
                    zone_counter[(key_zone, cur)] = 0
                if zone_counter[(key_zone, z)] >= ZONE_STICKY_K:
                    zone_current[key_zone] = z
                    zone_counter[(key_zone, z)] = 0
                    a, b, msg = z
                    last_t = last_zone_time.get((key_zone, msg), 0.0)
                    if (time.time() - last_t) >= ZONE_MIN_REPEAT_S:
                        print(f"🎯 {label} | {addr} | {msg} (≈ {dist_ema:.2f} m)")
                        last_zone_time[(key_zone, msg)] = time.time()
            else:
                for k2 in list(zone_counter.keys()):
                    if isinstance(k2, tuple) and len(k2) == 2 and k2[0] == key_zone and k2[1] != z:
                        zone_counter[k2] = 0
        else:
            zone_current.pop(key_zone, None)

        # guarded CSV write
        if csv_writer:
            try:
                ts = time.strftime("%Y-%m-%d %H:%M:%S")
                csv_writer.writerow([
                    ts, user_id, label, addr, name,
                    rssi_now, rssi_med, round(rssi_ema, 1),
                    f"{dist_now:.3f}", f"{dist_med:.3f}", f"{dist_ema:.3f}",
                    z[2] if z else ""
                ])
            except ValueError:
                # file may be closing during shutdown on WinRT; ignore
                pass

    return on_adv

async def main():
    global csv_writer, csv_file, STOPPING

    parser = ArgumentParser()
    parser.add_argument("--calib", action="store_true",
                        help="Calibre tx_power à ~1 m, sauvegarde ble_calib.pkl puis s’arrête.")
    parser.add_argument("--calib-seconds", type=float, default=10.0,
                        help="Durée de collecte pour la calibration (défaut 10s)")
    args = parser.parse_args()

    print("🔍 BLE multi-users (Ctrl+C pour arrêter)")
    print("Utilisateurs chargés :")
    for u in USERS:
        crit = []
        if u.get("name"): crit.append(f"name='{u['name']}'")
        if u.get('service_uuid'): crit.append(f"uuid={u['service_uuid']}")
        if u.get("manuf_id") is not None:
            sfx = f", prefix={u.get('manuf_prefix_hex','')}" if u.get('manuf_prefix_hex') else ""
            crit.append(f"manuf=0x{int(u['manuf_id']):04X}{sfx}")
        print(f" • {u['id']} ({u['label']}): " + ("; ".join(crit) or "(aucun critère)"))
    print()
    if args.calib:
        print(f"🧪 Mode calibration activé : placez l’émetteur à ~1 m pendant {args.calib_seconds}s.\n")

    calib_done_event = asyncio.Event()
    scanner_kwargs = dict(
        detection_callback=make_on_adv(args, calib_done_event),
        discovery_filter=DISCOVERY_FILTER,
    )
    if not sys.platform.startswith("win"):
        scanner_kwargs["adapter"] = ADAPTER_LINUX

    scanner = BleakScanner(**scanner_kwargs)
    await scanner.start()
    try:
        if args.calib:
            await calib_done_event.wait()   # stop as soon as we calibrated one device
        else:
            while True:
                await asyncio.sleep(1.0)
    except KeyboardInterrupt:
        pass
    finally:
        # tell callback to ignore late packets
        STOPPING = True
        # small grace period to drain WinRT queue
        await asyncio.sleep(0.2)
        await scanner.stop()
        if csv_file:
            csv_file.flush()
            csv_file.close()
            csv_writer = None
        print("\n🛑 Scan arrêté.")

if __name__ == "__main__":
    asyncio.run(main())
