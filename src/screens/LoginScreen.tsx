import { LoginForm } from '@/components/auth';
import { ScreenLayout } from '@/components/ScreenLayout';
import { Card } from '@/components/ui/card';
import { signInUser } from '@/services/authServices';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuthSubmit = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await signInUser(data.email, data.password);
      Alert.alert('Success', "You're logged in");
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <Card className='w-full max-w-md bg-[#121212] rounded-lg shadow-sm'>
        <View className='flex-col justify-center'>
          <Text className={`font-medium text-blue-400 text-3xl`}>Welcome!</Text>
          <Text className={`font-medium text-gray-500 text-base`}>Log in or sign up with your email</Text>
        </View>

        <View className='p-6'>
          {error && <Text className='text-red-400 mb-4 text-sm'>{error}</Text>}
          <LoginForm onSubmit={handleAuthSubmit} isLoading={isLoading} />
        </View>
      </Card>
    </ScreenLayout>
  );
}
