// components/MultiSelectInput.tsx
import React, { useState } from 'react';
import { TextStyle, View } from 'react-native';
import { MultiSelect } from 'react-native-element-dropdown';

type Option = { label: string; value: string };

export function MultiSelectInput({
    placeholder = 'Select options',
    value = [],
    onChange,
    options,
}: {
    placeholder?: string;
    value?: string[];
    onChange?: (val: string[]) => void;
    options: Option[];
}) {
    const [selected, setSelected] = useState<string[]>(value);

    const commonTextStyle: TextStyle = {
        color: 'white',
        fontSize: 14,
    };

    return (
        <View>
            <MultiSelect
                style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: '#374151', // gray-700
                    backgroundColor: '#121212',
                    borderRadius: 8,
                }}
                data={options}
                labelField='label'
                valueField='value'
                placeholder={placeholder}
                search
                value={selected}
                onChange={(items) => {
                    setSelected(items);
                    onChange?.(items);
                }}
                placeholderStyle={{ ...commonTextStyle, color: '#9ca3af' }}
                selectedTextStyle={commonTextStyle}
                inputSearchStyle={{
                    ...commonTextStyle,
                    backgroundColor: '#1e1e1e',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    outlineWidth: 0,
                }}
                containerStyle={{
                    backgroundColor: '#121212',
                    borderColor: '#333',
                    borderWidth: 1,
                    borderRadius: 8,
                }}
                itemTextStyle={commonTextStyle}
                selectedStyle={{
                    backgroundColor: '#1e1e1e',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#444',
                }}
                activeColor='#1e1e1e'
            />
        </View>
    );
}
