import * as Localization from 'expo-localization';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import VoiceCommandManager, { AppFunctionInfo } from '@/services/VoiceCommandManager';

type VoiceAssistantProviderProps = {
  children: React.ReactNode;
};

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export const VoiceAssistantProvider = ({ children }: VoiceAssistantProviderProps) => {
  const [state, setState] = useState<VoiceAssistantState>({
    status: 'disconnected',
    isSessionActive: false,
    isListening: false,
    recognizedText: '',
    lastResponse: '',
    error: null,
  });

  const [functions, setFunctions] = useState<Map<string, AppFunction>>(new Map());

  const debounceTimer = useRef<NodeJS.Timeout | number | null>(null);

  const processingRef = useRef(false);
  const isSpeaking = useRef(false);
  const speechInProgress = useRef<Promise<void> | null>(null);

  const GOOGLE_AI_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY || '';

  const locales = Localization.getLocales();
  const safeLanguage = locales[0]?.languageTag || 'en-US';

  // Initialize
  useEffect(() => {
    if (GOOGLE_AI_API_KEY) VoiceCommandManager.init(GOOGLE_AI_API_KEY);

    return () => {
      Speech.stop();
      stopSTT();
    };
  }, [GOOGLE_AI_API_KEY]);

  // STT events
  useSpeechRecognitionEvent('start', () => {
    setState((s) => ({ ...s, isListening: true, error: null }));
  });

  useSpeechRecognitionEvent('end', () => {
    setState((s) => ({ ...s, isListening: false }));
  });

  useSpeechRecognitionEvent('error', (event) => {
    setState((s) => ({
      ...s,
      isListening: false,
      error: event.message ?? 'Speech recognition error',
    }));
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript;
    if (!text) return;

    setState((s) => ({ ...s, recognizedText: text }));
    console.log('✅ recognizedText:', text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current as NodeJS.Timeout);

    debounceTimer.current = setTimeout(async () => {
      if (!processingRef.current && !isSpeaking.current && text.trim()) {
        processCommand(text.trim());
      }
    }, 1500);
  });

  // Permission request
  const requestMicPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return res.granted;
    } catch {
      return false;
    }
  };

  // STT control
  const startSTT = async () => {
    try {
      if (isSpeaking.current) {
        await speechInProgress.current;
      }

      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        setState((s) => ({ ...s, error: 'Microphone permission denied' }));
        return false;
      }

      try {
        ExpoSpeechRecognitionModule.start({
          lang: safeLanguage,
          interimResults: true,
          continuous: true,
        });
        return true;
      } catch (err) {
        console.error('STT start error:', err);
        setState((s) => ({ ...s, error: 'Failed to start speech recognition' }));
        return false;
      }
    } catch (err) {
      console.error('Error waiting for speech to finish:', err);
      return false;
    }
  };

  const stopSTT = () => {
    try {
      processingRef.current = false;
      ExpoSpeechRecognitionModule.stop();
      setState((s) => ({ ...s, isListening: false }));
    } catch {
      // silent expected STT stop errors
    }
  };

  // COMMAND PROCESSING
  const processCommand = async (text: string) => {
    if (processingRef.current || !text.trim() || isSpeaking.current) return;

    processingRef.current = true;

    try {
      const metadata: AppFunctionInfo[] = [...functions.values()].map((fn) => ({
        name: fn.name,
        description: fn.description,
        examples: fn.examples,
        parameters: fn.parameters,
      }));

      const command = await VoiceCommandManager.processCommand(text, metadata, {});

      setState((s) => ({ ...s, lastResponse: command.response, error: null }));

      if (command.executeCommand) {
        await executeCommand(command);
      } else if (command.response) {
        await speak(command.response);
      }

      // Restart listening after processing
      if (state.isSessionActive) {
        setTimeout(() => {
          if (state.isSessionActive && !isSpeaking.current) {
            startSTT();
          }
        }, 500);
      }
    } catch (err: any) {
      setState((s) => ({
        ...s,
        error: `Command processing error: ${err.message}`,
      }));
      // Still restart listening on error
      if (state.isSessionActive) {
        setTimeout(() => startSTT(), 500);
      }
    } finally {
      processingRef.current = false;
    }
  };

  // COMMAND EXECUTION
  const executeCommand = async (cmd: VoiceCommand) => {
    const fn = functions.get(cmd.action);

    if (fn) {
      const result = await fn.handler(cmd.parameters);
      if (cmd.response || result) {
        await speak(cmd.response || result || '');
      }
      return;
    }

    switch (cmd.action) {
      case 'start_session':
        return startSession();
      case 'end_session':
        return endSession();
      default:
        console.warn('Unknown action:', cmd.action);
        if (cmd.response) {
          await speak(cmd.response);
        }
    }
  };

  // TTS - Fixed implementation
  const speak = async (text: string): Promise<void> => {
    if (!text.trim()) return Promise.resolve();

    console.log('TTS speaking:', text);

    // Stop any ongoing speech and STT
    Speech.stop();
    stopSTT();

    isSpeaking.current = true;

    return new Promise<void>((resolve, reject) => {
      const onDone = () => {
        isSpeaking.current = false;
        speechInProgress.current = null;
        console.log('TTS finished');
        resolve();
      };

      const onError = (error: any) => {
        isSpeaking.current = false;
        speechInProgress.current = null;
        console.error('TTS error:', error);
        setState((s) => ({
          ...s,
          error: `TTS error: ${error.message || 'Unknown error'}`,
        }));
        reject(error);
      };

      try {
        // Store the promise
        speechInProgress.current = new Promise((resolve, reject) => {
          const speechOptions = {
            language: safeLanguage,
            rate: 0.9,
            pitch: 1.0,
            onDone: () => {
              onDone();
              resolve();
            },
            onStopped: onDone,
            onError: (error: any) => {
              onError(error);
              reject(error);
            },
          };

          Speech.speak(text, speechOptions);
        });

        // Return the promise
        return speechInProgress.current;
      } catch (error: any) {
        onError(error);
        return Promise.reject(error);
      }
    });
  };

  // SESSION CONTROL
  const startSession = async () => {
    console.log('Starting voice session...');

    // Set connecting state first
    setState((s) => ({
      ...s,
      status: 'connecting',
      isSessionActive: true,
      error: null,
    }));

    try {
      // Start TTS first
      await speak('Voice assistant session started. How can I help you?');

      // Then start STT
      const ok = await startSTT();

      if (ok) {
        setState((s) => ({
          ...s,
          status: 'connected',
          isSessionActive: true,
          error: null,
        }));
      } else {
        setState((s) => ({
          ...s,
          status: 'disconnected',
          isSessionActive: false,
        }));
      }
    } catch (error) {
      console.error('Error starting session:', error);
      setState((s) => ({
        ...s,
        status: 'disconnected',
        isSessionActive: false,
        error: 'Failed to start session',
      }));
    }
  };

  const endSession = async () => {
    console.log('Ending voice session...');

    setState((s) => ({
      ...s,
      status: 'disconnecting',
    }));

    try {
      // Stop everything first
      Speech.stop();
      stopSTT();
      ExpoSpeechRecognitionModule.abort();

      // Wait a bit before speaking goodbye
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Speak goodbye (optional - you can remove this if it's causing issues)
      try {
        await speak('Voice assistant session ended. Goodbye!');
      } catch {
        // Ignore TTS errors during shutdown
      }
    } finally {
      setState({
        status: 'disconnected',
        isSessionActive: false,
        isListening: false,
        recognizedText: '',
        lastResponse: '',
        error: null,
      });
    }
  };

  // APP FUNCTION REGISTRATION
  const registerAppFunction = (fn: AppFunction) => {
    setFunctions((prev) => {
      const m = new Map(prev);
      m.set(fn.name, fn);
      return m;
    });
  };

  const unregisterAppFunction = (name: string) => {
    setFunctions((prev) => {
      const m = new Map(prev);
      m.delete(name);
      return m;
    });
  };

  return (
    <VoiceAssistantContext.Provider
      value={{
        state,
        speak,
        startSession,
        endSession,
        registerAppFunction,
        unregisterAppFunction,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};

// HOOK
export const useVoiceAssistant = () => {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  return ctx;
};
