// ————— CONFIG —————
export interface DistanceConfig {
  txPower: number; // calibrated RSSI at 1m
  envFactor: number; // path-loss exponent (usually 2–3 indoors)
}

const DEFAULT_DISTANCE_CONFIG: DistanceConfig = {
  txPower: -59,
  envFactor: 2.3,
};

// ————— EXPONENTIAL MOVING AVERAGE —————
class ExpMovingAverage {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha = 0.7) {
    this.alpha = alpha;
  }

  add(v: number | null): number | null {
    if (v == null) return this.value;
    if (this.value == null) this.value = v;
    else this.value = this.alpha * v + (1 - this.alpha) * this.value;
    return this.value;
  }

  get(): number | null {
    return this.value;
  }

  reset() {
    this.value = null;
  }
}

// ————— KALMAN FILTER —————
class KalmanFilter {
  private R: number; // measurement noise
  private Q: number; // process noise
  private A = 1;
  private C = 1;
  private cov = NaN;
  private x = NaN;

  constructor(R = 2.0, Q = 0.05) {
    this.R = R;
    this.Q = Q;
  }

  filter(z: number): number {
    if (Number.isNaN(z)) return this.x;

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
  private ema: ExpMovingAverage;
  private kalman: KalmanFilter;
  private config: DistanceConfig;

  constructor(config: DistanceConfig = DEFAULT_DISTANCE_CONFIG, emaAlpha = 0.5) {
    this.config = config;
    this.ema = new ExpMovingAverage(emaAlpha);
    this.kalman = new KalmanFilter(2, 0.05);
  }

  public getDistance(rawRssi: number | null): number | null {
    if (rawRssi == null) return null;

    const smoothRssi = this.kalman.filter(this.ema.add(rawRssi)!);

    if (smoothRssi == null || Number.isNaN(smoothRssi)) return null;

    return this.rssiToDistance(smoothRssi);
  }

  private rssiToDistance(rssi: number): number {
    const { txPower, envFactor } = this.config;
    const exponent = (txPower - rssi) / (10 * envFactor);
    return Math.pow(10, exponent);
  }

  reset() {
    this.ema.reset();
    this.kalman.reset();
  }
}

// ————— EXPORT INSTANCE —————
export const bleDistanceCalculator = new DistanceCalculator(DEFAULT_DISTANCE_CONFIG, 0.5);
