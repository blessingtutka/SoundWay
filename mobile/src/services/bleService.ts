/**
 * BLE service:
 * - MovingAverage (avg -> Kalman) pipeline for stable & responsive distance while moving
 * - Kalman tuned for noisy RSSI (R=measurement noise, Q=process noise)
 * - Configurable device selector (by id, name prefix, or service UUID)
 * - Safe RSSI polling + robust cleanup
 *
 */

import { bleDistanceCalculator } from '@/utils/distanceCalculator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleError, BleManager, Device } from 'react-native-ble-plx';

// Scan/connect timing
const SCAN_MS = 4000;
const CONNECTION_RETRY_MS = 2000;
const RSSI_POLL_MS = 250;

// Targeting options
const TARGET_DEVICE_ID = process.env.EXPO_PUBLIC_TARGET_BLE_ID || '';
const TARGET_NAME_PREFIX = process.env.EXPO_PUBLIC_TARGET_NAME_PREFIX || '';
const SERVICE_UUID = process.env.EXPO_PUBLIC_BLE_SERVICE_UUID || '';
const CHAR_UUID = process.env.EXPO_PUBLIC_BLE_CHAR_UUID || '';
// AsyncStorage keys
const STORAGE_KEYS = 'soundway_device';

type DeviceEntry = {
  device: Device;
  lastRssi: number | null;
  bestRssi: number | null;
  lastSeen: number;
};

