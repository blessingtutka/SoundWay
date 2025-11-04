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
import { useVoiceAssistant } from '@/providers/VoiceAssistanteProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
} from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Text, TouchableOpacity, View } from 'react-native';
import { loginSchema, type LoginFormData } from '../../utils/validators';

import { useEffect, useState } from 'react';

export function LoginForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: LoginFormData) => void;
  isLoading: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();
  const { subscribeToCommands } = useVoiceAssistant();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const unsubscribe = subscribeToCommands(cmd => {
      if (cmd.action === 'fill_login_field') {
        const { field, value } = cmd.parameters;
        if (field === 'email') form.setValue('email', value);
        if (field === 'password') form.setValue('password', value);
      }
      if (cmd.action === 'submit_login') form.handleSubmit(handleSubmitForm)();
    });

    return unsubscribe;
  }, [form]);

  const handleSubmitForm = async (data: LoginFormData) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  return (
    <View className="gap-4">
      {/* Email Field */}
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-medium text-gray-200">
                Email
              </FormControlLabelText>
            </FormControlLabel>
            <Input className="border border-gray-700 bg-[#121212] rounded-md">
              <InputSlot className="pl-3">
                <InputIcon as={Mail} className="text-gray-400" />
              </InputSlot>
              <InputField
                placeholder="email@example.com"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                className="flex-1 py-2 px-3 !text-white placeholder:!text-gray-500"
              />
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon
                  as={AlertCircle}
                  size="sm"
                  color="#f87171"
                />
                <FormControlErrorText className="text-red-400">
                  {fieldState.error.message}
                </FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>
        )}
      />

      {/* Password Field */}
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-medium text-gray-200">
                Password
              </FormControlLabelText>
            </FormControlLabel>
            <Input className="border border-gray-700 bg-[#121212] rounded-md">
              <InputSlot className="pl-3">
                <InputIcon as={Lock} className="text-gray-400" />
              </InputSlot>
              <InputField
                placeholder="Enter your password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                className="flex-1 py-2 px-3 !text-white placeholder:!text-gray-500"
              />
              <InputSlot className="pr-3">
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <InputIcon
                    as={showPassword ? EyeOff : Eye}
                    className="text-gray-400"
                  />
                </TouchableOpacity>
              </InputSlot>
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon
                  as={AlertCircle}
                  size="sm"
                  color="#f87171"
                />
                <FormControlErrorText className="text-red-400">
                  {fieldState.error.message}
                </FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>
        )}
      />

      {/* Forgot Password Link */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Forgot' as never)}
        className="self-end"
      >
        <Text className="text-blue-400 text-sm font-medium">
          Forgot Password?
        </Text>
      </TouchableOpacity>

      {/* Submit Button */}
      <Button
        onPress={form.handleSubmit(handleSubmitForm)}
        disabled={isLoading}
        className="bg-blue-600 rounded-md flex-row items-center justify-center"
      >
        {isLoading ? (
          <>
            <ActivityIndicator className="text-white" />
            <Text className="text-white font-medium ml-2">Signing in...</Text>
          </>
        ) : (
          <>
            <LogIn size={18} color={'white'} />
            <Text className="text-white font-medium ml-2">Sign In</Text>
          </>
        )}
      </Button>

      {/* Switch to Sign Up */}
      <View className="flex-row justify-center items-center mt-4">
        <Text className="text-gray-400">Don't have an account? </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Signup' as never)}
        >
          <Text className="text-blue-400 font-medium">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
