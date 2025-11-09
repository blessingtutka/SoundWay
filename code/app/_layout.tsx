import '@/assets/styles/global.css';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider, useUser } from '@/providers/UserProvider';
import { VoiceAssistantProvider, useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

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

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user, isLoading, isLoggedIn } = useUser();
  const { registerAppFunction, unregisterAppFunction } = useVoiceAssistant();

  const [loaded] = useFonts({
    SpaceMono: require('../src/assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    registerAppFunction('navigate_to_screen', {
      name: 'navigate_to_screen',
      description: 'Navigates to a specific screen by voice command',
      examples: ['go to login', 'open signup', 'back', 'go home'],
      handler: async ({ screen }: { screen?: string }) => {
        const lower = screen?.toLowerCase();

        if (isLoggedIn && (lower?.includes('login') || lower?.includes('signup') || lower?.includes('register') || lower?.includes('forgot'))) {
          return 'You are already logged in.';
        }

        if (lower?.includes('login')) router.navigate('/login');
        else if (lower?.includes('signup') || lower?.includes('register')) router.navigate('/signup');
        else if (lower?.includes('forgot')) router.navigate('/forgot');
        else if (lower?.includes('home') || lower?.includes('tabs')) router.navigate('/(tabs)');
        else if (lower?.includes('map')) router.navigate('/map');
        else if (lower?.includes('profile')) router.navigate('/profile');
        else if (lower?.includes('change') && lower?.includes('password')) router.navigate('/change');
        else if (lower?.includes('welcome')) router.navigate('/(pages)');
        else if (lower?.includes('back')) router.back();
        else return 'Unknown screen name.';

        return `Navigated to ${screen}`;
      },
    });

    return () => unregisterAppFunction('navigate_to_screen');
  }, [router, isLoggedIn]);

  if (!loaded || isLoading) return null;

  const initialRoute = isLoggedIn ? '(tabs)' : '(pages)';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? TransparentDarkTheme : CustomDefaultTheme}>
      <Stack initialRouteName={initialRoute}>
        <Stack.Screen name='(pages)' options={{ headerShown: false }} />
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen name='modal' options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name='+not-found' />
      </Stack>
      <StatusBar style='auto' />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <VoiceAssistantProvider>
        <RootLayoutContent />
      </VoiceAssistantProvider>
    </UserProvider>
  );
}
