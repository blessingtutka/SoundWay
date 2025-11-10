#!/usr/bin/env python3
"""
ble_advertiser.py
Émetteur BLE simple utilisant BlueZ D-Bus (LEAdvertisingManager1).

Usage:
  sudo python3 ble_advertiser.py --user user1
  sudo python3 ble_advertiser.py --name King375
  sudo python3 ble_advertiser.py --list   # liste users.json
"""

import asyncio
import json
import os
import argparse
from dbus_next.aio import MessageBus
from dbus_next import Variant, BusType
from dbus_next.service import (ServiceInterface, method, dbus_property, signal)
from dbus_next.constants import PropertyAccess

BLUEZ_SERVICE = 'org.bluez'
ADAPTER_IFACE = 'org.bluez.Adapter1'
LE_ADV_MGR_IFACE = 'org.bluez.LEAdvertisingManager1'
ADVERTISING_IFACE = 'org.bluez.LEAdvertisement1'
OBJECT_PATH_BASE = '/org/bluez/example/advertisement'

# Default users if no users.json
DEFAULT_USERS = [
    {
        "id": "user1",
        "label": "King375",
        "name": "King375",
        "service_uuid": "",
        "manuf_id": None,
        "manuf_prefix_hex": "",
        "tx_power": -49,
        "path_loss_exp": 2.2
    }
]

