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
