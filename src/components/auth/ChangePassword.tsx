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
import { changePassword } from '@/services/authServices';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/utils/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Text, View } from 'react-native';

export function ChangePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(data: ChangePasswordFormValues) {
    try {
      setIsLoading(true);
      await changePassword(data.oldPassword, data.newPassword);

      Alert.alert('Success', 'Password changed successfully');
      form.reset();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="gap-4">
      <Controller
        control={form.control}
        name="oldPassword"
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-medium text-gray-200">
                Current Password
              </FormControlLabelText>
            </FormControlLabel>
            <Input className="border border-gray-700 bg-[#121212] rounded-md">
              <InputField
                placeholder="Enter your current password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry={!showOldPassword}
                autoCapitalize="none"
                className="flex-1 py-2 px-3 text-gray-200 placeholder:text-gray-500"
              />
              <InputSlot
                className="pr-3"
                onPress={() => setShowOldPassword(!showOldPassword)}
              >
                <InputIcon
                  as={showOldPassword ? EyeOff : Eye}
                  className="text-gray-400"
                />
              </InputSlot>
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircle} size="sm" />
                <FormControlErrorText className="text-red-600">
                  {fieldState.error.message}
                </FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>
        )}
      />

      <Controller
        control={form.control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-medium text-gray-200">
                New Password
              </FormControlLabelText>
            </FormControlLabel>
            <Input className="border border-gray-700 bg-[#121212] rounded-md">
              <InputField
                placeholder="Enter your new password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                className="flex-1 py-2 px-3 text-gray-200 placeholder:text-gray-500"
              />
              <InputSlot
                className="pr-3"
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <InputIcon
                  as={showNewPassword ? EyeOff : Eye}
                  className="text-gray-400"
                />
              </InputSlot>
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircle} size="sm" />
                <FormControlErrorText className="text-red-600">
                  {fieldState.error.message}
                </FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>
        )}
      />

      {/* Confirm New Password Field */}
      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-medium text-gray-200">
                Confirm New Password
              </FormControlLabelText>
            </FormControlLabel>
            <Input className="border border-gray-700 bg-[#121212] rounded-md">
              <InputField
                placeholder="Confirm your new password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                className="flex-1 py-2 px-3 text-gray-200 placeholder:text-gray-500"
              />
              <InputSlot
                className="pr-3"
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <InputIcon
                  as={showConfirmPassword ? EyeOff : Eye}
                  className="text-gray-400"
                />
              </InputSlot>
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircle} size="sm" />
                <FormControlErrorText className="text-red-600">
                  {fieldState.error.message}
                </FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>
        )}
      />

      <Button
        onPress={form.handleSubmit(onSubmit)}
        disabled={isLoading}
        className="bg-blue-600 rounded-md flex-row items-center justify-center"
      >
        {isLoading ? (
          <>
            <ActivityIndicator className="text-white" />
            <Text className="text-white font-medium ml-2">
              Updating Password...
            </Text>
          </>
        ) : (
          <Text className="text-white font-medium">Update Password</Text>
        )}
      </Button>
    </View>
  );
}
