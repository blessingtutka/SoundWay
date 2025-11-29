import * as Localization from 'expo-localization';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Vibration } from 'react-native';
import VoiceCommandManager, { AppFunctionInfo } from '../services/VoiceCommandManager';

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export const VoiceAssistantProvider: React.FC<{
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
  const debounceTimer = useRef<number | null>(null);

  const isProcessingCommand = useRef(false);
  const isSpeaking = useRef(false);

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
    // Don't process results while speaking
    if (isSpeaking.current) return;

    const text = event.results[0]?.transcript;
    if (!text) return;

    setState((s) => ({
      ...s,
      recognizedText: text,
    }));

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Wait for the user to stop speaking (800–1200 ms)
    debounceTimer.current = setTimeout(() => {
      if (!isProcessingCommand.current && !isSpeaking.current && text.trim()) {
        processVoiceCommand(text.trim());
      }
    }, 1000);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setState((s) => ({
      ...s,
      error: event.message || 'Speech recognition error',
      isListening: false,
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

  // STT start
  const startListening = async () => {
    try {
      if (isSpeaking.current) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return startListening();
      }

      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        setState((s) => ({
          ...s,
          error: 'Microphone permission denied',
        }));
        return false;
      }

      ExpoSpeechRecognitionModule.start({
        lang: safeLanguage,
        interimResults: true,
        continuous: true,
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
      isSpeaking.current = false;
      isProcessingCommand.current = false;

      ExpoSpeechRecognitionModule.stop();
      ExpoSpeechRecognitionModule.abort && ExpoSpeechRecognitionModule.abort();
      ExpoSpeechRecognitionModule.destroy && ExpoSpeechRecognitionModule.destroy();

      setState((s) => ({ ...s, isListening: false }));
    } catch (e) {
      console.warn('Stop listening error', e);
    }
  };

  // CMD process
  const processVoiceCommand = async (text: string) => {
    if (isProcessingCommand.current || !text.trim() || isSpeaking.current) return;

    isProcessingCommand.current = true;

    try {
      const funcs: AppFunctionInfo[] = Array.from(functions.values()).map((fn) => ({
        name: fn.name,
        description: fn.description,
        examples: fn.examples,
        parameters: fn.parameters,
      }));

      const command = await VoiceCommandManager.processCommand(text, funcs, {});

      setState((s) => ({
        ...s,
        lastResponse: command.response,
        error: null,
      }));

      // Stop listening before speaking
      stopListening();

      if (command.executeCommand) {
        await executeCommand(command);
      } else if (command.response) {
        await speak(command.response);
      }

      Vibration.vibrate(100);

      if (state.isSessionActive) {
        setTimeout(() => {
          if (state.isSessionActive && !isSpeaking.current) {
            startListening();
          }
        }, 500);
      }
    } catch (err: any) {
      const msg = `Command processing error: ${err.message}`;
      setState((s) => ({ ...s, error: msg }));
    } finally {
      isProcessingCommand.current = false;
    }
  };

  // CMD exec
  const executeCommand = async (cmd: VoiceCommand) => {
    const fn = functions.get(cmd.action);

    if (fn) {
      const result = await fn.handler(cmd.parameters);
      const responseText = cmd.response || result;
      if (responseText) {
        await speak(responseText);
      }
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

  //TTS
  const speak = async (text: string): Promise<void> => {
    if (!text.trim() || isSpeaking.current) return;

    isSpeaking.current = true;
    Speech.stop();

    return new Promise<void>((resolve) => {
      Speech.speak(text, {
        language: safeLanguage,
        rate: 0.9,
        pitch: 1.0,
        onDone: () => {
          isSpeaking.current = false;
          resolve();
        },
        onError: () => {
          isSpeaking.current = false;
          resolve();
        },
        onStart: () => {
          stopListening();
        },
      });
    });
  };

  // Sessions
  const startSession = async () => {
    console.log('Starting voice session…');

    await speak('Starting voice session…').catch(console.error);

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
    isProcessingCommand.current = false;
    isSpeaking.current = false;

    Speech.stop();
    stopListening();

    setState({
      status: 'disconnected',
      isSessionActive: false,
      isListening: false,
      recognizedText: '',
      lastResponse: '',
      error: null,
    });

    await speak('Voice session ended.');
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
    <VoiceAssistantContext.Provider
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
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  return ctx;
};
