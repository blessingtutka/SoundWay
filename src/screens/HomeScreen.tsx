import { ScreenLayout } from '@/components/ScreenLayout';
import { Card } from '@/components/ui/card';
import { useUser } from '@/providers/UserProvider';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Image, Text, View } from 'react-native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const {
    user,
    isLoading,
    isLoggedIn,
  } = useUser();

  useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      Alert.alert('Error','Please Login');
      navigation.navigate('Login' as never);
    }
  }, [isLoggedIn, isLoading, navigation]);

  if (isLoading || !user) {
    return (
      <View className="flex flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading...</Text>
      </View>
    );
  }

  return (
    <ScreenLayout>
      <Card className="w-fit bg-dark-trans self-center rounded-lg shadow-sm p-6 gap-4">
        <Image
          source={require('@/assets/images/icon.png')}
          className="!w-32 !h-32 self-center"
        />

        <View className="flex-col items-center">
          <Text className="text-3xl font-bold text-[#FDB327]">
            Map to Parse
          </Text>
        </View>
      </Card>
    </ScreenLayout>
  );
}
