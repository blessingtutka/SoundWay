/* eslint-disable react-native/split-platform-components */
import Voice from '@react-native-voice/voice';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  AppStateStatus,
  PermissionsAndroid,
  Platform,
  Vibration,
} from 'react-native';
import Config from "react-native-config";
import Tts from 'react-native-tts';
import VoiceCommandManager, { AppFunctionInfo } from '../services/VoiceCommandManager';

// USE AI

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

  // 🔧 Initialization
  useEffect(() => {
    const init = async () => {
      try {
        await requestPermissions();

        Tts.setDefaultRate(0.9);
        Tts.setDefaultPitch(1.0);
        Tts.setDefaultLanguage('en-US');
        Tts.addEventListener('tts-start', () =>
          setState(s => ({ ...s, isSpeaking: true })),
        );
        Tts.addEventListener('tts-finish', () =>
          setState(s => ({ ...s, isSpeaking: false })),
        );
        Tts.addEventListener('tts-error', () =>
          setState(s => ({ ...s, isSpeaking: false })),
        );

        Voice.onSpeechStart = () =>
          setState(s => ({ ...s, isListening: true }));
        Voice.onSpeechEnd = () =>
          setState(s => ({ ...s, isListening: false }));
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechError = onSpeechError;

        VoiceCommandManager.init(Config.GOOGLE_AI_API_KEY || '');

        AppState.addEventListener('change', handleAppStateChange);
        setState(s => ({ ...s, isInitialized: true }));
      } catch (err: any) {
        setState(s => ({
          ...s,
          error: `Init failed: ${err.message}`,
        }));
      }
    };
    init();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-error');
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED)
        throw new Error('Microphone permission denied');
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
  if (
    appState.current.match(/inactive|background/) &&
    nextAppState === 'active' &&
    state.isAlwaysListening
  ) {
    startListening();
  }
  appState.current = nextAppState;
};

  const onSpeechResults = async (e: any) => {
    const text = e.value?.[0] || '';
    setState(s => ({ ...s, recognizedText: text }));
    if (text.trim()) await processVoiceCommand(text);
  };

  const onSpeechError = (e: any) => {
    const msg = e.error?.message || e.message || 'Unknown speech error';
    setState(s => ({ ...s, error: msg, isListening: false }));
    notifyError(msg);
  };

  const processVoiceCommand = async (text: string) => {
    try {
      const funcs: AppFunctionInfo[] = Array.from(appFunctions.current.values()).map(f => ({
        name: f.name,
        description: f.description,
        examples: f.examples,
      }));

      const command = await VoiceCommandManager.processCommand(
        text,
        funcs,
        Object.fromEntries(appContext.current),
      );

      setState(s => ({ ...s, lastResponse: command.response }));
      notifyCommand(command);

      if (command.executeCommand) await executeCommand(command);
      if (command.response) await speak(command.response);

      Vibration.vibrate(150);
    } catch (err: any) {
      const msg = `Command error: ${err.message}`;
      setState(s => ({ ...s, error: msg }));
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

  // 🎤 Voice Control
  const startListening = async () => {
    try {
      await Voice.start('en-US');
      Vibration.vibrate(100);
    } catch (err: any) {
      notifyError(`Start listening failed: ${err.message}`);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (err: any) {
      notifyError(`Stop listening failed: ${err.message}`);
    }
  };

  const toggleAlwaysListening = async () => {
    const newState = !state.isAlwaysListening;
    setState(s => ({ ...s, isAlwaysListening: newState }));
    await speak(
      newState
        ? 'Always listening activated. Say assistant to wake me up.'
        : 'Always listening deactivated.',
    );
  };

  // 🔊 Speech
  const speak = async (text: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!text) return reject(new Error('Empty TTS input'));
      const onFinish = () => {
        cleanup();
        resolve();
      };
      const onError = (err: any) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        Tts.removeEventListener('tts-finish', onFinish);
        Tts.removeEventListener('tts-error', onError);
      };
      Tts.addEventListener('tts-finish', onFinish);
      Tts.addEventListener('tts-error', onError);
      Tts.speak(text);
    });
  };

  const stopSpeaking = () => Tts.stop();

  // 📦 App Functions & Context
  const registerAppFunction = (name: string, fn: AppFunction) =>
    appFunctions.current.set(name, fn);
  const unregisterAppFunction = (name: string) =>
    appFunctions.current.delete(name);
  const getAvailableFunctions = () => new Map(appFunctions.current);
  const updateContext = (key: string, value: any) =>
    appContext.current.set(key, value);
  const getContext = (key: string) => appContext.current.get(key);

  // 📡 Event Subscription
  const subscribeToCommands = (cb: (cmd: VoiceCommand) => void) => {
    commandSubscribers.current.add(cb);
    return () => commandSubscribers.current.delete(cb);
  };
  const subscribeToErrors = (cb: (err: string) => void) => {
    errorSubscribers.current.add(cb);
    return () => errorSubscribers.current.delete(cb);
  };
  const notifyCommand = (cmd: VoiceCommand) =>
    commandSubscribers.current.forEach(cb => cb(cmd));
  const notifyError = (err: string) =>
    errorSubscribers.current.forEach(cb => cb(err));

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
      }}>
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) throw new Error('useVoiceAssistant must be used within provider');
  return ctx;
};
