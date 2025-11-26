/**
 * BLEService with:
 * - REAL-TIME distance from scan events (no polling)
 * - Expo Accelerometer movement detection
 * - bleDistanceCalculator for RSSI→distance
 */

import { bleDistanceCalculator } from '@/utils/distanceCalculator';
import { Accelerometer } from 'expo-sensors';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleError, BleManager, Device } from 'react-native-ble-plx';

const TARGET_PREFIX = 'D'; // or ENV value

/* ------------------------------------------
   Movement Detector
------------------------------------------- */
class MovementDetector {
  private subscription: any = null;
  private threshold = 0.12;
  public isMoving = false;
  private lastState = false;
  public onChange: ((moving: boolean) => void) | null = null;

  start() {
    Accelerometer.setUpdateInterval(150);

    this.subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(magnitude - 1);

      const moving = delta > this.threshold;

      if (moving !== this.lastState) {
        this.lastState = moving;
        this.isMoving = moving;
        this.onChange?.(moving);
      }
    });
  }

  stop() {
    this.subscription?.remove?.();
    this.subscription = null;
  }
}

/* ------------------------------------------
   BLE SERVICE
------------------------------------------- */
class BleService {
  private manager: BleManager;
  private movement: MovementDetector;

  private connectedDevice: Device | null = null;
  private lastRssi: number | null = null;

  // callbacks
  onConnected: ((dev: Device) => void) | null = null;
  onDisconnected: (() => void) | null = null;
  onDistanceUpdate: ((dev: Device, rssi: number, distance: number) => void) | null = null;

  constructor() {
    this.manager = new BleManager();
    this.movement = new MovementDetector();

    this.movement.onChange = (moving) => {
      console.log('📱 Movement:', moving ? 'MOVING' : 'STILL');
    };
  }

  /* ------------------------------------------
     Permissions
------------------------------------------- */
  private async requestPermissions() {
    if (Platform.OS !== 'android') return;
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
  }

  /* ------------------------------------------
     Start scanning
------------------------------------------- */
  async start() {
    await this.requestPermissions();
    this.movement.start();

    this.manager.startDeviceScan(null, { allowDuplicates: true }, (error: BleError | null, device: Device | null) => {
      if (error) {
        console.warn('Scan error:', error);
        return;
      }
      if (!device || !device.name) return;

      if (!device.name.startsWith(TARGET_PREFIX)) return;

      this.handleScan(device);
    });

    console.log('🔍 BLE scanning started…');
  }

  /* ------------------------------------------
     Handle incoming BLE scan events (RSSI)
------------------------------------------- */
  private async handleScan(device: Device) {
    /* First detected → connect */
    if (!this.connectedDevice) {
      try {
        console.log('🔗 Connecting to', device.name);

        this.connectedDevice = await device.connect();
        await this.connectedDevice.discoverAllServicesAndCharacteristics();

        this.onConnected?.(this.connectedDevice);
        console.log('✅ Connected:', device.name);
      } catch (err) {
        console.warn('Connection failed:', err);
        return;
      }
    }

    // Only track RSSI from the connected device
    if (device.id !== this.connectedDevice.id) return;

    const rssi = device.rssi ?? null;
    if (rssi == null) return;

    // Only update distance when phone is moving
    if (!this.movement.isMoving) return;

    // Anti-jitter filter
    if (this.lastRssi != null && Math.abs(this.lastRssi - rssi) < 2) {
      return;
    }
    this.lastRssi = rssi;

    const distance = bleDistanceCalculator.getDistance(rssi) || 0;

    this.onDistanceUpdate?.(device, rssi, distance);
  }

  /* ------------------------------------------
     STOP SERVICE
------------------------------------------- */
  stop() {
    console.log('🛑 Stopping BLE service…');

    // Correct way to stop scanning
    this.manager.stopDeviceScan();

    this.movement.stop();

    if (this.connectedDevice) {
      this.connectedDevice.cancelConnection().catch(() => {});
      this.connectedDevice = null;
    }

    this.onDisconnected?.();
  }
}

export const bleService = new BleService();
