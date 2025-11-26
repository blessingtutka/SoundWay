import { ScreenLayout } from '@/components/ScreenLayout';
import { Card } from '@/components/ui/card';
import { useUser } from '@/providers/UserProvider';
import { useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import { useRouter } from 'expo-router';
import { Mic, MicOff } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';

const getVoiceAssistantUI = (state: VoiceAssistantState) => {
  if (state.status == 'connected') {
    return {
      icon: <Mic size={45} color='white' />,
      label: 'Session...',
      bgColor: 'bg-blue-500',
    };
  }
  if (state.status == 'disconnected') {
    return {
      icon: <MicOff size={45} color='white' />,
      label: 'Tap to Speak',
      bgColor: 'bg-[#FDB327]',
    };
  }

  if (state.status == 'disconnecting') {
    return {
      icon: <Text className='text-2xl text-white'>Disconnecting...</Text>,
      label: 'Disconnecting',
      bgColor: 'bg-[#FDB327]',
    };
  }

  if (state.status == 'connecting') {
    return {
      icon: <Text className='text-2xl text-white'>Connecting...</Text>,
      label: 'Connecting',
      bgColor: 'bg-[#FDB327]',
    };
  }

  return {
    icon: <Text className='text-2xl text-white'>Connecting...</Text>,
    label: 'Tap to Speak',
    bgColor: 'bg-[#FDB327]',
  };
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, profile } = useUser();

  const { state: voiceState, startSession, endSession } = useVoiceAssistant();
  const voiceUI = getVoiceAssistantUI(voiceState);

  const handleMicrophonePress = () => {
    if (!voiceState.isSessionActive) {
      startSession();
    } else {
      endSession();
    }
  };

  console.log(voiceState);

  useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      Alert.alert('Error', 'Please Login');
      router.replace('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading || !user) {
    return (
      <ScreenLayout>
        <Card className='w-[90%] h-[90vh] flex flex-col justify-center items-center bg-dark-trans self-center rounded-lg shadow-sm p-6 gap-4'>
          <ActivityIndicator size='large' color='#3B82F6' />
          <Text className='text-gray-600 mt-4'>Loading....</Text>
        </Card>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <Card className='w-[90%] h-[90vh] flex flex-col justify-center items-center bg-dark-trans self-center rounded-lg shadow-sm p-6 gap-4'>
        <Image source={require('@/assets/images/icon.png')} className='!w-32 !h-32 self-center' />

        <View className='flex-col items-center'>
          <Text className='text-3xl font-bold text-[#FDB327]'>SoundWay</Text>
        </View>
        <TouchableOpacity
          onPress={handleMicrophonePress}
          className={` w-[90%] h-[50%] flex-col justify-center ${voiceUI.bgColor} rounded-lg items-center`}
        >
          {voiceUI.icon}
        </TouchableOpacity>
      </Card>
    </ScreenLayout>
  );
}