def load_users():
    path = os.path.expanduser('~/users.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            j = json.load(f)
            return j.get('users', DEFAULT_USERS)
    return DEFAULT_USERS

USERS = load_users()

class Advertisement(ServiceInterface):
    def __init__(self, bus, index, advertising_type='peripheral'):
        path = OBJECT_PATH_BASE + str(index)
        super().__init__(ADVERTISING_IFACE)
        self.path = path
        self.bus = bus
        self.loop = asyncio.get_event_loop()
        self.properties = {
            'Type': advertising_type,
            'ServiceUUIDs': [],
            'LocalName': '',
            'Includes': [],
            'ManufacturerData': {},
            'ServiceData': {}
        }

    @dbus_property(PropertyAccess.READ)
    def Type(self) -> 's':
        return self.properties['Type']

    @dbus_property(PropertyAccess.READ)
    def ServiceUUIDs(self) -> 'as':
        return self.properties['ServiceUUIDs']

    @dbus_property(PropertyAccess.READ)
    def LocalName(self) -> 's':
        return self.properties['LocalName']

    @dbus_property(PropertyAccess.READ)
    def Includes(self) -> 'as':
        return self.properties['Includes']

    @dbus_property(PropertyAccess.READ)
    def ManufacturerData(self) -> 'a{qv}':
        # convert python dict {id: bytes} to dbus variants of ay
        md = {}
        for k, v in self.properties['ManufacturerData'].items():
            md[int(k)] = Variant('ay', list(v))
        return md

    @dbus_property(PropertyAccess.READ)
    def ServiceData(self) -> 'a{sv}':
        return {}

    @method()
    def Release(self) -> None:
        print('Advertisement Released')

async def find_adapter(bus):
    # trouve le premier adaptateur compatible LEAdvertisingManager1
    introspect = await bus.introspect(BLUEZ_SERVICE, '/')
    objs = []
    # lister les objets
    manager = bus.get_proxy_object(BLUEZ_SERVICE, '/', introspect)
    # parcourir /org/bluez
    m = await bus.call(bus._message(destination=BLUEZ_SERVICE, path='/', interface='org.freedesktop.DBus.Introspectable', member='Introspect'))
    # instead of heavy introspection, iterate common paths
    # we'll search /org/bluez/* for adapters
    obj_manager = await bus.call(bus._message(destination=BLUEZ_SERVICE, path='/', interface='org.freedesktop.DBus.ObjectManager', member='GetManagedObjects'))
    # But simpler approach: query known adapter path /org/bluez/hci0
    try:
        # assume hci0 exists
        return '/org/bluez/hci0'
    except Exception as e:
        raise RuntimeError("Adapter hci0 not found") from e

async def register_advertisement(bus, ad: Advertisement, adapter_path='/org/bluez/hci0'):
    # obtenir l'interface LEAdvertisingManager1
    obj = await bus.introspect(BLUEZ_SERVICE, adapter_path)
    proxy = bus.get_proxy_object(BLUEZ_SERVICE, adapter_path, obj)
    adv_mgr = proxy.get_interface(LE_ADV_MGR_IFACE)

    # exporter notre objet d'advertisement sur le bus
    server = bus._server
    server.export(ad.path, ad)

    # call RegisterAdvertisement
    try:
        await adv_mgr.call_register_advertisement(ad.path, {})
        print("Advertisement registered at", ad.path)
    except Exception as e:
        print("Failed to register advertisement:", e)
        raise

async def unregister_advertisement(bus, ad: Advertisement, adapter_path='/org/bluez/hci0'):
    try:
        obj = await bus.introspect(BLUEZ_SERVICE, adapter_path)
        proxy = bus.get_proxy_object(BLUEZ_SERVICE, adapter_path, obj)
        adv_mgr = proxy.get_interface(LE_ADV_MGR_IFACE)
        await adv_mgr.call_unregister_advertisement(ad.path)
    except Exception as e:
        # ignore
        pass
    finally:
        try:
            bus._server.unexport(ad.path)
        except Exception:
            pass

def build_ad_from_user(user):
    ad = {
        'LocalName': user.get('name') or '',
        'ServiceUUIDs': [],
        'Includes': ['tx-power'] if user.get('tx_power') is not None else [],
        'ManufacturerData': {}
    }
    if user.get('service_uuid'):
        ad['ServiceUUIDs'].append(user['service_uuid'])
    if user.get('manuf_id') is not None:
        prefix_hex = (user.get('manuf_prefix_hex') or '').strip()
        if prefix_hex:
            md = bytes.fromhex(prefix_hex)
        else:
            md = b''
        ad['ManufacturerData'][int(user['manuf_id'])] = md
    return ad

async def main_async(args):
    bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
    # get adapter
    adapter_path = args.adapter or '/org/bluez/hci0'

    # select user
    user = None
    if args.list:
        print("Users available:")
        for u in USERS:
            print(" -", u.get('id'), u.get('label'))
        return
    if args.user:
        for u in USERS:
            if u.get('id') == args.user or u.get('label') == args.user or u.get('name') == args.user:
                user = u
                break
    if args.name:
        for u in USERS:
            if u.get('name') == args.name:
                user = u
                break
    if user is None:
        user = USERS[0]
        print("No user passed, using default:", user.get('id'))

    ad_conf = build_ad_from_user(user)

    ad_obj = Advertisement(bus, 0, advertising_type='peripheral')
    ad_obj.properties['LocalName'] = ad_conf['LocalName']
    ad_obj.properties['ServiceUUIDs'] = ad_conf['ServiceUUIDs']
    ad_obj.properties['Includes'] = ad_conf['Includes']
    # manufacturer data as dict int->bytes
    ad_obj.properties['ManufacturerData'] = {k: v for k, v in ad_conf['ManufacturerData'].items()}

    print("Advertising as:", ad_obj.properties['LocalName'])
    await register_advertisement(bus, ad_obj, adapter_path=adapter_path)
    print("Press Ctrl+C to stop advertising.")
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("Stopping advertisement...")
    await unregister_advertisement(bus, ad_obj, adapter_path=adapter_path)

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--user', help='user id/label/name to advertise')
    p.add_argument('--name', help='advertise raw name (overrides user)')
    p.add_argument('--adapter', help='adapter path (default /org/bluez/hci0)')
    p.add_argument('--list', action='store_true', help='list users and exit')
    return p.parse_args()

if __name__ == '__main__':
    args = parse_args()
    try:
        asyncio.run(main_async(args))
    except Exception as e:
        print("Error:", e)
        raise
