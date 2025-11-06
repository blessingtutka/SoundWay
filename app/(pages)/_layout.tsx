import { Stack, useRouter } from 'expo-router';

import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export default function PagesLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen name='index' options={{ title: 'Welcome', headerShown: false }} />

      <Stack.Screen
        name='login'
        options={{
          title: 'Login',
          headerLeft: () => (
            <Pressable onPress={() => router.replace('/')} className='px-2'>
              <ArrowLeft size={24} color='white' />
            </Pressable>
          ),
          headerBackground: () => <View className='flex-1 bg-black border-b border-b-[#FDB327]' />,
        }}
      />

      <Stack.Screen
        name='signup'
        options={{
          title: 'Signup',
          headerLeft: () => (
            <Pressable onPress={() => router.replace('/')} className='px-2'>
              <ArrowLeft size={24} color='white' />
            </Pressable>
          ),
          headerBackground: () => <View className='flex-1 bg-black border-b border-b-[#FDB327]' />,
        }}
      />

      <Stack.Screen
        name='forgot'
        options={{
          title: 'Reset Password Request',
          headerLeft: () => (
            <Pressable onPress={() => router.replace('/')} className='px-2'>
              <ArrowLeft size={24} color='white' />
            </Pressable>
          ),
          headerBackground: () => <View className='flex-1 bg-black border-b border-b-[#FDB327]' />,
        }}
      />
    </Stack>
  );
}
