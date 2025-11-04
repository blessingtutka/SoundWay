import AppNavigator from '@/navigation/AppNavigator';
import { useColorScheme } from '@/providers/ThemeProvider';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import React from 'react';
import { LogBox, StatusBar } from 'react-native';
import 'react-native-gesture-handler';

import './assets/styles/global.css';

LogBox.ignoreLogs(['Require cycle:']);

export default function AppContent() {
  const colorScheme = useColorScheme();
  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      <AppNavigator />
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
    </NavigationContainer>
  );
}
