import { ScreenLayout } from '@/components/ScreenLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenLayout>
      <Card className='w-fit bg-dark-trans self-center rounded-lg shadow-sm p-6 gap-4'>
        <Image source={require('@/assets/images/icon.png')} className='!w-32 !h-32 self-center' />

        <View className='flex-col items-center'>
          <Text className='text-3xl font-bold text-[#FDB327]'>Welcome to</Text>
          <Text className='text-5xl font-extrabold text-[#0082f4]'>SoundWay</Text>
          <Text className='text-base text-[#FFB4A6] mt-1 text-center'>Find your local easly with SoundWay with a great level of assurance</Text>
          <Text className='text-[#1DAC5C] font-semibold mt-2 text-center'>With SoundWay: Find your local.</Text>
        </View>

        <Button size='lg' className='main-btn mt-4' onPress={() => router.replace('/login')}>
          <Text className='text-white font-bold'>Login</Text>
        </Button>

        <View className='flex-row items-center mt-3'>
          <Text className='text-[#666] text-sm flex-shrink-1'>Don't have an account? </Text>
          <Pressable onPress={() => router.replace('/signup')}>
            <Text className='text-[#FE4031] text-sm font-medium'>Sign up</Text>
          </Pressable>
        </View>
      </Card>
    </ScreenLayout>
  );
}
