#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Imports
# ----------------------------------------------------------------------------------------------------------------------
import sys  # Gestion du système (platform, argv)
import os   # Gestion des chemins et fichiers
import time  # Gestion du temps (sleep, timestamps)
import json  # Lecture/écriture JSON (users.json)
import csv   # Journalisation optionnelle en CSV
import pickle  # Sauvegarde des calibrations (ble_calib.pkl)
import asyncio  # Boucle événementielle et BLE asynchrone
from argparse import ArgumentParser  # Parsing des arguments CLI
from collections import defaultdict, deque  # Structures de données utiles
from statistics import median  # Calcul de médiane pour filtrage RSSI

from bleak import BleakScanner  # Scanner BLE (bibliothèque bleak)

# Compatibilité Windows : nécessaire pour asyncio + Bleak
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


# Config Globale + Constantes
# ----------------------------------------------------------------------------------------------------------------------

# Répertoire de base du script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Accès des fichiers de calibration
USERS_JSON_PATH = os.path.join(BASE_DIR, "users.json")
CALIB_PKL_PATH = os.path.join(BASE_DIR, "ble_calib.pkl")

# Mutex True pour log_csv:
mutex = True
if mutex:
    LOG_CSV = None
else:
    LOG_CSV = os.path.join(BASE_DIR, "ble_multi_rssi_log.csv")

# Mode rapide : True Rapide/ False plus lents mais précis
FAST_MODE = True

if FAST_MODE:
    # Mode "fast" : moins de lissage, zones plus nerveuses
    SMOOTH_WINDOW = 3        # Taille de la fenêtre pour la médiane glissante
    EMA_ALPHA = 0.5          # Lissage exponentiel du RSSI
    OUTLIER_MAD_K = 3.5      # Seuil de détection d'outliers
    ZONE_STICKY_K = 1        # Nombre de confirmations avant changement de zone
    ZONE_MIN_REPEAT_S = 5.0  # Délai minimum entre deux annonces de même zone
else:
    # Mode "stable" : plus de lissage, zones plus stables
    SMOOTH_WINDOW = 7
    EMA_ALPHA = 0.25
    OUTLIER_MAD_K = 2.5
    ZONE_STICKY_K = 3
    ZONE_MIN_REPEAT_S = 20.0

# Paramètres radio par défaut
PATH_LOSS_EXP_DEFAULT = 2.2  # Exposant de perte de trajet (n)
TX_POWER_DEFAULT = -49       # Tx Power par défaut en dBm

# Filtre de découverte BLE
DISCOVERY_FILTER = {"Transport": "le", "DuplicateData": True}

# Nom de l'adaptateur BLE sous Linux
ADAPTER_LINUX = "hci0"

# Définition des zones (dist_min, dist_max, message)
ZONES = [
    (8.0, 12.0, "Vous arrivez à la faculté d'informatique"),
    (6.0,  8.0, "Approche du site — vibration faible"),
    (4.0,  6.0, "Vibration moyenne"),
    (2.0,  4.0, "Vibreur fort"),
    (1.0,  2.0, "Vous êtes devant la faculté d'informatique. La porte est devant vous, elle s’ouvre en la poussant (porte double)")
]

# Utilisateurs par défaut si users.json est absent
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

# Paramètres de calibration
CAL_MIN_SAMPLES = 12  # Nombre minimum d'échantillons RSSI pour la calibration

# Mode Debug
# ----------------------------------------------------------------------------------------------------------------------

# Flag global pour le mode debug
DEBUG_MODE = False


def debug_log(message: str) -> None:
    """Affiche un message de debug si le mode debug est activé.
    Parameters:
    ----------
    message : str
        Message à afficher.
    """
    if DEBUG_MODE:
        print(f"[DEBUG] {message}")

def set_debug_mode(enabled: bool) -> None:
    """Active ou désactive le mode debug.
    Parameters:
    ----------
    enabled : bool
        True pour activer le debug, False pour le désactiver.
    """
    global DEBUG_MODE
    DEBUG_MODE = enabled
    if DEBUG_MODE:
        print("🐞 Mode DEBUG activé\n")

# Sauvegarde de config
# ----------------------------------------------------------------------------------------------------------------------

