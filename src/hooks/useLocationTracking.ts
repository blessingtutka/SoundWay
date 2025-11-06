import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export const useLocationTracking = () => {
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (pos) =>
          setCurrentLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
      );
    };

    startTracking();

    return () => {
      if (watcher) watcher.remove();
    };
  }, []);

  return { currentLocation };
};
