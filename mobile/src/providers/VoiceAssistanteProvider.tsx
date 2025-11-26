import React, { createContext, useContext } from 'react';
import { EVoiceAssistantProvider, useEVoiceAssistant } from './EVoiceAssistanteProvider';
import { GVoiceAssistantProvider, useGVoiceAssistant } from './GVoiceAssistanteProvider';

const VoiceAssistantContext = createContext<any>(null);

export const VoiceAssistantProvider: React.FC<{
  children: React.ReactNode;
  assistant: 'google' | 'elevenlabs';
}> = ({ children, assistant }) => {
  return (
    <VoiceAssistantContext.Provider value={assistant}>
      {assistant === 'elevenlabs' ? (
        <EVoiceAssistantProvider>{children}</EVoiceAssistantProvider>
      ) : (
        <GVoiceAssistantProvider>{children}</GVoiceAssistantProvider>
      )}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const assistant = useContext(VoiceAssistantContext);

  if (!assistant) {
    throw new Error('useVoiceAssistant must be used inside VoiceAssistantProvider');
  }

  if (assistant === 'elevenlabs') {
    return useEVoiceAssistant();
  }

  return useGVoiceAssistant();
};
