import { SignUpForm } from '@/components/auth/SignupForm';
import { ScreenLayout } from '@/components/ScreenLayout';
import { Card } from '@/components/ui/card';
import { signUpUser } from '@/services/authServices';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';

export default function SignUpScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUpSubmit = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signUpUser(data.email, data.password, data.displayName);
      if (!result.success) {
        setError(result.message);
        Alert.alert('Error', result.message);
        return;
      }
      Alert.alert('Success', "You're registered, please verify your email");
      router.replace('/login');
    } catch (err: any) {
      setError(err.message || 'Something went wrong during sign up');
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <Card className='w-full max-w-md bg-[#121212] rounded-lg shadow-sm'>
        <View className='flex-col justify-center'>
          <Text className={`font-medium text-blue-400 text-3xl`}>Create Account</Text>
          <Text className={`font-medium text-gray-500 text-base`}>Sign up to get started</Text>
        </View>

        <View className='p-6'>
          {error && <Text className='text-red-400 mb-4 text-sm'>{error}</Text>}
          <SignUpForm onSubmit={handleSignUpSubmit} isLoading={isLoading} />
        </View>
      </Card>
    </ScreenLayout>
  );
}
