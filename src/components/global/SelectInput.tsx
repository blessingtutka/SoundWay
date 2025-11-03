import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

type CSelectInputProps = {
    placeholder?: string;
    value?: string;
    onChange?: (val: string) => void;
    options: { label: string; value: string; disabled?: boolean }[];
    className?: string;
};

export function CSelectInput({ placeholder, value, onChange, options, className }: CSelectInputProps) {
    return (
        <View style={styles.container}>
            <Picker
                selectedValue={value}
                dropdownIconColor='#fff'
                onValueChange={(val) => {
                    if (onChange) onChange(val);
                }}
                style={styles.picker}
                prompt={placeholder}
            >
                {placeholder && <Picker.Item label={placeholder} value='' enabled={false} color='#888' />}
                {options.map((opt) => (
                    <Picker.Item
                        key={opt.value}
                        label={opt.label}
                        value={opt.value}
                        enabled={!opt.disabled}
                        color={!opt.disabled ? (Platform.OS === 'web' ? '#fff' : '#000') : '#888'}
                    />
                ))}
            </Picker>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 6,
        backgroundColor: '#121212',
        overflow: 'hidden',
    },
    picker: {
        color: '#fff',
        paddingVertical: 6,
        width: '100%',
        backgroundColor: '#121212',
        paddingHorizontal: 12,
        height: 50,
    },
});
