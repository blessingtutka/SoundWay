import { ScreenLayout } from '@/components/ScreenLayout';
import { ProfileForm } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { useUser } from '@/providers/UserProvider';
import { useRouter } from 'expo-router';
import { LockKeyholeOpen, LogOut, MailCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

export default function ProfileScreen() {
  const { user, isLoading, logout, updateProfile, isEmailVerified, sendVerification, isLoggedIn } = useUser();

  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Redirect if user logs out
  useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      Alert.alert('Error', 'Please Login');
      router.replace('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  const handleProfileSubmit = async (data: any) => {
    try {
      const result = await updateProfile({
        displayName: data.displayName,
      });

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        setError(result.message);
        Alert.alert('Error', result.message);
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message);
    }
  };

  const handleSendVerification = async () => {
    try {
      const res = await sendVerification();
      if (res.success) {
        Alert.alert('Success', 'Verification email sent successfully!');
      } else {
        Alert.alert('Error', res.message || 'Failed to send verification email');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (isLoading || !user) {
    return (
      <View className='flex-1 justify-center items-center bg-gray-50'>
        <ActivityIndicator size='large' color='#3B82F6' />
        <Text className='text-gray-600 mt-4'>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <ScreenLayout>
      <Card className='w-fit bg-dark-trans self-center rounded-lg shadow-sm p-6 gap-4'>
        <View>
          <Text className='text-2xl font-bold text-gray-200 mb-1'>Profile Settings</Text>
          <Text className='text-sm text-gray-500'>Manage your account settings and preferences</Text>

          <View className='mt-4 flex-row items-center'>
            <View className='w-12 h-12 bg-blue-500 rounded-full justify-center items-center mr-3'>
              <Text className='text-white font-bold text-lg'>
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className='text-lg font-semibold text-gray-100'>{user.displayName || 'User'}</Text>
              <Text className='text-sm text-gray-300'>{user.email}</Text>
              <View className='flex-row items-center mt-1'>
                <View className={`w-2 h-2 rounded-full mr-2 ${isEmailVerified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <Text className={`text-xs ${isEmailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isEmailVerified ? 'Verified' : 'Unverified'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className='p-4'>
          <View>
            <Text className='text-lg font-semibold text-gray-200 mb-4'>Profile Information</Text>
            <ProfileForm
              isLoading={isLoading}
              onSubmit={handleProfileSubmit}
              data={{
                displayName: user.displayName || '',
                email: user.email || '',
              }}
            />
          </View>

          <Divider className='bg-gray-400 my-6' />

          <View>
            <Text className='text-lg font-semibold text-gray-200 mb-4'>Security</Text>
            <View className='flex gap-3'>
              <Button onPress={() => router.replace('/change')} className='bg-blue-600 rounded-md flex flex-row items-center justify-center'>
                <LockKeyholeOpen size={18} color={'white'} />
                <Text className='text-white font-medium'>Change Password</Text>
              </Button>
              {!isEmailVerified && (
                <Button onPress={handleSendVerification} className='bg-blue-600 text-gray-200 rounded-md flex flex-row items-center justify-center'>
                  <MailCheck size={18} color={'white'} />
                  <Text className='text-white font-medium'>Verify Your Email</Text>
                </Button>
              )}
            </View>
          </View>

          <Divider className='bg-gray-400 my-6' />

          <View>
            <Text className='text-lg font-semibold text-gray-200 mb-4'>Account Actions</Text>
            <Button onPress={handleLogout} className='bg-red-600 !text-white rounded-md flex flex-row items-center justify-center'>
              <LogOut size={18} color={'white'} />
              <Text className='text-white font-medium'>Logout</Text>
            </Button>
          </View>

          {error && (
            <View className='mt-4 p-3 bg-red-100 border border-red-300 rounded-md'>
              <Text className='text-red-700 text-sm'>{error}</Text>
            </View>
          )}
        </View>
      </Card>
    </ScreenLayout>
  );
}
