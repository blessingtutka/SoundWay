import React from 'react';
import { Platform } from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export function HapticTab(props: BottomTabBarButtonProps) {
  const handlePressIn = (ev: any) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      ReactNativeHapticFeedback.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    props.onPressIn?.(ev);
  };

  return <PlatformPressable {...props} onPressIn={handlePressIn} />;
}
