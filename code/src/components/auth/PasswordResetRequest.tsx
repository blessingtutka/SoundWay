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
import { requestPasswordReset } from '@/services/authServices';
import {
  restPassowordRequestSchema,
  type resetPasswordRequestValue,
} from '@/utils/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Text, View } from 'react-native';

export function PasswordResetRequest() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<resetPasswordRequestValue>({
    resolver: zodResolver(restPassowordRequestSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: resetPasswordRequestValue) {
    try {
      setIsLoading(true);
      await requestPasswordReset(data.email);

      Alert.alert('Success', 'Password reset email sent successfully');
      form.reset();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  }

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
                <InputIcon as={Send} className="text-gray-400" />
              </InputSlot>
              <InputField
                placeholder="john@example.com"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                className="flex-1 py-2 px-3  text-gray-900 placeholder:text-gray-500"
              />
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircle} size="sm" color='#f87171'/>
                <FormControlErrorText className="text-red-400">
                  {fieldState.error.message}
                </FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>
        )}
      />

      {/* Submit Button */}
      <View className="flex justify-end">
        <Button
          onPress={form.handleSubmit(onSubmit)}
          disabled={isLoading}
          className="bg-blue-600 rounded-md flex-row items-center justify-center"
        >
          {isLoading ? (
            <>
              <ActivityIndicator className="text-white" />
              <Text className="text-white font-medium ml-2">
                Sending Request...
              </Text>
            </>
          ) : (
            <Text className="text-white font-medium">
              Request Password Reset
            </Text>
          )}
        </Button>
      </View>
    </View>
  );
}