def load_users():
    """Charge la liste des utilisateurs BLE à partir de users.json.
    Returns:
    -------
    list[dict]
        Liste de dictionnaires décrivant les utilisateurs.
    """
    if os.path.exists(USERS_JSON_PATH):
        try:
            with open(USERS_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            users = data.get("users", DEFAULT_USERS)
            if users:
                debug_log(f"{len(users)} utilisateurs chargés depuis users.json")
                return users
        except Exception as e:
            print(f"⚠️ Impossible de lire {USERS_JSON_PATH}, utilisation des valeurs par défaut ({e})")
    return DEFAULT_USERS

def load_calib_overrides():
    """Charge les overrides de calibration (tx_power) depuis un fichier pickle.
    Returns:
    -------
    dict
        Dictionnaire {"by_name": {...}, "by_id": {...}}.
    """
    if os.path.exists(CALIB_PKL_PATH):
        try:
            with open(CALIB_PKL_PATH, "rb") as f:
                obj = pickle.load(f)
            if isinstance(obj, dict):
                obj.setdefault("by_name", {})
                obj.setdefault("by_id", {})
                debug_log("Fichier de calibration chargé.")
                return obj
        except Exception as e:
            print(f"⚠️ Impossible de lire {CALIB_PKL_PATH}, calibration ignorée ({e})")
    return {"by_name": {}, "by_id": {}}


def save_calib_overrides(overrides):
    """Sauvegarde les overrides de calibration dans un fichier pickle.
    Parameters:
    ----------
    overrides : dict
        Dictionnaire de calibration {"by_name": {...}, "by_id": {...}}.
    """
    with open(CALIB_PKL_PATH, "wb") as f:
        pickle.dump(overrides, f)
    print(f"💾 Calibration enregistrée dans {CALIB_PKL_PATH}")

# Chargement des utilisateurs et de la calibration
USERS = load_users()
CAL_OVR = load_calib_overrides()

# Complétion des entrées utilisateurs
for u in USERS:
    u.setdefault("id", u.get("label", u.get("name", "unknown")))
    u.setdefault("label", u["id"])
    u.setdefault("tx_power", TX_POWER_DEFAULT)
    u.setdefault("path_loss_exp", PATH_LOSS_EXP_DEFAULT)

    # Prétraitement des critères de matching
    mp = (u.get("manuf_prefix_hex") or "").strip()
    u["_manuf_prefix_bytes"] = bytes.fromhex(mp) if mp else b""

    su = (u.get("service_uuid") or "").strip()
    u["_service_uuid_lower"] = su.lower()

    # Application des overrides de calibration
    if u["id"] in CAL_OVR["by_id"]:
        u["tx_power"] = CAL_OVR["by_id"][u["id"]]
    elif u.get("name") in CAL_OVR["by_name"]:
        u["tx_power"] = CAL_OVR["by_name"][u["name"]]

# Outils de calcul de zone
# ----------------------------------------------------------------------------------------------------------------------

def rssi_to_distance(rssi, tx_power, n):
    """Convertit un RSSI en distance estimée via le modèle de perte de trajet.
    Parameters:
    ----------
    rssi : float
        RSSI mesuré (dBm).
    tx_power : float
        Puissance d'émission à 1 m (dBm).
    n : float
        Exposant de perte de trajet.
    Returns:
    -------
    float
        Distance estimée en mètres.
    """
    return 10 ** ((tx_power - rssi) / (10.0 * n))

def mad(values):
    """Calcule la MAD (Median Absolute Deviation) d'une liste de valeurs.
    Parameters:
    ----------
    values : list[float]
    Returns
    -------
    float
        MAD des valeurs, 0 si liste vide.
    """
    if not values:
        return 0.0
    m = median(values)
    return median([abs(x - m) for x in values])

def zone_for_dist(d):
    """Retourne la zone correspondant à une distance donnée.
    Parameters:
    ----------
    d : float
        Distance estimée en mètres.
    Returns:
    -------
    tuple | None
        (dist_min, dist_max, message) ou None si aucune zone ne correspond.
    """
    for a, b, msg in ZONES:
        if a <= d < b:
            return (a, b, msg)
    return None

# Annonce BLE avec les users
# ----------------------------------------------------------------------------------------------------------------------

def adv_matches_user(name: str, adv, user: dict) -> bool:
    """Détermine si une annonce BLE correspond à un utilisateur donné.
    Le matching se fait sur :
        - le nom local (local_name / name)
        - le service UUID
        - les données constructeur (manufacturer data + prefix)
    Parameters:
    ----------
    name : str
        Nom du périphérique (local_name ou device.name).
    adv :
        Données d'annonce (Bleak).
    user : dict
        Description de l'utilisateur.
    Returns:
    -------
    bool
        True si l'annonce correspond à l'utilisateur, False sinon.
    """
    # Match par nom
    if user.get("name") and name and name.lower() == user["name"].lower():
        debug_log(f"Match par nom: {name} == {user['name']}")
        return True
    # Match par Service UUID
    if user.get("_service_uuid_lower"):
        for u in (adv.service_uuids or []):
            if u and u.lower() == user["_service_uuid_lower"]:
                debug_log(f"Match par UUID: {u} pour user {user['id']}")
                return True
    # Match par manufacturer data
    if user.get("manuf_id") is not None:
        payload = (adv.manufacturer_data or {}).get(int(user["manuf_id"]))
        if payload is not None:
            pref = user["_manuf_prefix_bytes"]
            if not pref or bytes(payload).startswith(pref):
                debug_log(f"Match par manufacturer data pour user {user['id']}")
                return True
    return False

# GLobal
# ----------------------------------------------------------------------------------------------------------------------

# Buffers pour le lissage des RSSI
buffers = defaultdict(lambda: deque(maxlen=SMOOTH_WINDOW))

# Stockage du RSSI lissé exponentiellement
ema_rssi = {}

# Compteurs de "sticky" pour les zones
zone_counter = defaultdict(int)
zone_current = {}
last_zone_time = {}

# État de la calibration
cal_start_ts = {}
cal_samples = defaultdict(list)

# CSV logging
csv_writer = None
csv_file = None
if LOG_CSV:
    try:
        new = not os.path.exists(LOG_CSV)
        csv_file = open(LOG_CSV, "a", newline="", encoding="utf-8")
        csv_writer = csv.writer(csv_file)
        if new:
            csv_writer.writerow([
                "time_iso", "user_id", "user_label", "address", "name",
                "rssi_now", "rssi_med", "rssi_ema",
                "dist_now", "dist_med", "dist_ema", "zone"
            ])
    except Exception as e:
        print(f"⚠️ CSV désactivé ({e})")
        csv_writer = None

# Garde d'arrêt pour éviter des races à l'arrêt
STOPPING = False

# CallBack Émetteur : Traitement des annonces
# ----------------------------------------------------------------------------------------------------------------------

def make_on_adv(args, calib_done_event: asyncio.Event):
    """Fabrique la fonction de callback appelée à chaque annonce BLE.
    Parameters:
    ----------
    args :
        Arguments de ligne de commande (ArgumentParser).
    calib_done_event : asyncio.Event
        Événement utilisé en mode calibration pour signaler la fin.
    Returns:
    -------
    callable
        Fonction 'on_adv(dev, adv)'.
    """
    calib_saved_for = set()

    def on_adv(dev, adv):
        """
        Callback exécuté pour chaque annonce BLE détectée.
        """
        global csv_writer, STOPPING

        if STOPPING:
            return

        if adv.rssi is None:
            return

        name = adv.local_name or dev.name or ""
        debug_log(f"Annonce reçue de {dev.address} ({name}) avec RSSI={adv.rssi} dBm")

        # Recherche d'un utilisateur correspondant
        matched_user = None
        for user in USERS:
            if adv_matches_user(name, adv, user):
                matched_user = user
                break
        if not matched_user:
            return

        user_id = matched_user["id"]
        label = matched_user["label"]
        txp = matched_user.get("tx_power", TX_POWER_DEFAULT)
        n_exp = matched_user.get("path_loss_exp", PATH_LOSS_EXP_DEFAULT)
        addr = dev.address
        key = (user_id, addr)

        # Mode Calibration
        # ----------------------------------------------------------------
        if args.calib and key not in calib_saved_for:
            now = time.time()
            if key not in cal_start_ts:
                cal_start_ts[key] = now
                print(f"📏 Calibration démarrée pour {label} / {addr} "
                      f"(collecte {args.calib_seconds}s @~1 m)")
            cal_samples[key].append(int(adv.rssi))
            dur = now - cal_start_ts[key]
            debug_log(f"Calibration: {len(cal_samples[key])} échantillons, durée={dur:.1f}s")

            if dur >= args.calib_seconds and len(cal_samples[key]) >= CAL_MIN_SAMPLES:
                est = int(round(median(cal_samples[key])))
                matched_user["tx_power"] = est
                if matched_user.get("name"):
                    CAL_OVR["by_name"][matched_user["name"]] = est
                CAL_OVR["by_id"][matched_user["id"]] = est
                save_calib_overrides(CAL_OVR)
                print(f"✅ TX_POWER calibré pour {label} / {addr}: {est} dBm (utilisé pour la distance)")
                calib_saved_for.add(key)
                # Signale à main() qu'on peut s'arrêter
                calib_done_event.set()
                return
        # Mode Normal :
        # ----------------------------------------------------------------
        # Lissage median
        buf = buffers[key]
        buf.append(adv.rssi)
        m = median(buf)
        m_mad = mad(buf)
        if m_mad > 0 and abs(adv.rssi - m) > OUTLIER_MAD_K * m_mad:
            debug_log(f"Outlier filtré: RSSI={adv.rssi} (med={m}, MAD={m_mad})")
            return

        # Lissage exponentiel EMA
        if key not in ema_rssi:
            ema_rssi[key] = float(adv.rssi)
        else:
            ema_rssi[key] = EMA_ALPHA * adv.rssi + (1.0 - EMA_ALPHA) * ema_rssi[key]

        rssi_now = int(adv.rssi)
        rssi_med = int(round(m))
        rssi_ema = float(ema_rssi[key])

        # Distances correspondantes
        dist_now = rssi_to_distance(rssi_now, txp, n_exp)
        dist_med = rssi_to_distance(rssi_med, txp, n_exp)
        dist_ema = rssi_to_distance(rssi_ema, txp, n_exp)

        ts_h = time.strftime("%H:%M:%S")
        print(
            f"{ts_h} | {label:10s} | {addr:17s} | {name:12s} | "
            f"RSSI {rssi_now:4d} dBm (med {rssi_med:4d}, ema {int(round(rssi_ema)):4d}) | "
            f"≈ {dist_now:5.2f} m (med {dist_med:5.2f} m, ema {dist_ema:5.2f} m)"
        )

        # Détermination de la zone
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
                        debug_log(f"Zone confirmée pour {label}/{addr}: {msg} [{a}, {b}]")
            else:
                # Si on reste dans la même zone, on reset les compteurs des autres zones pour cette clé
                for k2 in list(zone_counter.keys()):
                    if isinstance(k2, tuple) and len(k2) == 2 and k2[0] == key_zone and k2[1] != z:
                        zone_counter[k2] = 0
        else:
            zone_current.pop(key_zone, None)
        # Journalisation csv
        # ----------------------------------------------------------------
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
                pass

    return on_adv

# Fonction Main
# ----------------------------------------------------------------------------------------------------------------------

async def main():
    """Point d'entrée principal du script (asynchrone).
    Gère :
        - le parsing des arguments CLI
        - l'affichage des utilisateurs
        - la configuration du scanner BLE
        - le mode normal et le mode calibration
    """
    global csv_writer, csv_file, STOPPING

    # Parsing des arguments
    # --------------------------------------------------------------------
    parser = ArgumentParser(description="Scan BLE multi-utilisateurs avec zones et calibration.")
    parser.add_argument(
        "--calib",
        action="store_true",
        help="Calibre tx_power à ~1 m, sauvegarde ble_calib.pkl puis s’arrête."
    )
    parser.add_argument(
        "--calib-seconds",
        type=float,
        default=10.0,
        help="Durée de collecte pour la calibration (défaut 10s)"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Active le mode debug (affichage d'informations détaillées)."
    )
    args = parser.parse_args()

    # Mode debug : si --calib, si --debug
    debug_enabled = args.debug or args.calib
    set_debug_mode(debug_enabled)

    # Affichage Intro
    # --------------------------------------------------------------------
    print("🔍 BLE multi-users (Ctrl+C pour arrêter)")
    print("Utilisateurs chargés :")
    for u in USERS:
        crit = []
        if u.get("name"):
            crit.append(f"name='{u['name']}'")
        if u.get('service_uuid'):
            crit.append(f"uuid={u['service_uuid']}")
        if u.get("manuf_id") is not None:
            sfx = f", prefix={u.get('manuf_prefix_hex','')}" if u.get('manuf_prefix_hex') else ""
            crit.append(f"manuf=0x{int(u['manuf_id']):04X}{sfx}")
        print(f" • {u['id']} ({u['label']}): " + ("; ".join(crit) or "(aucun critère)"))
    print()

    if args.calib:
        print(f"🧪 Mode calibration activé : placez l’émetteur à ~1 m pendant {args.calib_seconds}s.\n")

    # Fin de calibration
    calib_done_event = asyncio.Event()

    # Paramètres du scanner BLE
    scanner_kwargs = dict(
        detection_callback=make_on_adv(args, calib_done_event),
        discovery_filter=DISCOVERY_FILTER,
    )
    if not sys.platform.startswith("win"):
        scanner_kwargs["adapter"] = ADAPTER_LINUX

    scanner = BleakScanner(**scanner_kwargs)

    # Lancement du scan
    # --------------------------------------------------------------------
    await scanner.start()
    try:
        if args.calib:
            # En mode calibration
            await calib_done_event.wait()
        else:
            # En mode normal
            while True:
                await asyncio.sleep(1.0)
    except KeyboardInterrupt:
        pass
    finally:
        # Indique au callback d'ignorer les annonces tardives
        STOPPING = True

        # Petite pause pour vider la file WinRT
        await asyncio.sleep(0.2)

        # Arrêt du scanner
        await scanner.stop()

        # Fermeture si CSV
        if csv_file:
            csv_file.flush()
            csv_file.close()
            csv_writer = None

        print("\n🛑 Scan arrêté.")


# Start
# ----------------------------------------------------------------------------------------------------------------------

if __name__ == "__main__":
    asyncio.run(main())
