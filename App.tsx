import AppContent from '@/AppContent';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { UserProvider } from '@/providers/UserProvider';
import { VoiceAssistantProvider } from '@/providers/VoiceAssistanteProvider';
import { LoadingScreen } from '@/screens/LoadingScreen';
import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import 'react-native-gesture-handler';

import './src/assets/styles/global.css';

LogBox.ignoreLogs(['Require cycle:']);

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await loadFonts();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const loadFonts = async () => {
    return true;
  };

  if (!appIsReady) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <VoiceAssistantProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </VoiceAssistantProvider>
    </ThemeProvider>
  );
}
