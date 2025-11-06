import { ActivityIndicator } from '@/components/ui/activity-indicator';
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Text, TouchableOpacity, View } from 'react-native';
import { loginSchema, type LoginFormData } from '../../utils/validators';

import { useState } from 'react';

export function LoginForm({ onSubmit, isLoading }: { onSubmit: (data: LoginFormData) => void; isLoading: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmitForm = async (data: LoginFormData) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  return (
    <View className='gap-4'>
      {/* Email Field */}
      <Controller
        control={form.control}
        name='email'
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className='text-sm font-medium text-gray-200'>Email</FormControlLabelText>
            </FormControlLabel>
            <Input className='border border-gray-700 bg-[#121212] rounded-md'>
              <InputSlot className='pl-3'>
                <InputIcon as={Mail} className='text-gray-400' />
              </InputSlot>
              <InputField
                placeholder='email@example.com'
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize='none'
                keyboardType='email-address'
                className='flex-1 py-2 px-3 !text-white placeholder:!text-gray-500'
              />
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircle} size='sm' color='#f87171' />
                <FormControlErrorText className='text-red-400'>{fieldState.error.message}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>
        )}
      />

      {/* Password Field */}
      <Controller
        control={form.control}
        name='password'
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className='text-sm font-medium text-gray-200'>Password</FormControlLabelText>
            </FormControlLabel>
            <Input className='border border-gray-700 bg-[#121212] rounded-md'>
              <InputSlot className='pl-3'>
                <InputIcon as={Lock} className='text-gray-400' />
              </InputSlot>
              <InputField
                placeholder='Enter your password'
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry={!showPassword}
                autoCapitalize='none'
                className='flex-1 py-2 px-3 !text-white placeholder:!text-gray-500'
              />
              <InputSlot className='pr-3'>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <InputIcon as={showPassword ? EyeOff : Eye} className='text-gray-400' />
                </TouchableOpacity>
              </InputSlot>
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircle} size='sm' color='#f87171' />
                <FormControlErrorText className='text-red-400'>{fieldState.error.message}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>
        )}
      />

      {/* Forgot Password Link */}
      <TouchableOpacity onPress={() => router.push('/forgot')} className='self-end'>
        <Text className='text-blue-400 text-sm font-medium'>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={form.handleSubmit(handleSubmitForm)}
        disabled={isLoading}
        className='bg-blue-600 rounded-md flex-row items-center justify-center p-3'
      >
        {isLoading ? (
          <>
            <ActivityIndicator className='text-white' />
            <Text className='text-white font-medium ml-2'>Signing in...</Text>
          </>
        ) : (
          <>
            <LogIn size={18} color={'white'} />
            <Text className='text-white font-medium ml-2'>Sign In</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Switch to Sign Up */}
      <View className='flex-row justify-center items-center mt-4'>
        <Text className='text-gray-400'>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text className='text-blue-400 font-medium'>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
