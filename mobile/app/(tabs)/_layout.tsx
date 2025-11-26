import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs, useRouter } from 'expo-router';
import { ArrowLeft, House, RadioReceiver, UserCircle } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <House size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name='device'
        options={{
          title: 'Device',
          tabBarIcon: ({ color }) => <RadioReceiver size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserCircle size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name='change'
        options={{
          title: 'Change Password',
          href: null,
          headerShown: true,

          tabBarStyle: { display: 'flex' },
          headerLeft: () => (
            <Pressable onPress={() => router.push('/profile')} className='px-2'>
              <ArrowLeft size={24} color='white' />
            </Pressable>
          ),
          headerBackground: () => <View className='flex-1 bg-black border-b border-b-[#FDB327]' />,
        }}
      />
    </Tabs>
  );
}
