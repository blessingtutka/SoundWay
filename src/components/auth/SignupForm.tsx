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
import { signupSchema, type SignupFormData } from '@/utils/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { AlertCircle, Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, TouchableOpacity, View } from 'react-native';
import { CheckBox } from '../global';

export function SignUpForm({ onSubmit, isLoading }: { onSubmit: (data: SignupFormData) => void; isLoading: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  const handleSubmitForm = async (data: SignupFormData) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  return (
    <View className='gap-4'>
      {/* Display Name Field */}
      <Controller
        control={form.control}
        name='displayName'
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className='text-sm font-medium text-gray-200'>Full Name</FormControlLabelText>
            </FormControlLabel>
            <Input className='border border-gray-700 bg-[#121212] rounded-md'>
              <InputSlot className='pl-3'>
                <InputIcon as={User} className='text-gray-400' />
              </InputSlot>
              <InputField
                placeholder='John Doe'
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize='words'
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
                placeholder='Create a password'
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
      {/* Confirm Password Field */}
      <Controller
        control={form.control}
        name='confirmPassword'
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className='text-sm font-medium text-gray-200'>Confirm Password</FormControlLabelText>
            </FormControlLabel>
            <Input className='border border-gray-700 bg-[#121212] rounded-md'>
              <InputSlot className='pl-3'>
                <InputIcon as={Lock} className='text-gray-400' />
              </InputSlot>
              <InputField
                placeholder='Confirm your password'
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize='none'
                className='flex-1 py-2 px-3 !text-white placeholder:!text-gray-500'
              />
              <InputSlot className='pr-3'>
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <InputIcon as={showConfirmPassword ? EyeOff : Eye} className='text-gray-400' />
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
      <Controller
        control={form.control}
        name='terms'
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <View className='flex-row items-start space-x-3'>
              <CheckBox value={field.value} onChange={field.onChange} aria-label='I agree to the terms and conditions' />
              <View className='flex-1'>
                <Text className='text-gray-300 text-sm'>
                  I agree to the <Text className='text-blue-400'>Terms of Service</Text> and <Text className='text-blue-400'>Privacy Policy</Text>
                </Text>
                {fieldState.error && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} size='sm' color='#f87171' />
                    <FormControlErrorText className='text-red-400'>{fieldState.error.message}</FormControlErrorText>
                  </FormControlError>
                )}
              </View>
            </View>
          </FormControl>
        )}
      />
      {/* Submit Button */}
      <TouchableOpacity
        onPress={form.handleSubmit(handleSubmitForm)}
        disabled={isLoading}
        className='bg-green-600 rounded-md flex-row items-center justify-center mt-2 p-3'
      >
        {isLoading ? (
          <>
            <ActivityIndicator className='text-white' />
            <Text className='text-white font-medium ml-2'>Creating Account...</Text>
          </>
        ) : (
          <>
            <UserPlus size={18} color={'white'} />
            <Text className='text-white font-medium ml-2'>Create Account</Text>
          </>
        )}
      </TouchableOpacity>
      {/* Switch to Login */}
      <View className='flex-row justify-center items-center mt-4'>
        <Text className='text-gray-400'>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text className='text-blue-400 font-medium'>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
