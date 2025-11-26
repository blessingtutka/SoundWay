/**
 * Stable BLE distance estimation and service. (AI USE)
 *
 * - MovingAverage (avg -> Kalman) pipeline for stable & responsive distance while moving
 * - Kalman tuned for noisy RSSI (R=measurement noise, Q=process noise)
 * - Configurable device selector (by id, name prefix, or service UUID)
 * - Safe RSSI polling + robust cleanup
 *
 */

// ————— CONFIG —————
export interface DistanceConfig {
  txPower: number; // calibrated RSSI @ 1m
  envFactor: number; // path-loss exponent
}

const DEFAULT_DISTANCE_CONFIG: DistanceConfig = {
  txPower: -59,
  envFactor: 2.3,
};

// ————— FILTERS —————
class MovingAverage {
  private size: number;
  private values: number[];
  constructor(size = 10) {
    this.size = Math.max(1, Math.floor(size));
    this.values = [];
  }

  // Ignore nulls — return current average or NaN if no samples.
  add(value: number | null): number {
    if (value == null || Number.isNaN(value)) {
      return this.get();
    }
    this.values.push(value);
    if (this.values.length > this.size) this.values.shift();
    return this.get();
  }

  get(): number {
    if (this.values.length === 0) return NaN;
    const sum = this.values.reduce((a, b) => a + b, 0);
    return sum / this.values.length;
  }

  clear() {
    this.values = [];
  }
}

class KalmanFilter {
  private R: number; // measurement noise
  private Q: number; // process noise
  private A: number;
  private C: number;
  private cov: number;
  private x: number;

  // Use R relatively large for noisy RSSI, Q small to allow smooth tracking.
  constructor(R = 4.0, Q = 0.01) {
    this.R = R;
    this.Q = Q;
    this.A = 1;
    this.C = 1;
    this.cov = NaN;
    this.x = NaN;
  }

  // z may be NaN -> return previous estimate (or NaN if none)
  filter(z: number): number {
    if (Number.isNaN(z)) {
      return this.x;
    }

    if (Number.isNaN(this.x)) {
      this.x = z;
      this.cov = 1;
      return this.x;
    }

    // prediction
    const predX = this.A * this.x;
    const predCov = this.A * this.cov * this.A + this.Q;

    // kalman gain
    const K = (predCov * this.C) / (this.C * predCov * this.C + this.R);

    // correction
    this.x = predX + K * (z - this.C * predX);
    this.cov = predCov - K * this.C * predCov;

    return this.x;
  }

  reset() {
    this.cov = NaN;
    this.x = NaN;
  }
}

// ————— DISTANCE CALCULATOR —————
export class DistanceCalculator {
  private avgFilter: MovingAverage;
  private kalman: KalmanFilter;
  private config: DistanceConfig;

  constructor(config: DistanceConfig = DEFAULT_DISTANCE_CONFIG, avgWindowSize = 8) {
    this.config = config;
    this.avgFilter = new MovingAverage(avgWindowSize);
    this.kalman = new KalmanFilter(/* R */ 4.0, /* Q */ 0.01);
  }

  // Accepts number | null. Returns meters or null if not computable.
  public getDistance(rawRssi: number | null): number | null {
    if (rawRssi == null || Number.isNaN(rawRssi)) return null;

    // Order: Moving Average -> Kalman
    const avgRssi = this.avgFilter.add(rawRssi); // may be NaN if no data yet
    const smoothed = this.kalman.filter(avgRssi);

    if (smoothed == null || Number.isNaN(smoothed)) return null;

    return this.rssiToDistance(smoothed);
  }

  private rssiToDistance(rssi: number): number {
    const { txPower, envFactor } = this.config;
    const exponent = (txPower - rssi) / (10 * envFactor);
    return Math.pow(10, exponent);
  }

  reset() {
    this.avgFilter.clear();
    this.kalman.reset();
  }
}

export const bleDistanceCalculator = new DistanceCalculator(DEFAULT_DISTANCE_CONFIG, 8);
