#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Imports
# ----------------------------------------------------------------------------------------------------------------------
import os          # Gestion des chemins de fichiers et du système
import json        # Lecture et écriture des fichiers JSON (users.json)
import asyncio     # Boucle événementielle asynchrone (pour le D-Bus)
import argparse    # Parsing des arguments CLI (ligne de commande)

# Bibliothèque D-Bus Next (interface Python pour BlueZ)
from dbus_next.aio import MessageBus                # Connexion asynchrone au bus D-Bus
from dbus_next import Variant, BusType              # Types D-Bus et type de bus (SYSTEM, SESSION)
from dbus_next.service import (                     # Outils pour créer un service D-Bus
    ServiceInterface,                               # Classe de base pour exposer une interface D-Bus
    method,                                         # Décorateur pour exposer des méthodes D-Bus
    dbus_property                                   # Décorateur pour exposer des propriétés D-Bus
)
from dbus_next.constants import PropertyAccess      # Enum pour définir les permissions des propriétés (READ/WRITE)

# Config globale + constantes
# ----------------------------------------------------------------------------------------------------------------------

# Service / interfaces BlueZ
BLUEZ_SERVICE = "org.bluez"
ADAPTER_IFACE = "org.bluez.Adapter1"
LE_ADV_MGR_IFACE = "org.bluez.LEAdvertisingManager1"
ADVERTISING_IFACE = "org.bluez.LEAdvertisement1"

# Objet de base pour advertisement
OBJECT_PATH_BASE = "/org/bluez/example/advertisement"

# Répertoire de base du script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Fichier users.json
USERS_JSON_PATH = os.path.join(BASE_DIR, "users.json")

# Utilisateurs par défaut si users.json est absent
DEFAULT_USERS = [
    {
        "id": "user1",
        "label": "King375",
        "name": "King375",
        "service_uuid": "",
        "manuf_id": None,
        "manuf_prefix_hex": "",
        "tx_power": -49,
        "path_loss_exp": 2.2,
    }
]

# Adaptateur BLE par défaut Linux
DEFAULT_ADAPTER_PATH = "/org/bluez/hci1"



# Mode Debug
# ----------------------------------------------------------------------------------------------------------------------

DEBUG_MODE = False


def debug_log(message: str) -> None:
    """Affiche un message de debug si le mode debug est activé."""
    if DEBUG_MODE:
        print(f"[DEBUG] {message}")


def set_debug_mode(enabled: bool) -> None:
    """Active ou désactive le mode debug."""
    global DEBUG_MODE
    DEBUG_MODE = enabled
    if DEBUG_MODE:
        print("🐞 Mode DEBUG activé\n")


# Chargement des users
# ----------------------------------------------------------------------------------------------------------------------

def load_users():
    """Charge la liste des utilisateurs BLE à partir de users.json.

    Returns
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
            print(
                f"⚠️ Impossible de lire {USERS_JSON_PATH}, "
                f"utilisation des valeurs par défaut ({e})"
            )
    return DEFAULT_USERS


USERS = load_users()


# Class Advertisement
# ----------------------------------------------------------------------------------------------------------------------

class Advertisement(ServiceInterface):
    """Implémentation d'un objet LEAdvertisement1 pour BlueZ."""

    def __init__(self, bus: MessageBus, index: int, advertising_type: str = "peripheral"):
        """
        Parameters
        ----------
        bus : MessageBus
            Bus D-Bus système sur lequel exporter l'objet.
        index : int
            Index pour le chemin d'objet (OBJECT_PATH_BASE + index).
        advertising_type : str
            Type d'advertising (peripheral, broadcast, ...).
        """
        super().__init__(ADVERTISING_IFACE)

        self.bus = bus
        self.path = f"{OBJECT_PATH_BASE}{index}"
        self.loop = asyncio.get_event_loop()

        # Propriétés exposées à BlueZ
        self.properties = {
            "Type": advertising_type,
            "ServiceUUIDs": [],
            "LocalName": "",
            "Includes": [],
            "ManufacturerData": {},
            "ServiceData": {},
        }

    # Propriétés D-Bus
    # ------------------------------------------------------------------

    @dbus_property(PropertyAccess.READ)
    def Type(self) -> "s":
        return self.properties["Type"]

    @dbus_property(PropertyAccess.READ)
    def ServiceUUIDs(self) -> "as":
        return self.properties["ServiceUUIDs"]

    @dbus_property(PropertyAccess.READ)
    def LocalName(self) -> "s":
        return self.properties["LocalName"]

    @dbus_property(PropertyAccess.READ)
    def Includes(self) -> "as":
        return self.properties["Includes"]

    @dbus_property(PropertyAccess.READ)
    def ManufacturerData(self) -> "a{qv}":
        """Convertit le dict Python {id: bytes} en {q: Variant('ay', ...)}."""
        md = {}
        for k, v in self.properties["ManufacturerData"].items():
            md[int(k)] = Variant("ay", list(v))
        return md

    @dbus_property(PropertyAccess.READ)
    def ServiceData(self) -> "a{sv}":
        return self.properties.get("ServiceData", {})

    # Méthodes D-Bus
    # ------------------------------------------------------------------
    @method()
    def Release(self) -> None:
        """Appelée par BlueZ quand l'advertisement est libéré."""
        print("ℹ️  Advertisement libéré par BlueZ.")


