import { useLocationTracking } from '@/hooks/useLocationTracking';
import { useNavigationLogic } from '@/hooks/useNavigationLogic';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ControlsPanel from './ControlsPanel';
import MapViewer from './MapViewer';
import SearchBar from './SearchBar';
import SearchResultsModal from './SearchResultsModal';
import VoiceButton from './VoiceButton';

const VoiceMap: React.FC = () => {
  const { currentLocation } = useLocationTracking();

  const {
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
  } = useNavigationLogic(currentLocation);

  const { voiceState, startListening } = useVoiceNavigation({
    handleStartNavigation,
    handleStopNavigation,
    handleSetDestination,
    handleSearchLocation,
    handleGetCurrentLocation,
    handleGetRouteInfo,
    navigationContext: {
      currentLocation,
      destination,
      isNavigating,
      routeInfo,
      currentStep,
      routeCoordinates,
    },
  });

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <MapViewer
        currentLocation={currentLocation}
        destination={destination}
        routeCoordinates={routeCoordinates}
        onPress={setDestination}
      />

      <SearchBar
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        onSearch={setSearchResults}
        onShowModal={setShowSearch}
      />

      <VoiceButton
        isListening={voiceState.isListening}
        onPress={startListening}
      />

      <SearchResultsModal
        visible={showSearch}
        results={searchResults}
        onSelect={setDestination}
        onClose={() => setShowSearch(false)}
      />

      <ControlsPanel
        routeInfo={routeInfo}
        navigationSteps={navigationSteps}
        isNavigating={isNavigating}
        onStart={handleStartNavigation}
        onStop={handleStopNavigation}
        recentDestinations={recentDestinations}
        onSelectRecent={setDestination}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default VoiceMap;
