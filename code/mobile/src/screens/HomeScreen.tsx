import { ScreenLayout } from '@/components/ScreenLayout';
import { Card } from '@/components/ui/card';
import { useUser } from '@/providers/UserProvider';
import { useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import { useRouter } from 'expo-router';
import { Mic } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn } = useUser();

  const { state: voiceState, startListening } = useVoiceAssistant();

  useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      Alert.alert('Error', 'Please Login');
      router.replace('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading || !user) {
    return (
      <View className='flex flex-1 justify-center items-center bg-gray-50'>
        <ActivityIndicator size='large' color='#3B82F6' />
        <Text className='text-gray-600 mt-4'>Loading...</Text>
      </View>
    );
  }

  return (
    <ScreenLayout>
      <Card className='w-[90%] h-[90vh] flex flex-col justify-center items-center bg-dark-trans self-center rounded-lg shadow-sm p-6 gap-4'>
        <Image source={require('@/assets/images/icon.png')} className='!w-32 !h-32 self-center' />

        <View className='flex-col items-center'>
          <Text className='text-3xl font-bold text-[#FDB327]'>SoundWay</Text>
        </View>
        <TouchableOpacity onPress={startListening} className=' w-[90%] h-[50%] flex-col justify-center bg-[#FDB327] rounded-lg items-center'>
          <Text className='text-3xl font-bold '>
            <Mic size={45} color={'white'} />
          </Text>
        </TouchableOpacity>
      </Card>
    </ScreenLayout>
  );
}