class BleService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private sub: any = null;
  private rssiInterval: any = null;
  private stopRequested = false;

  // Callbacks for react native component update
  // onZoneMessage: ((msg: string) => void) | null = null;
  // onConnectionState: ((connected: boolean) => void) | null = null;
  // onDeviceUpdated: ((device: Device | null, distance: number | null) => void) | null = null;

  private deviceListeners = new Set<(device: Device | null, distance: number | null) => void>();
  private connectionListeners = new Set<(connected: boolean) => void>();
  private zoneListeners = new Set<(msg: string) => void>();

  constructor() {
    this.manager = new BleManager();
  }

  addDeviceListener(cb: (device: Device | null, distance: number | null) => void) {
    this.deviceListeners.add(cb);
    return () => this.deviceListeners.delete(cb);
  }

  addConnectionListener(cb: (connected: boolean) => void) {
    this.connectionListeners.add(cb);
    return () => this.connectionListeners.delete(cb);
  }

  addZoneListener(cb: (msg: string) => void) {
    this.zoneListeners.add(cb);
    return () => this.zoneListeners.delete(cb);
  }

  private async requestPermissions() {
    if (Platform.OS !== 'android') return;
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
  }

  // scanning & auto-connect loop
  async startAutoScan() {
    this.stopRequested = false;
    await this.requestPermissions();
    while (!this.stopRequested && !this.connectedDevice) {
      try {
        await this.scanConnect();
      } catch (e) {
        console.warn('scanConnect failed:', e);
      }
      if (!this.connectedDevice && !this.stopRequested) {
        await new Promise((r) => setTimeout(r, CONNECTION_RETRY_MS));
      } else break;
    }
  }

  async stopAll() {
    this.stopRequested = true;
    if (this.rssiInterval) {
      clearInterval(this.rssiInterval);
      this.rssiInterval = null;
    }
    try {
      this.sub?.remove();
    } catch {}
    try {
      if (this.connectedDevice) await this.connectedDevice.cancelConnection();
    } catch {}
    try {
      this.manager.stopDeviceScan();
    } catch {}
    this.connectedDevice = null;
    // this.onConnectionState?.(false);
    this.connectionListeners.forEach((cb) => cb(false));
    bleDistanceCalculator.reset();
  }

  // --- scan & connect
  private async scanConnect(): Promise<void> {
    const observed = new Map<string, DeviceEntry>();
    return new Promise<void>((resolve, reject) => {
      let stopped = false;

      const onScan = (error: BleError | null, device: Device | null) => {
        if (stopped) return;
        if (error) {
          stopped = true;
          try {
            this.manager.stopDeviceScan();
          } catch {}
          return reject(error);
        }
        if (!device) return;

        // Decide if device is a candidate
        // const soundwayDevice =
        //   (TARGET_DEVICE_ID && device.id === TARGET_DEVICE_ID) ||
        //   (TARGET_NAME_PREFIX && ((device.name ?? '') || (device.localName ?? '')).startsWith(TARGET_NAME_PREFIX)) ||
        //   (SERVICE_UUID && (device.serviceUUIDs ?? []).map((s) => s.toLowerCase()).includes(SERVICE_UUID.toLowerCase()));

        // const soundwayDevice = device.id === '8C:90:2D:A1:83:8C';

        console.log('Scanned device:', device.id, device.name);
        // const soundwayDevice = device.id === '40:8E:2C:46:C3:96';

        const soundwayDevice = device.name === 'King375';

        if (!soundwayDevice) return;

        const id = device.id;
        const now = Date.now();
        const rssi = device.rssi ?? null;

        const entry = observed.get(id) ?? { device, lastRssi: null, bestRssi: null, lastSeen: now };
        entry.device = device;
        entry.lastSeen = now;
        entry.lastRssi = rssi;
        if (rssi != null) {
          if (entry.bestRssi == null || rssi > entry.bestRssi) entry.bestRssi = rssi;
        }
        observed.set(id, entry);
      };

      // start scanning
      this.manager.startDeviceScan(null, { allowDuplicates: true }, onScan);

      // stop after scan window
      const timeout = setTimeout(async () => {
        stopped = true;
        try {
          this.manager.stopDeviceScan();
        } catch {}
        clearTimeout(timeout);

        if (observed.size === 0) return resolve();

        // choose the device with highest bestRssi
        let bestEntry: DeviceEntry | null = null;
        for (const entry of observed.values()) {
          const cmpRssi = entry.bestRssi ?? entry.lastRssi ?? -999;
          const bestRssi = bestEntry ? (bestEntry.bestRssi ?? bestEntry.lastRssi ?? -999) : -999;
          if (!bestEntry || cmpRssi > bestRsiToNumber(bestRssi)) bestEntry = entry;
        }
        if (!bestEntry) return resolve();

        try {
          // try connect
          const connected = await bestEntry.device.connect();
          await connected.discoverAllServicesAndCharacteristics();

          this.connectedDevice = connected;
          // this.onConnectionState?.(true);
          this.connectionListeners.forEach((cb) => cb(true));
          await this.storeDevice(connected);

          const initialRssi = bestEntry.lastRssi ?? bestEntry.bestRssi ?? null;
          const initialDistance = initialRssi == null ? null : bleDistanceCalculator.getDistance(initialRssi);
          // this.onDeviceUpdated?.(connected, initialDistance);
          this.deviceListeners.forEach((cb) => cb(connected, initialDistance));
          this.subscribeCharacteristic(connected).catch((e) => console.warn('subscribe failed', e));
          this.startRssiMonitoring(connected);

          return resolve();
        } catch (e) {
          console.warn('connect/discover failed:', e);
          return reject(e);
        }
      }, SCAN_MS);
    });

    function bestRsiToNumber(v: number | null): number {
      return v == null ? -999 : v;
    }
  }

  private async handleDeviceDisconnect() {
    console.warn('Device disconnected, restarting scan...');
    this.connectedDevice = null;
    this.connectionListeners.forEach((cb) => cb(false));
    bleDistanceCalculator.reset();

    // Restart auto-scan
    if (!this.stopRequested) {
      await this.startAutoScan();
    }
  }

  /**
   * Store the latest connected device to AsyncStorage (always kept)
   */
  private async storeDevice(device: Device): Promise<void> {
    try {
      const deviceInfo: Partial<Device> = {
        id: device.id,
        name: device.name,
        localName: device.localName,
      };

      await AsyncStorage.setItem(STORAGE_KEYS, JSON.stringify(deviceInfo));
    } catch (error) {
      console.warn('Failed to save latest device to AsyncStorage:', error);
    }
  }

  async getStoredDevice(): Promise<Device | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS);
      if (stored) {
        return JSON.parse(stored) as Device;
      }
    } catch (error) {
      console.warn('Failed to get latest device from AsyncStorage:', error);
    }
    return null;
  }

  private async subscribeCharacteristic(device: Device) {
    if (!SERVICE_UUID || !CHAR_UUID) return;
    try {
      this.sub = device.monitorCharacteristicForService(SERVICE_UUID, CHAR_UUID, (error, char) => {
        if (error) {
          console.warn('Char monitor error:', error);
          return;
        }
        const value = char?.value;
        if (!value) return;

        let decoded = '';
        try {
          decoded = Buffer.from(value, 'base64').toString('utf8');
        } catch {
          try {
            decoded = atob(value);
          } catch {
            decoded = '';
          }
        }
        if (decoded) this.zoneListeners.forEach((cb) => cb(decoded));
        //this.onZoneMessage?.(decoded);
      });
    } catch (e) {
      console.warn('subscribeCharacteristic failed:', e);
    }
  }

  private startRssiMonitoring(device: Device) {
    if (this.rssiInterval) clearInterval(this.rssiInterval);

    this.rssiInterval = setInterval(async () => {
      try {
        const isConnected = await device.isConnected();
        if (!isConnected) {
          clearInterval(this.rssiInterval);
          this.rssiInterval = null;
          this.connectedDevice = null;
          // this.onConnectionState?.(false);
          this.connectionListeners.forEach((cb) => cb(false));
          bleDistanceCalculator.reset();

          // if complicated remove
          if (!this.stopRequested) {
            await this.startAutoScan();
          }
          return;
        }

        // read RSSI
        const updated = await device.readRSSI();
        const rssi = updated.rssi ?? null;
        const dist = bleDistanceCalculator.getDistance(rssi);

        // this.onDeviceUpdated?.(device, dist);
        this.deviceListeners.forEach((cb) => cb(device, dist));
      } catch (err) {
        console.warn('RSSI read failed:', err);
      }
    }, RSSI_POLL_MS);
  }
}

export const bleService = new BleService();
export { CHAR_UUID, SERVICE_UUID, TARGET_DEVICE_ID, TARGET_NAME_PREFIX };