# Fonctions BlueZ / D-Bus
# ----------------------------------------------------------------------------------------------------------------------

async def register_advertisement(
    bus: MessageBus,
    ad: Advertisement,
    adapter_path: str = DEFAULT_ADAPTER_PATH,
    adv_params: dict | None = None,
) -> None:
    """Enregistre l'advertisement auprès de BlueZ.
    Parameters:
    ----------
    bus : MessageBus
        Bus D-Bus système.
    ad : Advertisement
        Instance de l'objet à enregistrer.
    adapter_path : str
        Chemin d'objet de l'adaptateur BLE (par ex. /org/bluez/hci0).
    """
    debug_log(f"Enregistrement de l'advertisement sur {adapter_path}")

    introspection = await bus.introspect(BLUEZ_SERVICE, adapter_path)
    proxy = bus.get_proxy_object(BLUEZ_SERVICE, adapter_path, introspection)
    adv_mgr = proxy.get_interface(LE_ADV_MGR_IFACE)

    bus.export(ad.path, ad)

    try:
        await adv_mgr.call_register_advertisement(ad.path, adv_params or {})
        print(f"✅ Advertisement enregistré sur {ad.path}")
    except Exception as e:
        print(f"❌ Échec de l'enregistrement de l'advertisement : {e}")
        try:
            bus.unexport(ad.path)
        except Exception:
            pass
        raise



async def unregister_advertisement(
    bus: MessageBus,
    ad: Advertisement,
    adapter_path: str = DEFAULT_ADAPTER_PATH,
) -> None:
    """Désenregistre l'advertisement et l'unexporte du bus."""
    debug_log("Désenregistrement de l'advertisement")

    try:
        introspection = await bus.introspect(BLUEZ_SERVICE, adapter_path)
        proxy = bus.get_proxy_object(BLUEZ_SERVICE, adapter_path, introspection)
        adv_mgr = proxy.get_interface(LE_ADV_MGR_IFACE)
        await adv_mgr.call_unregister_advertisement(ad.path)
    except Exception as e:
        debug_log(f"Ignoré lors de l'unregister : {e}")
    finally:
        try:
            bus.unexport(ad.path)
        except Exception:
            pass
        print("🛑 Advertisement arrêté.")



# Construction de la config d'advertising
# ----------------------------------------------------------------------------------------------------------------------

def build_ad_from_user(user: dict) -> dict:
    """Construit la configuration d'advertising à partir d'un utilisateur.
    Parameters:
    ----------
    user : dict
        Entrée utilisateur (users.json ou DEFAULT_USERS).
    Returns:
    -------
    dict
        Dictionnaire de configuration :
        {LocalName, ServiceUUIDs, Includes, ManufacturerData}
    """
    ad = {
        "LocalName": user.get("name") or "",
        "ServiceUUIDs": [],
        "Includes": [],
        "ManufacturerData": {},
    }

    # TX Power
    if user.get("tx_power") is not None:
        ad["Includes"].append("tx-power")

    # UUID de service
    if user.get("service_uuid"):
        ad["ServiceUUIDs"].append(user["service_uuid"])

    # Manufacturer Data
    if user.get("manuf_id") is not None:
        prefix_hex = (user.get("manuf_prefix_hex") or "").strip()
        if prefix_hex:
            md = bytes.fromhex(prefix_hex)
        else:
            md = b""
        ad["ManufacturerData"][int(user["manuf_id"])] = md

    debug_log(f"Config advertisement générée pour {user.get('id')}: {ad}")
    return ad


