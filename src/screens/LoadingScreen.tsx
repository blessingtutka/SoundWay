import { ScreenLayout } from '@/components/ScreenLayout';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export const LoadingScreen = () => {
  return (
    <ScreenLayout>
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="mt-4 text-white text-lg">Loading...</Text>
      </View>
    </ScreenLayout>
  );
};
