import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import * as Speech from 'expo-speech';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform, Vibration } from 'react-native';
import VoiceCommandManager, { AppFunctionInfo } from '../services/VoiceCommandManager';

// Types
export interface VoiceCommand {
  intent: string;
  action: string;
  parameters: Record<string, any>;
  response: string;
  executeCommand: boolean;
}

export interface VoiceAssistantState {
  isListening: boolean;
  isAlwaysListening: boolean;
  recognizedText: string;
  lastResponse: string;
  isSpeaking: boolean;
  isInitialized: boolean;
  error: string | null;
}

export interface AppFunction {
  name: string;
  description: string;
  handler: (params: any) => Promise<string>;
  examples: string[];
}

interface VoiceAssistantContextType {
  state: VoiceAssistantState;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  toggleAlwaysListening: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  registerAppFunction: (name: string, fn: AppFunction) => void;
  unregisterAppFunction: (name: string) => void;
  getAvailableFunctions: () => Map<string, AppFunction>;
  updateContext: (key: string, value: any) => void;
  getContext: (key: string) => any;
  subscribeToCommands: (cb: (cmd: VoiceCommand) => void) => () => void;
  subscribeToErrors: (cb: (err: string) => void) => () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | null>(null);

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    isAlwaysListening: false,
    recognizedText: '',
    lastResponse: '',
    isSpeaking: false,
    isInitialized: false,
    error: null,
  });

  const appFunctions = useRef(new Map<string, AppFunction>());
  const appContext = useRef(new Map<string, any>());
  const commandSubscribers = useRef(new Set<(cmd: VoiceCommand) => void>());
  const errorSubscribers = useRef(new Set<(err: string) => void>());
  const appState = useRef(AppState.currentState);

  const locales = Localization.getLocales();
  const safeLanguage = locales[0]?.languageTag || 'en-US';
  const GOOGLE_AI_API_KEY = Constants?.expoConfig?.extra?.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';

  // Init
  useEffect(() => {
    const init = async () => {
      try {
        VoiceCommandManager.init(GOOGLE_AI_API_KEY);
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        setState((s) => ({ ...s, isInitialized: true }));

        return () => subscription.remove();
      } catch (err: any) {
        setState((s) => ({ ...s, error: `Init failed: ${err.message}` }));
      }
    };

    const cleanupPromise = init();
    return () => {
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, []);

  // App state
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active' && state.isAlwaysListening) {
      startListening();
    }
    appState.current = nextAppState;
  };

  // STT Stub
  const startListening = async () => {
    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = safeLanguage;
      recognition.onstart = () => setState((s) => ({ ...s, isListening: true, recognizedText: '' }));
      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setState((s) => ({ ...s, recognizedText: text, isListening: false }));
        await processVoiceCommand(text);
      };
      recognition.onerror = (err: any) => {
        setState((s) => ({ ...s, error: err.message, isListening: false }));
        notifyError(err.message);
      };
      recognition.start();
    } else {
      await speak('Speech recognition not supported on this device.');
    }
  };

  const stopListening = async () => {
    setState((s) => ({ ...s, isListening: false }));
  };

  // Process command
  const processVoiceCommand = async (text: string) => {
    try {
      const funcs: AppFunctionInfo[] = Array.from(appFunctions.current.values()).map((f) => ({
        name: f.name,
        description: f.description,
        examples: f.examples,
      }));

      const command = await VoiceCommandManager.processCommand(text, funcs, Object.fromEntries(appContext.current));

      setState((s) => ({ ...s, lastResponse: command.response }));
      notifyCommand(command);

      if (command.executeCommand) await executeCommand(command);
      if (command.response) await speak(command.response);
      Vibration.vibrate(100);
    } catch (err: any) {
      const msg = `Command error: ${err.message}`;
      setState((s) => ({ ...s, error: msg }));
      notifyError(msg);
      await speak('Sorry, I encountered an error.');
    }
  };

  const executeCommand = async (cmd: VoiceCommand) => {
    const fn = appFunctions.current.get(cmd.action);
    if (fn) {
      try {
        const result = await fn.handler(cmd.parameters);
        if (result) await speak(result);
      } catch (err: any) {
        await speak(`Error executing ${cmd.action}: ${err.message}`);
      }
    } else {
      switch (cmd.action) {
        case 'start_listening':
          await startListening();
          break;
        case 'stop_listening':
          await stopListening();
          break;
        case 'toggle_always_listening':
          await toggleAlwaysListening();
          break;
        default:
          console.warn(`No handler for action: ${cmd.action}`);
      }
    }
  };

  const toggleAlwaysListening = async () => {
    const newState = !state.isAlwaysListening;
    setState((s) => ({ ...s, isAlwaysListening: newState }));
    await speak(newState ? 'Always listening activated.' : 'Always listening deactivated.');
  };

  // Expo Speech (TTS)
  const speak = async (text: string) =>
    new Promise<void>((resolve, reject) => {
      if (!text) return reject(new Error('Empty text'));
      Speech.speak(text, {
        language: safeLanguage,
        rate: 0.9,
        onDone: () => resolve(),
        onError: (err: any) => reject(err),
      });
      setState((s) => ({ ...s, isSpeaking: true }));
    });

  const stopSpeaking = () => {
    Speech.stop();
    setState((s) => ({ ...s, isSpeaking: false }));
  };

  // Context / function registry
  const registerAppFunction = (name: string, fn: AppFunction) => appFunctions.current.set(name, fn);
  const unregisterAppFunction = (name: string) => appFunctions.current.delete(name);
  const getAvailableFunctions = () => new Map(appFunctions.current);
  const updateContext = (key: string, value: any) => appContext.current.set(key, value);
  const getContext = (key: string) => appContext.current.get(key);

  // Event subscriptions
  const subscribeToCommands = (cb: (cmd: VoiceCommand) => void) => {
    commandSubscribers.current.add(cb);
    return () => commandSubscribers.current.delete(cb);
  };
  const subscribeToErrors = (cb: (err: string) => void) => {
    errorSubscribers.current.add(cb);
    return () => errorSubscribers.current.delete(cb);
  };
  const notifyCommand = (cmd: VoiceCommand) => commandSubscribers.current.forEach((cb) => cb(cmd));
  const notifyError = (err: string) => errorSubscribers.current.forEach((cb) => cb(err));

  return (
    <VoiceAssistantContext.Provider
      value={{
        state,
        startListening,
        stopListening,
        toggleAlwaysListening,
        speak,
        stopSpeaking,
        registerAppFunction,
        unregisterAppFunction,
        getAvailableFunctions,
        updateContext,
        getContext,
        subscribeToCommands,
        subscribeToErrors,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) throw new Error('useVoiceAssistant must be used within provider');
  return ctx;
};
