import React from 'react';
import { Button, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  routeInfo: any;
  navigationSteps: any[];
  isNavigating: boolean;
  onStart: () => void;
  onStop: () => void;
  recentDestinations: any[];
  onSelectRecent: (d: any) => void;
}

const ControlsPanel: React.FC<Props> = ({ routeInfo, navigationSteps, isNavigating, onStart, onStop, recentDestinations, onSelectRecent }) => (
  <View style={styles.container}>
    <Text style={styles.title}>OpenStreetMap Navigation</Text>
    {routeInfo && (
      <Text style={styles.text}>
        Distance: {routeInfo.distance} km | Time: {routeInfo.duration} min
      </Text>
    )}
    {!isNavigating ? (
      <Button title='Start Navigation' onPress={onStart} color='#4CAF50' />
    ) : (
      <Button title='Stop Navigation' onPress={onStop} color='#FF5252' />
    )}
    {recentDestinations.length > 0 && (
      <ScrollView horizontal>
        {recentDestinations.map((d, i) => (
          <TouchableOpacity key={i} onPress={() => onSelectRecent(d)}>
            <Text style={styles.recent}>{d.title?.split(',')[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 35,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  text: { marginBottom: 8 },
  recent: {
    backgroundColor: '#eee',
    padding: 6,
    marginRight: 6,
    borderRadius: 10,
  },
});

export default ControlsPanel;
