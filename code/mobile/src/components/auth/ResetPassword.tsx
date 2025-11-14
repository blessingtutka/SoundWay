import { ActivityIndicator } from '@/components/ui/activity-indicator';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { resetPassword } from '@/services/authServices';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/utils/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';

// Define the route params type
type ResetPasswordRouteParams = {
  token: string;
};

export function ResetPassword() {
  const navigation = useNavigation();
  const route = useRoute();
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get token from route params with proper typing
  const params = route.params as ResetPasswordRouteParams;
  const token = params?.token;

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
  });

  const handleReset = async (data: ChangePasswordFormValues) => {
    if (!token) {
      Alert.alert('Error', 'Reset token is missing. Please request a new password reset link.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await resetPassword(token, data.newPassword);

      if (result.success) {
        setIsSuccess(true);
        form.reset();
        // Auto navigate after 2 seconds
        setTimeout(() => {
          navigation.navigate('Auth' as never);
        }, 2000);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (form.formState.isDirty && !isSuccess) {
      Alert.alert('Unsaved Changes', 'You have unsaved changes. Are you sure you want to leave?', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  if (isSuccess) {
    return (
      <View className='flex-1 bg-gray-50 justify-center items-center p-6'>
        <View className='bg-white rounded-2xl p-8 items-center shadow-lg max-w-sm w-full'>
          <CheckCircle size={64} color='#10B981' className='mb-4' />
          <Text className='text-2xl font-bold text-gray-900 text-center mb-2'>Password Reset!</Text>
          <Text className='text-gray-600 text-center mb-6'>
            Your password has been successfully reset. You will be redirected to the login screen shortly.
          </Text>
          <Button onPress={() => navigation.navigate('Auth' as never)} className='bg-green-600 rounded-lg w-full py-3'>
            <Text className='text-white font-semibold text-center'>Continue to Login</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className='flex-1 bg-gray-50'>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps='handled' showsVerticalScrollIndicator={false}>
        <View className='flex-1 justify-center p-6'>
          <View className='bg-white rounded-2xl p-6 shadow-lg border border-gray-200'>
            {/* Header */}
            <View className='flex-row items-center mb-6'>
              <TouchableOpacity onPress={handleBack} className='p-2 -ml-2 mr-3'>
                <ArrowLeft size={24} color='#374151' />
              </TouchableOpacity>
              <View className='flex-1'>
                <Text className='text-2xl font-bold text-gray-900'>Reset Password</Text>
                <Text className='text-gray-600 mt-1'>Enter your new password below</Text>
              </View>
            </View>

            {/* Password Requirements */}
            <View className='bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200'>
              <Text className='text-blue-800 font-semibold mb-2'>Password Requirements:</Text>
              <Text className='text-blue-700 text-sm'>
                • At least 8 characters long{'\n'}• Include uppercase and lowercase letters{'\n'}• Include at least one number{'\n'}• Include at least
                one special character
              </Text>
            </View>

            {/* Form */}
            <View className='gap-5'>
              {/* New Password Field */}
              <Controller
                control={form.control}
                name='newPassword'
                render={({ field, fieldState }) => (
                  <FormControl isInvalid={!!fieldState.error}>
                    <FormControlLabel>
                      <FormControlLabelText className='text-sm font-semibold text-gray-700'>New Password</FormControlLabelText>
                    </FormControlLabel>
                    <Input
                      className={`border rounded-lg bg-gray-50 ${fieldState.error ? 'border-red-300' : 'border-gray-300'} ${
                        fieldState.isDirty && !fieldState.error ? 'border-green-300' : ''
                      }`}
                    >
                      <InputField
                        placeholder='Enter your new password'
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize='none'
                        autoCorrect={false}
                        className='flex-1 py-3 px-4 text-gray-900 placeholder:text-gray-500'
                      />
                      <InputSlot className='pr-3' onPress={() => setShowNewPassword(!showNewPassword)}>
                        <InputIcon as={showNewPassword ? EyeOff : Eye} size={'sm'} className='text-gray-400' />
                      </InputSlot>
                    </Input>
                    {fieldState.error && (
                      <FormControlError>
                        <FormControlErrorIcon as={AlertCircle} size='sm' />
                        <FormControlErrorText className='text-red-600 text-sm'>{fieldState.error.message}</FormControlErrorText>
                      </FormControlError>
                    )}
                  </FormControl>
                )}
              />

              {/* Confirm New Password Field */}
              <Controller
                control={form.control}
                name='confirmPassword'
                render={({ field, fieldState }) => (
                  <FormControl isInvalid={!!fieldState.error}>
                    <FormControlLabel>
                      <FormControlLabelText className='text-sm font-semibold text-gray-700'>Confirm New Password</FormControlLabelText>
                    </FormControlLabel>
                    <Input
                      className={`border rounded-lg bg-gray-50 ${fieldState.error ? 'border-red-300' : 'border-gray-300'} ${
                        fieldState.isDirty && !fieldState.error ? 'border-green-300' : ''
                      }`}
                    >
                      <InputField
                        placeholder='Confirm your new password'
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize='none'
                        autoCorrect={false}
                        className='flex-1 py-3 px-4 text-gray-900 placeholder:text-gray-500'
                      />
                      <InputSlot className='pr-3' onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <InputIcon as={showConfirmPassword ? EyeOff : Eye} size={'sm'} className='text-gray-400' />
                      </InputSlot>
                    </Input>
                    {fieldState.error && (
                      <FormControlError>
                        <FormControlErrorIcon as={AlertCircle} size='sm' />
                        <FormControlErrorText className='text-red-600 text-sm'>{fieldState.error.message}</FormControlErrorText>
                      </FormControlError>
                    )}
                  </FormControl>
                )}
              />

              {/* Submit Button */}
              <Button
                onPress={form.handleSubmit(handleReset)}
                disabled={isLoading || !form.formState.isValid}
                className={`rounded-lg py-4 mt-2 ${isLoading || !form.formState.isValid ? 'bg-gray-400' : 'bg-blue-600'}`}
              >
                {isLoading ? (
                  <View className='flex-row items-center justify-center'>
                    <ActivityIndicator size='small' className='text-white' />
                    <Text className='text-white font-semibold ml-2'>Resetting Password...</Text>
                  </View>
                ) : (
                  <Text className='text-white font-semibold text-center'>Reset Password</Text>
                )}
              </Button>

              {/* Help Text */}
              <View className='bg-yellow-50 rounded-lg p-3 border border-yellow-200'>
                <Text className='text-yellow-800 text-sm text-center'>After resetting, you'll be automatically redirected to login.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
