import { useConversation } from '@elevenlabs/react-native';
import * as Localization from 'expo-localization';
import * as Speech from 'expo-speech';
import React, { createContext, useContext, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

const EVoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export const EVoiceAssistantProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [state, setState] = useState<VoiceAssistantState>({
    status: 'disconnected',
    recognizedText: '',
    lastResponse: '',
    error: null,
    isSessionActive: false,
  });

  const [functions, setFunctions] = useState<Map<string, AppFunction>>(new Map());

  const AGENT_ID = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID || '';
  const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLAB_API_KEY;

  const locales = Localization.getLocales();
  const safeLanguage = locales[0]?.languageTag || 'en-US';

  const getConversationToken = async () => {
    try {
      const url = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(AGENT_ID)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      setState((s) => ({ ...s, error: String(error) }));
      throw error;
    }
  };

  const conversation = useConversation({
    onConnect: () => setState((s) => ({ ...s, status: 'connected' })),
    onDisconnect: () => setState((s) => ({ ...s, status: 'disconnected' })),
    onError: (err: any) => {
      setState((s) => ({ ...s, error: String(err) }));
    },

    onMessage: (msg: any) => {
      const content = msg?.content;
      if (typeof content === 'string') {
        setState((s) => ({ ...s, lastResponse: content }));
        speak(content);
      }
    },

    clientTools: Object.fromEntries(
      Array.from(functions.entries()).map(([name, fn]) => [
        name,
        async (params: any) => {
          try {
            return await fn.handler(params);
          } catch (err: any) {
            return `Error: ${err.message}`;
          }
        },
      ]),
    ),
  });

  const requestMicPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startSession = async () => {
    try {
      const token = await getConversationToken();
      const mic = await requestMicPermission();
      if (!mic) {
        setState((s) => ({
          ...s,
          error: 'Microphone permission denied',
        }));
        return;
      }
      await conversation.startSession({
        conversationToken: token,
        agentId: AGENT_ID,
        dynamicVariables: { platform: Platform.OS },
      });

      setState((s) => ({ ...s, isSessionActive: true }));
    } catch (err: any) {
      setState((s) => ({ ...s, error: String(err) }));
    }
  };

  const endSession = async () => {
    try {
      await conversation.endSession();
      setState((s) => ({ ...s, isSessionActive: false }));
    } catch (err: any) {
      setState((s) => ({ ...s, error: String(err) }));
    }
  };

  const speak = async (text: string) => {
    if (!text) return;
    return new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        language: safeLanguage,
        onDone: () => resolve(),
        onError: reject,
      });
    });
  };

  const registerAppFunction = (fn: AppFunction) => {
    setFunctions((prev) => {
      const map = new Map(prev);
      map.set(fn.name, fn);
      return map;
    });
  };

  const unregisterAppFunction = (name: string) => {
    setFunctions((prev) => {
      const map = new Map(prev);
      map.delete(name);
      return map;
    });
  };

  return (
    <EVoiceAssistantContext.Provider
      value={{
        state,
        startSession,
        endSession,
        speak,
        registerAppFunction,
        unregisterAppFunction,
      }}
    >
      {children}
    </EVoiceAssistantContext.Provider>
  );
};

export const useEVoiceAssistant = () => {
  const ctx = useContext(EVoiceAssistantContext);
  if (!ctx) {
    throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  }
  return ctx;
};
