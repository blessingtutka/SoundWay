/* eslint-disable react/no-unstable-nested-components */
import { useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import ChangePasswordScreen from '@/screens/ChangePasswordScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';

const Stack = createNativeStackNavigator();

export default function ProfileStackNavigator() {
  const navigation = useNavigation();
  const { registerAppFunction, unregisterAppFunction, speak } =
    useVoiceAssistant();

  useEffect(() => {
    registerAppFunction('navigate_profile', {
      name: 'navigate_profile',
      description: 'Navigate within profile settings screens',
      examples: [
        'go to profile settings',
        'open change password',
        'back to profile screen',
      ],
      handler: async ({ screen }: { screen?: string }) => {
        const lower = screen?.toLowerCase();

        if (lower?.includes('change')) {
          navigation.navigate('Change' as never);
          await speak('Opening change password screen.');
          return 'Navigated to Change Password screen';
        }

        if (lower?.includes('profile')) {
          navigation.navigate('ProfileMain' as never);
          await speak('Back to profile screen.');
          return 'Navigated to Profile screen';
        }

        return 'Profile navigation command not recognized.';
      },
    });

    return () => unregisterAppFunction('navigate_profile');
  }, [navigation]);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen
        name="Change"
        component={ChangePasswordScreen}
        options={() => ({
          title: 'Change Password',
          href: null,
          headerShown: true,
          headerLeft: () => (
            <Pressable
              onPress={() => navigation.navigate('ProfileMain' as never)}
              className="px-2"
            >
              <ArrowLeft size={24} color="white" />
            </Pressable>
          ),
          headerBackground: () => (
            <View className="h-full flex-1 flex justify-center bg-black border-b border-b-[#FDB327]" />
          ),
        })}
      />
    </Stack.Navigator>
  );
}
