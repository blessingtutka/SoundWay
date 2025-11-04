import { LoginForm } from '@/components/auth';
import { ScreenLayout } from '@/components/ScreenLayout';
import { Card } from '@/components/ui/card';
import { useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import { signInUser } from '@/services/authServices';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  const { registerAppFunction, unregisterAppFunction, speak } =
    useVoiceAssistant();

  const handleAuthSubmit = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await signInUser(data.email, data.password);
      Alert.alert('Success', "You're logged in");
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs' as never, params: { screen: 'Home' } }],
      });
      await speak('Login successful. Welcome back!');
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message);
      await speak('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    registerAppFunction('fill_login_field', {
      name: 'fill_login_field',
      description: 'Fills in login form fields like email or password',
      examples: ['set email to test@example.com', 'my password is secret123'],
      handler: async ({ field, value }) => {
        if (!field || !value) return 'Please specify a field and value.';
        await speak(`Setting ${field} to ${value}`);
        return `${field} field updated.`;
      },
    });

    registerAppFunction('submit_login', {
      name: 'submit_login',
      description: 'Submits the login form automatically',
      examples: ['sign me in', 'submit login', 'log me in'],
      handler: async () => {
        await speak('Signing you in now...');
        // Trigger login submission manually
        // In production: call form submit or navigation
        return 'Login submitted.';
      },
    });

    return () => {
      unregisterAppFunction('fill_login_field');
      unregisterAppFunction('submit_login');
    };
  }, [navigation]);

  return (
    <ScreenLayout>
      <Card className="w-full max-w-md bg-[#121212] rounded-lg shadow-sm">
        <View className="flex-col justify-center">
          <Text className={`font-medium text-blue-400 text-3xl`}>Welcome!</Text>
          <Text className={`font-medium text-gray-500 text-base`}>
            Log in or sign up with your email
          </Text>
        </View>

        <View className="p-6">
          {error && <Text className="text-red-400 mb-4 text-sm">{error}</Text>}
          <LoginForm onSubmit={handleAuthSubmit} isLoading={isLoading} />
        </View>
      </Card>
    </ScreenLayout>
  );
}
