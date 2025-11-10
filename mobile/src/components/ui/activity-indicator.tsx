import { ActivityIndicator as RNActivityIndicator } from 'react-native';

export function ActivityIndicator({ color = 'primary', size = 'small', ...props }: { color?: string; size?: 'small' | 'large'; [key: string]: any }) {
    const colorMap: Record<string, string> = {
        primary: '#3b82f6', // blue-500
        white: '#ffffff',
        black: '#000000',
        gray: '#6b7280',
    };

    return <RNActivityIndicator color={colorMap[color] || color} size={size} {...props} />;
}
