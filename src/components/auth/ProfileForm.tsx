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
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, IdCard, LogIn, Send } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import {
  profileFormSchema,
  type ProfileFormValues,
} from '../../utils/validators';

export function ProfileForm({
  onSubmit,
  isLoading,
  data,
}: {
  onSubmit: (data: ProfileFormValues) => void;
  isLoading: boolean;
  data: Profile | null;
}) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { ...data },
  });

  return (
    <View className="gap-4">
      {/* displayName Field */}
      <Controller
        control={form.control}
        name="displayName"
        render={({ field, fieldState }) => (
          <FormControl isInvalid={!!fieldState.error}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-medium text-gray-200">
                Display Name
              </FormControlLabelText>
            </FormControlLabel>
            <Input className="border border-gray-700 bg-[#121212] focus:border-white focus:border-2 rounded-md">
              <InputSlot className="pl-3">
                <InputIcon as={IdCard} className="text-gray-400" />
              </InputSlot>
              <InputField
                placeholder="John Doe"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                className="flex-1 py-2 px-3 !text-white placeholder:!text-ph"
              />
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircle} size="sm" />
                <FormControlErrorText className="text-red-400">
                  {fieldState.error.message}
                </FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>
        )}
      />

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
            <Input className="border border-gray-700 bg-[#121212] focus:border-white focus:border-2 rounded-md">
              <InputSlot className="pl-3">
                <InputIcon as={Send} className="text-gray-400" />
              </InputSlot>
              <InputField
                placeholder="email@example.com"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                className="flex-1 py-2 px-3 !text-white placeholder:!text-ph"
              />
            </Input>
            {fieldState.error && (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircle} size="sm" />
                <FormControlErrorText className="text-red-400">
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
        className="main-btn flex-row items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <ActivityIndicator className="text-white" />
            <Text className="text-white font-medium">Saving..</Text>
          </>
        ) : (
          <>
            <LogIn size={18} color={'white'} />
            <Text className="text-white font-medium">Save</Text>
          </>
        )}
      </Button>
    </View>
  );
}
