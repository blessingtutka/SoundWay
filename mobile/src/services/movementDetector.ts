import { Accelerometer } from 'expo-sensors';

export type MovementStatus = 'still' | 'moving';

export class MovementDetector {
  private subscription: any = null;
  private threshold: number;
  private lastStatus: MovementStatus = 'still';
  public onStatusChanged: ((status: MovementStatus) => void) | null = null;

  constructor(threshold = 0.12) {
    // 0.08–0.14 is ideal for indoor walking detection
    this.threshold = threshold;
  }

  start() {
    Accelerometer.setUpdateInterval(150); // 6–10 Hz ideal
    this.subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(magnitude - 1); // gravity is ~1 G

      const status: MovementStatus = delta > this.threshold ? 'moving' : 'still';

      if (status !== this.lastStatus) {
        this.lastStatus = status;
        this.onStatusChanged?.(status);
      }
    });
  }

  stop() {
    this.subscription?.remove?.();
    this.subscription = null;
  }
}
