import * as Localization from 'expo-localization';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Vibration } from 'react-native';
import VoiceCommandManager, { AppFunctionInfo } from '../services/VoiceCommandManager';

const GVoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export const GVoiceAssistantProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [state, setState] = useState<VoiceAssistantState>({
    status: 'disconnected',
    isSessionActive: false,
    isListening: false,
    recognizedText: '',
    lastResponse: '',
    error: null,
  });

  const [functions, setFunctions] = useState<Map<string, AppFunction>>(new Map());

  const isProcessingCommand = useRef(false);

  const GOOGLE_AI_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY || '';

  const locales = Localization.getLocales();
  const safeLanguage = locales[0]?.languageTag || 'en-US';

  // init
  useEffect(() => {
    if (GOOGLE_AI_API_KEY) {
      VoiceCommandManager.init(GOOGLE_AI_API_KEY);
    }

    return () => {
      Speech.stop();
      stopListening();
    };
  }, [GOOGLE_AI_API_KEY]);

  // STT events
  useSpeechRecognitionEvent('start', () => {
    setState((s) => ({ ...s, isListening: true, error: null }));
  });

  useSpeechRecognitionEvent('end', () => {
    setState((s) => ({ ...s, isListening: false }));
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript;
    if (text && !isProcessingCommand.current) {
      setState((s) => ({
        ...s,
        recognizedText: text,
        isListening: false,
      }));
      processVoiceCommand(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setState((s) => ({
      ...s,
      error: event.message || 'Speech recognition error',
      isListening: false,
      status: 'disconnected',
    }));
  });

  // Mic permissions

  const requestMicPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    } catch {
      return false;
    }
  };

  //  STT start
  const startListening = async () => {
    try {
      const ok = await requestMicPermission();
      if (!ok) {
        setState((s) => ({
          ...s,
          error: 'Microphone permission denied',
        }));
        return false;
      }

      ExpoSpeechRecognitionModule.start({
        lang: safeLanguage,
        interimResults: true,
        continuous: false,
      });

      return true;
    } catch {
      setState((s) => ({
        ...s,
        error: 'Failed to start speech recognition',
        isListening: false,
      }));
      return false;
    }
  };

  // STT stop
  const stopListening = () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
  };

  // CMD process
  const processVoiceCommand = async (text: string) => {
    if (isProcessingCommand.current || !text.trim()) return;

    isProcessingCommand.current = true;

    try {
      const funcs: AppFunctionInfo[] = Array.from(functions.values()).map((fn) => ({
        name: fn.name,
        description: fn.description,
        examples: fn.examples,
      }));

      const command = await VoiceCommandManager.processCommand(text, funcs, {});

      setState((s) => ({
        ...s,
        lastResponse: command.response,
        error: null,
      }));

      if (command.executeCommand) {
        await executeCommand(command);
      }

      if (command.response) {
        await speak(command.response);
      }

      Vibration.vibrate(100);
    } catch (err: any) {
      const msg = `Command processing error: ${err.message}`;
      setState((s) => ({ ...s, error: msg }));
      await speak('Sorry, an error occurred processing your command.');
    } finally {
      isProcessingCommand.current = false;
    }
  };

  // CMD exec
  const executeCommand = async (cmd: VoiceCommand) => {
    const fn = functions.get(cmd.action);

    if (fn) {
      const result = await fn.handler(cmd.parameters);
      if (result) await speak(result);
      return;
    }

    switch (cmd.action) {
      case 'start_session':
        await startSession();
        break;
      case 'end_session':
        await endSession();
        break;
      default:
        console.warn('Unknown action:', cmd.action);
    }
  };

  // Sessions
  const startSession = async () => {
    await speak('Starting voice session…');
    console.log('clicked');

    const ok = await startListening();
    if (!ok) {
      setState((s) => ({
        ...s,
        error: 'Failed to start listening',
      }));
      return;
    }

    setState((s) => ({
      ...s,
      isSessionActive: true,
      status: 'connected',
      error: null,
    }));
  };

  const endSession = async () => {
    stopListening();
    setState((s) => ({
      ...s,
      isSessionActive: false,
      status: 'disconnected',
      isListening: false,
    }));
    await speak('Voice session ended.');
  };

  // tts
  const speak = async (text: string) => {
    if (!text.trim()) return;

    return new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        language: safeLanguage,
        rate: 0.9,
        pitch: 1.0,
        onDone: resolve,
        onError: reject,
      });
    });
  };

  // App functions
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
    <GVoiceAssistantContext.Provider
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
    </GVoiceAssistantContext.Provider>
  );
};

export const useGVoiceAssistant = () => {
  const ctx = useContext(GVoiceAssistantContext);
  if (!ctx) throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  return ctx;
};
