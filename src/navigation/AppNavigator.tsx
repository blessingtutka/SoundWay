/* eslint-disable react/no-unstable-nested-components */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import TabsNavigator from './TabNavigator';

import { useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import ForgotPasswordScreen from '@/screens/ForgotPassowrdScreen';
import LoginScreen from '@/screens/LoginScreen';
import SignUpScreen from '@/screens/SignupScreen';
import WelcomeScreen from '@/screens/WelcomeScreen';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

const Stack = createNativeStackNavigator();

const HeaderBackground = () => (
  <View className="h-full flex-1 bg-black border-b border-b-[#FDB327] items-center" />
);

const AppNavigator = () => {
  const navigation = useNavigation();
  const { registerAppFunction, unregisterAppFunction, speak } =
    useVoiceAssistant();

  useEffect(() => {
    registerAppFunction('navigate_to_screen', {
      name: 'navigate_to_screen',
      description: 'Navigates to a specific screen by voice command',
      examples: ['go to login', 'open signup', 'back', 'go home'],
      handler: async ({ screen }: { screen?: string }) => {
        const lower = screen?.toLowerCase();

        if (lower?.includes('login')) navigation.navigate('Login' as never);
        else if (lower?.includes('signup') || lower?.includes('register'))
          navigation.navigate('Signup' as never);
        else if (lower?.includes('forgot'))
          navigation.navigate('Forgot' as never);
        else if (lower?.includes('home') || lower?.includes('tabs'))
          navigation.navigate('Tabs' as never);
        else if (lower?.includes('welcome'))
          navigation.navigate('Welcome' as never);
        else if (lower?.includes('back')) navigation.goBack();
        else return 'Unknown screen name';

        await speak(`Navigating to ${screen}`);
        return `Navigated to ${screen}`;
      },
    });

    return () => unregisterAppFunction('navigate_to_screen');
  }, [navigation]);

  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        headerTitleStyle: {
          color: 'white',
        },
        headerStyle: {
          backgroundColor: 'black',
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={() => ({
          headerShown: false,
          animation: 'slide_from_right',
        })}
      />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={() => ({
          title: 'Login',
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} className="px-2">
              <ArrowLeft size={24} color="white" />
            </Pressable>
          ),
          headerBackground: () => <HeaderBackground />,
        })}
      />

      <Stack.Screen
        name="Signup"
        component={SignUpScreen}
        options={() => ({
          title: 'Signup',
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} className="px-2">
              <ArrowLeft size={24} color="white" />
            </Pressable>
          ),
          headerBackground: () => <HeaderBackground />,
        })}
      />

      <Stack.Screen
        name="Forgot"
        component={ForgotPasswordScreen}
        options={() => ({
          title: 'Password Reset Request',
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} className="px-2">
              <ArrowLeft size={24} color="white" />
            </Pressable>
          ),
          headerBackground: () => <HeaderBackground />,
        })}
      />

      <Stack.Screen name="Tabs" component={TabsNavigator} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
