import React, { useEffect, useState } from 'react';
import { Dimensions, PermissionsAndroid, Platform, StyleSheet, View } from 'react-native';

import MapView, { MapPressEvent, Marker, Polyline, UrlTile } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

async function requestLocationPermission() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location Permission',
      message: 'This app needs access to your location to show it on the map.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

interface MapViewProps {
  currentLocation: Coordinate | null;
  destination: Location | null;
  routeCoordinates: Coordinate[];
  onPress?: (e: MapPressEvent) => void;
}

const MapViewer: React.FC<MapViewProps> = ({ currentLocation, destination, routeCoordinates, onPress }) => {
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  useEffect(() => {
    requestLocationPermission().then(setHasLocationPermission);
  }, []);

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        provider={undefined}
        showsUserLocation={hasLocationPermission}
        initialRegion={{
          latitude: currentLocation?.latitude || 40.7128,
          longitude: currentLocation?.longitude || -74.006,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={onPress}
      >
        <UrlTile urlTemplate={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} maximumZ={19} />
        {destination && <Marker coordinate={destination} title={destination.title} description='Destination' pinColor='red' />}
        {routeCoordinates.length > 0 && <Polyline coordinates={routeCoordinates} strokeColor='#1E90FF' strokeWidth={6} />}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: { flex: 1 },
  map: { width, height },
});

export default MapViewer;
