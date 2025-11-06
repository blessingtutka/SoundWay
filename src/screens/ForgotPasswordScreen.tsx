import { PasswordResetRequest } from '@/components/auth';
import { ScreenLayout } from '@/components/ScreenLayout';
import { Card } from '@/components/ui/card';
import React from 'react';
import { Text, View } from 'react-native';

export default function ForgotPasswordScreen() {
  return (
    <ScreenLayout>
      <Card className="w-full max-w-md bg-[#121212] rounded-lg shadow-sm">
        <View className="flex-col justify-center  mb-4">
          <Text className={`font-medium text-blue-400 text-3xl`}>
            Reset Password
          </Text>
          <Text className={`font-medium text-gray-500 text-base`}>
            Please provide an existing email
          </Text>
        </View>

        <PasswordResetRequest />
      </Card>
    </ScreenLayout>
  );
}
