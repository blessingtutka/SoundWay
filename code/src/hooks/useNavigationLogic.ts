import axios from '@/services/axiosService';
import { fetchRoute } from '@/utils/getRoute';
import { useState } from 'react';

export const useNavigationLogic = (currentLocation: any) => {
  const [destination, setDestination] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [navigationSteps, setNavigationSteps] = useState<any[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [recentDestinations, setRecentDestinations] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const handleStartNavigation = async (): Promise<string> => {
    if (!destination) return 'Please set a destination first.';
    if (!currentLocation) return 'Current location not available.';

    const route = await fetchRoute(currentLocation, destination);
    if (route) {
      setRouteCoordinates(route.coordinates);
      setRouteInfo(route.info);
      setNavigationSteps(route.steps);
      setIsNavigating(true);
      setCurrentStep(0);

      return `Navigation started. Distance is ${route.info.distance} km and estimated time is ${route.info.duration} minutes.`;
    }

    return 'Failed to calculate route. Please try again.';
  };

  const handleStopNavigation = async (): Promise<string> => {
    if (!isNavigating) return 'No active navigation to stop.';

    setIsNavigating(false);
    setRouteCoordinates([]);
    setNavigationSteps([]);
    setRouteInfo(null);
    setCurrentStep(0);

    return 'Navigation stopped.';
  };

  const handleSetDestination = async (params: any): Promise<string> => {
    const address = params?.address || params?.destination || params?.query;
    if (!address) return 'Please specify a destination.';

    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const newDest = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          title: result.display_name.split(',')[0],
          address: result.display_name,
        };

        setDestination(newDest);
        setRecentDestinations((prev) =>
          [newDest, ...prev.filter((d) => d.latitude !== newDest.latitude || d.longitude !== newDest.longitude)].slice(0, 5),
        );

        return `Destination set to ${newDest.title}. Say "start navigation" to begin.`;
      }

      return `Could not find ${address}. Try another location.`;
    } catch (error) {
      console.log('Set destination error:', error);
      return 'Failed to fetch destination.';
    }
  };

  const handleSearchLocation = async (params: any): Promise<string> => {
    const query = params?.query || params?.search;
    if (!query) return 'Please specify what to search for.';

    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);

      if (response.data?.length > 0) {
        return `Found ${response.data.length} results for "${query}".`;
      } else {
        return `No results found for "${query}".`;
      }
    } catch (error) {
      console.log('Search location error:', error);
      return 'Search failed. Please try again.';
    }
  };

  const handleGetCurrentLocation = async (): Promise<string> => {
    if (!currentLocation) return 'Current location not available. Please wait for GPS signal.';

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLocation.latitude}&lon=${currentLocation.longitude}`,
      );

      const address = response.data.display_name || 'Unknown location';
      return `You are currently at ${address}.`;
    } catch (error) {
      console.log('Reverse geocoding error:', error);
      return `You are at latitude ${currentLocation.latitude.toFixed(4)}, longitude ${currentLocation.longitude.toFixed(4)}.`;
    }
  };

  const handleGetRouteInfo = async (): Promise<string> => {
    if (!routeInfo) return 'No active route. Please set a destination first.';
    return `The route is ${routeInfo.distance} kilometers and will take approximately ${routeInfo.duration} minutes.`;
  };

  return {
    destination,
    setDestination,
    routeCoordinates,
    routeInfo,
    navigationSteps,
    currentStep,
    isNavigating,
    handleStartNavigation,
    handleStopNavigation,
    handleSetDestination,
    handleSearchLocation,
    handleGetCurrentLocation,
    handleGetRouteInfo,
    recentDestinations,
  };
};