# Main Program
# ----------------------------------------------------------------------------------------------------------------------

async def main_async(args: argparse.Namespace) -> None:
    """Point d'entrée principal (asynchrone)."""
    # Mode debug
    set_debug_mode(getattr(args, "debug", False))

    # Liste des users
    if args.list:
        print("👥 Utilisateurs disponibles :")
        for u in USERS:
            print(f" • {u.get('id')} ({u.get('label')})")
        return

    # Connexion au bus système
    print("🔗 Connexion au bus D-Bus système...")
    bus = await MessageBus(bus_type=BusType.SYSTEM).connect()

    # Select Adaptateur
    adapter_path = args.adapter or DEFAULT_ADAPTER_PATH
    print(f"🔧 Utilisation de l'adaptateur : {adapter_path}")

    # Select User
    user = None

    if args.user:
        wanted = args.user
        for u in USERS:
            if (
                u.get("id") == wanted
                or u.get("label") == wanted
                or u.get("name") == wanted
            ):
                user = u
                break

    if args.name:
        # Si --name est fourni overide du name user
        for u in USERS:
            if u.get("name") == args.name:
                user = u
                break
        # Si aucun user / juste le nom brut
        if user is None:
            user = USERS[0].copy()
            user["name"] = args.name

    if user is None:
        user = USERS[0]
        print(f"ℹ️ Aucun utilisateur spécifié, utilisation du défaut : {user.get('id')}")

    print(
        f"📡 Préparation de l'advertising pour "
        f"{user.get('id')} ({user.get('label')})"
    )

    # Construction de la config
    ad_conf = build_ad_from_user(user)

    # Création d' Advertisement
    ad_obj = Advertisement(bus, index=0, advertising_type="peripheral")
    ad_obj.properties["LocalName"] = ad_conf["LocalName"]
    ad_obj.properties["ServiceUUIDs"] = ad_conf["ServiceUUIDs"]
    ad_obj.properties["Includes"] = ad_conf["Includes"]
    ad_obj.properties["ManufacturerData"] = {
        k: v for k, v in ad_conf["ManufacturerData"].items()
    }

    print(f"🔊 Advertising en tant que : {ad_obj.properties['LocalName'] or '(sans nom)'}")

    adv_params = {}
    if getattr(args, "ultrafast", False):
        adv_params = {
            "minInterval": Variant("q", 0x0020),
            "maxInterval": Variant("q", 0x0030),
        }

    await register_advertisement(bus, ad_obj, adapter_path=adapter_path, adv_params=adv_params)

    print("▶️  Diffusion en cours. Appuyez sur Ctrl+C pour arrêter.\n")
    try:
        while True:
            await asyncio.sleep(1.0)
    except KeyboardInterrupt:
        print("\n⏹️  Arrêt de l'advertising demandé par l'utilisateur...")
    finally:
        await unregister_advertisement(bus, ad_obj, adapter_path=adapter_path)


# Parsing des arguments CLI
# ----------------------------------------------------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    """Parse les arguments de ligne de commande."""
    parser = argparse.ArgumentParser(
        description="Émetteur BLE (advertising) basé sur BlueZ et D-Bus."
    )
    parser.add_argument(
        "--user",
        help="ID/label/nom de l'utilisateur à émettre (défaut : premier de users.json)",
    )
    parser.add_argument(
        "--name",
        help="Nom brut à annoncer (override le nom de l'utilisateur si fourni).",
    )
    parser.add_argument(
        "--adapter",
        help=f"Chemin de l'adaptateur (défaut {DEFAULT_ADAPTER_PATH})",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Liste les utilisateurs disponibles puis quitte.",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Active le mode debug (traces détaillées).",
    )
    parser.add_argument(
        "--ultrafast",
        action="store_true",
        help="Active l’émission BLE ultra-rapide (20–30 ms).",
    )
    return parser.parse_args()


# Start
# ----------------------------------------------------------------------------------------------------------------------

if __name__ == "__main__":
    cli_args = parse_args()
    try:
        asyncio.run(main_async(cli_args))
    except Exception as e:
        print(f"❌ Erreur durant l'exécution : {e}")
        raise
