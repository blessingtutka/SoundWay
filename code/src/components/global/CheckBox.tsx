import React from 'react';
import { Pressable, Text, View } from 'react-native';

type CheckBoxProps = {
    placeholder?: string;
    value?: boolean;
    onChange?: (val: boolean) => void;
    className?: string;
};

export function CheckBox({ placeholder, value = false, onChange, className }: CheckBoxProps) {
    return (
        <Pressable onPress={() => onChange?.(!value)} className={`flex-row items-center ${className || ''}`}>
            <View
                className={`w-5 h-5 mr-2 rounded border 
          ${value ? 'bg-blue-600 border-blue-600' : 'border-gray-400'} 
          items-center justify-center`}
            >
                {value && <Text className='text-white text-xs'>✓</Text>}
            </View>
            {placeholder && <Text className='text-white'>{placeholder}</Text>}
        </Pressable>
    );
}
