import { ScreenLayout } from '@/components/ScreenLayout';
import { Card } from '@/components/ui/card';
import { useNavigation } from '@/providers/NavigationProvider';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function DeviceScreen() {
  const {
    currentSession,
    connectedDevice,
    connected,
    logs,
    state,
    currentDistance,
    proximityLevel,
    nextStep,
    previousStep,
    cancelNavigation,
    currentBuilding,
  } = useNavigation();

  // const getShow = async () => {
  //   if (currentBuilding) {
  //     roomDetails = await RoomQueryService.getRoomDetails(currentBuilding.id, 'I32');
  //     console.log(roomDetails);
  //   } else {
  //     console.log('Okay');
  //   }
  // };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'navigation_in_progress':
      case 'approaching_destination':
        return 'text-green-500';
      case 'searching_room':
      case 'room_found':
        return 'text-blue-500';
      case 'error':
      case 'room_not_found':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getProximityDescription = (level: number) => {
    switch (level) {
      case 1:
        return 'Getting closer';
      case 2:
        return 'Approaching destination';
      case 3:
        return 'Very close';
      default:
        return 'No proximity data';
    }
  };

  return (
    <ScreenLayout>
      <Card className='w-[90%] h-[90vh] flex flex-col justify-center items-center bg-dark-trans self-center rounded-lg shadow-sm p-6 gap-4'>
        {/* Navigation Session Status */}

        {/* Device Status Section */}
        <View className='w-full flex gap-3 mb-4'>
          <Text className='text-2xl text-green-600 text-center'>{connectedDevice ? 'Device Found' : 'Scanning...'}</Text>
          <Text className={`text-2xl text-center ${connected ? 'text-green-600' : 'text-red-600'}`}>{connected ? 'Connected' : 'Not Connected'}</Text>

          {/* Current Building Info */}
          {currentBuilding && (
            <View className='bg-purple-900 p-3 rounded mt-2'>
              <Text className='text-white text-center font-semibold'>Current Building: {currentBuilding.name}</Text>
              {currentBuilding.description && <Text className='text-gray-300 text-center text-sm'>{currentBuilding.description}</Text>}
            </View>
          )}
        </View>

        {/* Device Details */}
        <View className='w-full'>
          <Text className='text-white text-lg text-center mb-2'>Connected Device</Text>

          {connectedDevice ? (
            <View className='border border-gray-400 p-3 rounded bg-gray-800'>
              <Text className='text-gray-400 text-sm'>Device ID:</Text>
              <Text className='text-white text-xs mb-2'>{connectedDevice.id}</Text>

              <Text className='text-gray-400 text-sm'>Device Name:</Text>
              <Text className='text-white text-lg mb-2'>{connectedDevice.name || connectedDevice.localName || 'BLE Device'}</Text>

              <Text className='text-gray-400 text-sm'>Distance:</Text>
              <Text className='text-white text-lg'>{currentDistance ? `${currentDistance.toFixed(2)}m` : 'N/A'}</Text>
            </View>
          ) : (
            <Text className='text-white text-center'>No device found</Text>
          )}
        </View>

        {/* Logs Section */}
        {currentSession && (
          <View className='w-full bg-blue-950 mb-4 p-4 rounded-lg'>
            <Text className='text-white text-lg font-bold text-center'>Active Navigation Session</Text>

            <View className='mt-2'>
              <Text className='text-white text-center text-xl font-semibold'>To: {currentSession.room.name}</Text>
              {currentSession.room.description && <Text className='text-gray-300 text-center'>{currentSession.room.description}</Text>}
            </View>

            {/* Progress Information */}
            <View className='mt-3 flex-row justify-between items-center'>
              <Text className='text-white'>
                Step {currentSession.currentStepIndex + 1} of {currentSession.steps.length}
              </Text>
              <Text className={`text-sm ${getStateColor(state)}`}>{state.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>

            {/* Current Instruction */}
            {currentSession.steps[currentSession.currentStepIndex] && (
              <View className='mt-3 p-3 bg-blue-800 rounded'>
                <Text className='text-white font-semibold'>Current Instruction:</Text>
                <Text className='text-white mt-1'>{currentSession.steps[currentSession.currentStepIndex].instruction.instruction_text}</Text>
              </View>
            )}

            {/* Distance and Proximity */}
            <View className='mt-3 flex-row justify-between'>
              <View>
                <Text className='text-white text-sm'>Distance</Text>
                <Text className='text-white font-semibold'>{currentDistance > 0 ? `${currentDistance.toFixed(1)}m` : 'Unknown'}</Text>
              </View>
              <View>
                <Text className='text-white text-sm'>Proximity</Text>
                <Text
                  className={`font-semibold ${
                    proximityLevel === 1
                      ? 'text-yellow-400'
                      : proximityLevel === 2
                        ? 'text-orange-400'
                        : proximityLevel === 3
                          ? 'text-red-400'
                          : 'text-gray-400'
                  }`}
                >
                  {getProximityDescription(proximityLevel)}
                </Text>
              </View>
            </View>

            {/* Navigation Controls */}
            <View className='mt-3 flex-row gap-2 justify-between'>
              <TouchableOpacity
                className='flex-1 bg-blue-600 py-2 rounded disabled:bg-blue-800'
                onPress={previousStep}
                disabled={currentSession.currentStepIndex === 0}
              >
                <Text className='text-white text-center'>Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className='flex-1 bg-green-600 py-2 rounded disabled:bg-green-800'
                onPress={nextStep}
                disabled={currentSession.currentStepIndex >= currentSession.steps.length - 1}
              >
                <Text className='text-white text-center'>Next</Text>
              </TouchableOpacity>

              <TouchableOpacity className='flex-1 bg-red-600 py-2 rounded' onPress={cancelNavigation}>
                <Text className='text-white text-center'>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Steps */}
            <ScrollView className='mt-3 max-h-20'>
              {currentSession.steps.map((step, index) => (
                <View
                  key={step.instruction.id}
                  className={`flex-row items-center py-1 ${index === currentSession.currentStepIndex ? 'bg-blue-700' : ''}`}
                >
                  <View
                    className={`w-3 h-3 rounded-full mr-2 ${
                      step.status === 'completed' ? 'bg-green-500' : step.status === 'current' ? 'bg-blue-400' : 'bg-gray-500'
                    }`}
                  />
                  <Text
                    className={`text-sm ${
                      step.status === 'completed' ? 'text-gray-400' : step.status === 'current' ? 'text-white font-semibold' : 'text-gray-500'
                    }`}
                  >
                    {step.instruction.instruction_text}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Overall Status */}
        {!currentSession && (
          <View className='mt-2 p-3 bg-gray-800 rounded'>
            <Text className='text-white text-center'>No active navigation session. Use voice commands to start navigation.</Text>
          </View>
        )}
      </Card>
    </ScreenLayout>
  );
}
