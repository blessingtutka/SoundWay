import { Magnetometer } from 'expo-sensors';
import { useEffect, useState } from 'react';

export function useHeading() {
  const [heading, setHeading] = useState(0);

  function toDegrees(rad: number) {
    return rad * (180 / Math.PI);
  }

  // Convert magnetometer x/y to compass heading
  function computeHeading({ x, y }: { x: number; y: number }) {
    let angle = Math.atan2(y, x);
    let deg = toDegrees(angle);
    if (deg < 0) deg += 360;
    return deg;
  }

  useEffect(() => {
    Magnetometer.setUpdateInterval(100);

    const subscription = Magnetometer.addListener((data) => {
      if (!data) return;
      const deg = computeHeading(data);
      setHeading(deg);
    });

    return () => subscription.remove();
  }, []);

  return heading;
}
