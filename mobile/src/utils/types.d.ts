interface User {
  uid: string;
  displayName?: string;
  email: string;
  avatar?: string;
}

interface ErrorResponse {
  status: string;
  error: {
    code: string;
    message: string;
  };
}

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
  status_code: number;
}

type Profile = {
  displayName: string;
  email: string;
  avatar?: string;
};

// MAP INTERFACES
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Location extends Coordinate {
  title?: string;
  address?: string;
}

interface RouteInfo {
  distance: string;
  duration: number;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  location: Coordinate;
}

interface VoiceCommand {
  intent: string;
  action: string;
  parameters: Record<string, any>;
  response: string;
  executeCommand: boolean;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// VOICE ASSISTANT
type ConversationStatus = 'disconnected' | 'connected' | 'connecting' | 'disconnecting';
interface VoiceCommand {
  intent: string;
  action: string;
  parameters: Record<string, any>;
  response: string;
  executeCommand: boolean;
}
interface AppFunction {
  name: string;
  description: string;
  parameters?: { name: string; type: string; description?: string }[];
  handler: (params: any) => Promise<string>;
  examples: string[];
}

interface VoiceAssistantState {
  status: ConversationStatus;
  recognizedText: string;
  lastResponse: string;
  error: string | null;
  isSessionActive: boolean;
  isListening?: boolean;
}

interface VoiceAssistantContextType {
  state: VoiceAssistantState;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  registerAppFunction: (fn: AppFunction) => void;
  unregisterAppFunction: (name: string) => void;
}
