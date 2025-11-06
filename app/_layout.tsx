import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { UserProvider, useUser } from '@/providers/UserProvider';
import { VoiceAssistantProvider } from '@/providers/VoiceAssistanteProvider';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useColorScheme } from '@/hooks/use-color-scheme';

import '@/assets/styles/global.css';

export const unstable_settings = {
  anchor: '(tabs)',
};

const TransparentDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    text: '#FFFFFF',
  },
};

const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    placeholder: '#808080',
    text: DefaultTheme.colors.text,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading, isLoggedIn } = useUser();

  const [loaded] = useFonts({
    SpaceMono: require('../src/assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded || isLoading) {
    return null; // Or a splash screen
  }

  const initialRoute = isLoggedIn ? '(tabs)' : '(pages)';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? TransparentDarkTheme : CustomDefaultTheme}>
      <UserProvider>
        <VoiceAssistantProvider>
          <Stack initialRouteName={initialRoute}>
            <Stack.Screen name='(pages)' options={{ headerShown: false }} />
            <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
            <Stack.Screen name='modal' options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name='+not-found' />
          </Stack>
          <StatusBar style='auto' />
        </VoiceAssistantProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
