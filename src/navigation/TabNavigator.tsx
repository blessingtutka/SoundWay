/* eslint-disable react/no-unstable-nested-components */
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { House, UserCircle } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import ProfileStackNavigator from './ProfileStackNavigator';

// Screens
import HomeScreen from '@/screens/HomeScreen';

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const navigation = useNavigation();
  const { registerAppFunction, unregisterAppFunction, speak } =
    useVoiceAssistant();

  useEffect(() => {
    registerAppFunction('navigate_tab', {
      name: 'navigate_tab',
      description: 'Switches to a tab by name',
      examples: ['go to home', 'open profile tab', 'switch to home tab'],
      handler: async ({ tab }: { tab?: string }) => {
        const lower = tab?.toLowerCase();
        if (lower?.includes('home')) {
          navigation.navigate('Home' as never);
          await speak('Switched to Home tab.');
          return 'Navigated to Home tab';
        }
        if (lower?.includes('profile')) {
          navigation.navigate('Profile' as never);
          await speak('Switched to Profile tab.');
          return 'Navigated to Profile tab';
        }
        return 'Unknown tab name.';
      },
    });

    return () => unregisterAppFunction('navigate_tab');
  }, [navigation]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[scheme].tint,
        tabBarButton: HapticTab as any,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
        tabBarBackground: TabBarBackground,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={() => ({
          tabBarIcon: ({ color }) => <House size={28} color={color} />,
          headerShown: false,
        })}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={() => ({
          title: 'Profile Setting',
          headerShown: false,
          tabBarIcon: ({ color }) => <UserCircle size={28} color={color} />,
          // headerLeft: () => (
          //   <Pressable onPress={() => navigation.goBack()} className="px-2">
          //     <ArrowLeft size={24} color="white" />
          //   </Pressable>
          // ),
          // headerBackground: () => (
          //   <View className="flex-1 flex justify-center bg-black border-b border-b-[#FDB327]" />
          // ),
        })}
      />
    </Tab.Navigator>
  );
}
