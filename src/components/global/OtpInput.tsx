import { useRef, useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';

const OtpInput = ({ onCodeFilled }: { onCodeFilled: (code: string) => void }) => {
    const [code, setCode] = useState<string[]>(Array(6).fill(''));
    const inputs = useRef<TextInput[]>(Array(6).fill(null));

    const handleChange = (text: string, index: number) => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        // Auto-focus next input
        if (text && index < 5) {
            inputs.current[index + 1]?.focus();
        }

        // Trigger callback when all fields are filled
        if (newCode.every((c) => c) && newCode.length === 6) {
            onCodeFilled(newCode.join(''));
            Keyboard.dismiss();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    return (
        <View className='relative w-full flex-row gap-2 justify-center items-center'>
            {Array.from({ length: 6 }).map((_, index) => (
                <View key={index} className='w-[16%] h-16 border border-gray-700 bg-[#121212] rounded-md justify-center items-center'>
                    <TextInput
                        ref={(ref) => (inputs.current[index] = ref as any)}
                        className='w-full h-full text-center text-2xl font-bold text-gray-200 '
                        keyboardType='number-pad'
                        maxLength={1}
                        value={code[index]}
                        onChangeText={(text) => handleChange(text, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        focusable={true}
                        selectionColor='#3b82f6'
                    />
                </View>
            ))}
        </View>
    );
};

export { OtpInput };
