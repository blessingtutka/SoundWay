import { useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import { useCallback, useEffect } from 'react';

interface VoiceNavigationProps {
  handleStartNavigation: (params?: any) => Promise<string>;
  handleStopNavigation: (params?: any) => Promise<string>;
  handleSetDestination: (params?: any) => Promise<string>;
  handleSearchLocation: (params?: any) => Promise<string>;
  handleGetCurrentLocation: (params?: any) => Promise<string>;
  handleGetRouteInfo: (params?: any) => Promise<string>;
  navigationContext: {
    currentLocation: any;
    destination: any;
    isNavigating: boolean;
    routeInfo: any;
    currentStep: number;
    routeCoordinates: any[];
  };
}

export const useVoiceNavigation = ({
  handleStartNavigation,
  handleStopNavigation,
  handleSetDestination,
  handleSearchLocation,
  handleGetCurrentLocation,
  handleGetRouteInfo,
  navigationContext,
}: VoiceNavigationProps) => {
  const {
    state: voiceState,
    startListening,
    registerAppFunction,
    unregisterAppFunction,
    updateContext,
    subscribeToCommands,
  } = useVoiceAssistant();

  useEffect(() => {
    registerAppFunctions();

    const unsubscribe = subscribeToCommands(handleVoiceCommand);

    return () => {
      unsubscribe();
      cleanupAppFunctions();
    };
  }, []);

  useEffect(() => {
    updateContext('navigation', {
      currentLocation: navigationContext.currentLocation,
      destination: navigationContext.destination,
      isNavigating: navigationContext.isNavigating,
      routeInfo: navigationContext.routeInfo,
      currentStep: navigationContext.currentStep,
      hasRoute: navigationContext.routeCoordinates.length > 0,
    });
  }, [navigationContext]);

  const handleVoiceCommand = useCallback((command: any) => {
    console.log('Voice command received:', command);
  }, []);

  const registerAppFunctions = () => {
    registerAppFunction('start_navigation', {
      name: 'start_navigation',
      description: 'Start navigation to the current destination',
      examples: ['start navigation', 'begin navigation', "let's go"],
      handler: handleStartNavigation,
    });

    registerAppFunction('stop_navigation', {
      name: 'stop_navigation',
      description: 'Stop current navigation',
      examples: ['stop navigation', 'cancel navigation', 'end navigation'],
      handler: handleStopNavigation,
    });

    registerAppFunction('set_destination', {
      name: 'set_destination',
      description: 'Set a new destination address or place',
      examples: [
        'navigate to central park',
        'go to times square',
        'set destination to airport',
      ],
      handler: handleSetDestination,
    });

    registerAppFunction('search_location', {
      name: 'search_location',
      description: 'Search for a location or address',
      examples: [
        'search for restaurants',
        'find gas stations',
        'look up central park',
      ],
      handler: handleSearchLocation,
    });

    registerAppFunction('get_current_location', {
      name: 'get_current_location',
      description: 'Get current location information',
      examples: ['where am I', 'current location', "what's my position"],
      handler: handleGetCurrentLocation,
    });

    registerAppFunction('get_route_info', {
      name: 'get_route_info',
      description: 'Get information about the current route',
      examples: [
        'route information',
        'how long is the route',
        'distance to destination',
      ],
      handler: handleGetRouteInfo,
    });
  };

  const cleanupAppFunctions = () => {
    [
      'start_navigation',
      'stop_navigation',
      'set_destination',
      'search_location',
      'get_current_location',
      'get_route_info',
    ].forEach(unregisterAppFunction);
  };

  return {
    voiceState,
    startListening,
  };
};
