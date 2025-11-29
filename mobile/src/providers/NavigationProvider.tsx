import { BuildingService, RoomDetails, RoomQueryService } from '@/services/buildingService';
import { Building, DistanceConf, Instruction } from '@/services/collections';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { bleService } from '../services/bleService';
import { useVoiceAssistant } from './VoiceAssistanteProvider';

// Navigation State Machine
export type NavigationState =
  | 'idle'
  | 'listening_for_room'
  | 'searching_room'
  | 'room_found'
  | 'room_not_found'
  | 'navigation_in_progress'
  | 'approaching_destination'
  | 'navigation_complete'
  | 'error';

export interface NavigationStep {
  instruction: Instruction;
  status: 'pending' | 'current' | 'completed';
  spoken: boolean;
}

export interface NavigationSession {
  room: RoomDetails;
  currentStepIndex: number;
  steps: NavigationStep[];
  startedAt: Date;
  completedAt?: Date;
  currentDistance?: number;
  proximityLevel?: number;
  building?: Building; // Associated building
}

export interface NavigationContextType {
  // State
  state: NavigationState;
  currentSession: NavigationSession | null;
  error: string | null;
  currentDistance: number;
  proximityLevel: number;
  connectedDevice: any | null;
  currentBuilding: Building | null;

  // Actions
  startNavigation: (roomQuery: string, buildingId?: string) => Promise<void>;
  nextStep: () => void;
  previousStep: () => void;
  completeNavigation: () => void;
  cancelNavigation: () => void;
  updateDistance: (distance: number) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NavigationState>('idle');
  const [currentSession, setCurrentSession] = useState<NavigationSession | null>(null);

  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number>(-1);
  const [proximityLevel, setProximityLevel] = useState<number>(0);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);

  const { registerAppFunction, unregisterAppFunction, speak } = useVoiceAssistant();
  const isProcessing = useRef(false);
  const vibrationInterval = useRef<number | null>(null);
  const lastVibrationLevel = useRef<number>(0);
  const isBleInitialized = useRef(false);

  // Initialize buildings with BLE device mapping
  useEffect(() => {
    loadBuilding();
    initializeBleService();

    return () => {
      cleanup();
    };
  }, []);

  const initializeBleService = () => {
    if (isBleInitialized.current) return;

    // Set up BLE callbacks
    // bleService.setConnectionCallback((connected: boolean) => {
    //   console.log('BLE Connection:', connected);
    //   if (!connected) {
    //     setConnectedDevice(null);
    //     setCurrentBuilding(null);
    //   }
    // });

    bleService.setDeviceUpdatedCallback(async (device: any, distance: number | null) => {
      if (device) {
        setConnectedDevice(device);

        // Auto-detect building based on connected device
        const detectedBuilding = await BuildingService.getBuildingByBeacon(device.id);
        if (detectedBuilding) {
          setCurrentBuilding(detectedBuilding);
          await speak(`Connected to ${detectedBuilding.name}`).catch(console.error);
        }
      }

      if (distance !== null) {
        updateDistance(distance);
      }
    });

    bleService.setZoneCallback((message: string) => {
      console.log('BLE Zone Message:', message);
      // Handle zone-specific messages if needed
    });

    isBleInitialized.current = true;
  };

  const loadBuilding = async () => {
    try {
      // Your building data with BLE device mappings
      const storedDevice = await bleService.getStoredDevice();

      // Try to get stored device and auto-select building
      if (storedDevice) {
        const detectedBuilding = await BuildingService.getBuildingByBeacon(storedDevice.id);
        if (detectedBuilding) {
          setCurrentBuilding(detectedBuilding);
        }
      }
    } catch (err) {
      console.error('Failed to load buildings:', err);
    }
  };

  const cleanup = () => {
    stopVibration();
    unregisterAppFunction('start_navigation');
    unregisterAppFunction('next_step');
    unregisterAppFunction('previous_step');
    unregisterAppFunction('repeat_instruction');
    unregisterAppFunction('cancel_navigation');
  };

  const transitionState = (newState: NavigationState) => {
    console.log(`Navigation State: ${state} -> ${newState}`);
    setState(newState);
  };

  const getProximityLevel = (distance: number, distanceConfigs: DistanceConf[]): number => {
    if (distance < 0) return 0;

    for (const config of distanceConfigs) {
      for (const interval of config.intervals) {
        if (distance >= interval.min && distance <= interval.max) {
          return interval.level;
        }
      }
    }

    return 0;
  };

  // Fixed vibration functions in NavigationProvider
  const startVibration = (level: number) => {
    stopVibration();

    if (level === 0) return;

    const patterns = {
      1: [300, 1500], // 300ms vibration, 1500ms pause
      2: [400, 800], // 400ms vibration, 800ms pause
      3: [500, 400], // 500ms vibration, 400ms pause
    };

    const pattern = patterns[level as keyof typeof patterns] || [300, 1000];

    // Ensure vibration duration is positive
    const vibrationDuration = Math.max(1, pattern[0]); // Minimum 1ms
    const pauseDuration = Math.max(1, pattern[1]); // Minimum 1ms

    vibrationInterval.current = setInterval(() => {
      // Double-check duration is positive before vibrating
      if (vibrationDuration > 0) {
        Vibration.vibrate(vibrationDuration);
      }
    }, vibrationDuration + pauseDuration);
  };

  const stopVibration = () => {
    if (vibrationInterval.current) {
      clearInterval(vibrationInterval.current);
      vibrationInterval.current = null;
    }
    // Cancel any ongoing vibration
    Vibration.cancel && Vibration.cancel();
  };

  const updateDistance = async (distance: number) => {
    setCurrentDistance(distance);

    if (currentSession && state === 'navigation_in_progress') {
      const newProximityLevel = getProximityLevel(distance, currentSession.room.distanceConfigs);
      setProximityLevel(newProximityLevel);

      const updatedSession: NavigationSession = {
        ...currentSession,
        currentDistance: distance,
        proximityLevel: newProximityLevel,
      };
      setCurrentSession(updatedSession);

      if (newProximityLevel !== lastVibrationLevel.current) {
        lastVibrationLevel.current = newProximityLevel;

        if (newProximityLevel > 0) {
          startVibration(newProximityLevel);
          transitionState('approaching_destination');

          if (newProximityLevel === 1) {
            await speak("You're getting closer to your destination.").catch(console.error);
          } else if (newProximityLevel === 3) {
            await speak("You're very close to your destination now.").catch(console.error);
          }
        } else {
          stopVibration();
          transitionState('navigation_in_progress');
        }
      }

      const closestConfig = currentSession.room.distanceConfigs[0]?.intervals[0];
      if (closestConfig && distance >= Math.max(0, closestConfig.min) && distance <= closestConfig.max) {
        await speak('You have arrived at your destination!').catch(console.error);
        completeNavigation();
      }
    }
  };

  const startNavigation = async (roomQuery: string): Promise<void> => {
    if (isProcessing.current) return;

    isProcessing.current = true;
    transitionState('searching_room');
    setError(null);
    stopVibration();

    try {
      const targetBuilding = currentBuilding;

      if (!targetBuilding) {
        await speak(`No building with soundway tech found`).catch(console.error);
        return;
      }

      await speak(`Searching for ${roomQuery} in ${targetBuilding.name}...`);

      const roomDetails = await RoomQueryService.getRoomDetails(targetBuilding.id, roomQuery);

      if (!roomDetails) {
        transitionState('room_not_found');
        await speak(`Sorry, I couldn't find ${roomQuery} in ${targetBuilding.name}. Please try a different room name.`);
        return;
      }

      transitionState('room_found');

      const navigationSteps: NavigationStep[] = roomDetails.instructions
        .sort((a, b) => a.step_order - b.step_order)
        .map((instruction) => ({
          instruction,
          status: 'pending',
          spoken: false,
        }));

      const session: NavigationSession = {
        room: roomDetails,
        currentStepIndex: 0,
        steps: navigationSteps,
        startedAt: new Date(),
        currentDistance: -1,
        proximityLevel: 0,
        building: targetBuilding,
      };

      setCurrentSession(session);

      let roomInfo = `Found ${roomDetails.name}.`;
      if (roomDetails.description) {
        roomInfo += ` ${roomDetails.description}`;
      }
      if (roomDetails.currentActivity) {
        roomInfo += ` Current activity: ${roomDetails.currentActivity}.`;
      }

      // Add BLE status info
      if (connectedDevice) {
        roomInfo += ` Bluetooth beacon connected. I will guide you with vibrations as you get closer.`;
      } else {
        roomInfo += ` Starting navigation. Connect to Bluetooth for distance guidance.`;
      }

      await speak(roomInfo);

      await beginNavigation(session);
    } catch (err: any) {
      transitionState('error');
      setError(err.message);
      await speak(`I encountered an error while searching: ${err.message}`);
    } finally {
      isProcessing.current = false;
    }
  };

  const beginNavigation = async (session: NavigationSession): Promise<void> => {
    transitionState('navigation_in_progress');
    await speakCurrentInstruction(session);
  };

  const speakCurrentInstruction = async (session: NavigationSession): Promise<void> => {
    const currentStep = session.steps[session.currentStepIndex];
    if (!currentStep || currentStep.spoken) return;

    const instructionText = currentStep.instruction.instruction_text;
    await speak(`Step ${session.currentStepIndex + 1}: ${instructionText}`);

    const updatedSteps = [...session.steps];
    updatedSteps[session.currentStepIndex] = { ...currentStep, spoken: true, status: 'current' as const };

    setCurrentSession({
      ...session,
      steps: updatedSteps,
    });
  };

  const nextStep = async (): Promise<void> => {
    if (!currentSession || state !== 'navigation_in_progress') return;

    const nextIndex = currentSession.currentStepIndex + 1;

    if (nextIndex >= currentSession.steps.length) {
      if (currentSession.currentDistance !== undefined && currentSession.currentDistance >= 0) {
        const currentLevel = getProximityLevel(currentSession.currentDistance, currentSession.room.distanceConfigs);
        if (currentLevel > 0) {
          await completeNavigation();
          return;
        }
      }

      await speak("You've completed all navigation steps. Continue following the final instruction.");
      return;
    }

    const updatedSteps = [...currentSession.steps];
    updatedSteps[currentSession.currentStepIndex] = {
      ...updatedSteps[currentSession.currentStepIndex],
      status: 'completed',
    };

    updatedSteps[nextIndex] = {
      ...updatedSteps[nextIndex],
      status: 'current',
    };

    const updatedSession: NavigationSession = {
      ...currentSession,
      currentStepIndex: nextIndex,
      steps: updatedSteps,
    };

    setCurrentSession(updatedSession);
    await speakCurrentInstruction(updatedSession);
  };

  const previousStep = async (): Promise<void> => {
    if (!currentSession || state !== 'navigation_in_progress') return;

    const prevIndex = Math.max(0, currentSession.currentStepIndex - 1);

    const updatedSteps = [...currentSession.steps];
    updatedSteps[currentSession.currentStepIndex] = {
      ...updatedSteps[currentSession.currentStepIndex],
      status: 'pending',
    };

    updatedSteps[prevIndex] = {
      ...updatedSteps[prevIndex],
      status: 'current',
    };

    const updatedSession: NavigationSession = {
      ...currentSession,
      currentStepIndex: prevIndex,
      steps: updatedSteps,
    };

    setCurrentSession(updatedSession);
    await speakCurrentInstruction(updatedSession);
  };

  const repeatInstruction = async (): Promise<void> => {
    if (!currentSession || state !== 'navigation_in_progress') return;
    await speakCurrentInstruction(currentSession);
  };

  const completeNavigation = async (): Promise<void> => {
    if (!currentSession) return;

    stopVibration();

    const completedSession: NavigationSession = {
      ...currentSession,
      completedAt: new Date(),
    };

    setCurrentSession(completedSession);
    transitionState('navigation_complete');

    await speak(`You have arrived at ${currentSession.room.name}. Navigation complete.`);

    setTimeout(() => {
      setCurrentSession(null);
      setCurrentDistance(-1);
      setProximityLevel(0);
      transitionState('idle');
    }, 5000);
  };

  const cancelNavigation = async (): Promise<void> => {
    stopVibration();

    if (currentSession) {
      await speak(`Navigation to ${currentSession.room.name} cancelled.`);
    }

    setCurrentSession(null);
    setCurrentDistance(-1);
    setProximityLevel(0);
    setError(null);
    transitionState('idle');
  };

  const registerVoiceCommands = (): void => {
    // Start navigation command
    registerAppFunction({
      name: 'start_navigation',
      description: 'Start navigation to a specific room',
      examples: ['Navigate to room I32', 'Take me to the chemistry lab', 'Find room I02', 'Directions to teaching room'],

      parameters: [
        { name: 'building', type: 'object', description: 'Optional building name' },
        { name: 'room', type: 'object', description: 'The room name or number to navigate to' },
      ],
      handler: async (params: any) => {
        const { room, building } = params;
        await startNavigation(room);
        return `Starting navigation to ${room}${building ? ` in ${building}` : ''}`;
      },
    });

    // Navigation control commands
    registerAppFunction({
      name: 'next_step',
      description: 'Move to the next navigation instruction',
      examples: ['Next step', 'Continue', 'Next instruction'],
      handler: async () => {
        await nextStep();
        return 'Moving to next step';
      },
    });

    registerAppFunction({
      name: 'previous_step',
      description: 'Go back to the previous navigation instruction',
      examples: ['Previous step', 'Go back', 'Repeat last step'],
      handler: async () => {
        await previousStep();
        return 'Going back to previous step';
      },
    });

    registerAppFunction({
      name: 'repeat_instruction',
      description: 'Repeat the current navigation instruction',
      examples: ['Repeat', 'Say that again', 'Repeat instruction'],
      handler: async () => {
        await repeatInstruction();
        return 'Repeating current instruction';
      },
    });

    registerAppFunction({
      name: 'cancel_navigation',
      description: 'Cancel the current navigation session',
      examples: ['Cancel navigation', 'Stop navigation', 'End directions'],
      handler: async () => {
        await cancelNavigation();
        return 'Navigation cancelled';
      },
    });
  };

  useEffect(() => {
    registerVoiceCommands();
    return () => cleanup();
  }, []);

  const contextValue: NavigationContextType = {
    // State
    state,
    currentSession,
    currentBuilding,
    error,
    currentDistance,
    proximityLevel,
    connectedDevice,

    // Actions
    startNavigation,
    nextStep,
    previousStep,
    completeNavigation,
    cancelNavigation,
    updateDistance,
  };

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
