import { useUser } from '@/providers/UserProvider';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isLoggedIn } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoggedIn) {
            Alert.alert('Authentication Required', 'You are not logged in.');
            router.replace('/auth');
        }
    }, [isLoggedIn]);

    if (!router) return null;

    return <>{children}</>;
}
