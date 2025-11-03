import {
  AuthResponse,
  getCurrentUser,
  onAuthStateChange,
  sendEmailVerificationToUser,
  signInUser,
  signOutUser,
  signUpUser,
  updateUserProfile,
  User,
} from '@/services/authServices';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

interface Profile {
  displayName?: string;
  email?: string;
  photoURL?: string;
}

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<Profile>) => Promise<AuthResponse>;
  refreshUserData: () => Promise<void>;
  sendVerification: () => Promise<AuthResponse>;
  isEmailVerified: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

type Props = { children: ReactNode };

export const UserProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [verified, setVerified] = useState(false);

  // Track Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async firebaseUser => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setProfile({
          displayName: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
        });
        setIsLoggedIn(true);
        setVerified(firebaseUser.emailVerified);
        await AsyncStorage.setItem('user', JSON.stringify(firebaseUser));
      } else {
        setUser(null);
        setProfile(null);
        setIsLoggedIn(false);
        setVerified(false);
        await AsyncStorage.removeItem('user');
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const result = await signInUser(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      setProfile({
        displayName: result.user.displayName || '',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
      });
      setIsLoggedIn(true);
      setVerified(result.user.emailVerified);
      await AsyncStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
  };

  const register = async (
    email: string,
    password: string,
    displayName?: string,
  ) => {
    const result = await signUpUser(email, password, displayName);
    if (result.success && result.user) {
      setUser(result.user);
      setProfile({
        displayName: result.user.displayName || '',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
      });
      setIsLoggedIn(true);
      await AsyncStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
  };

  const logout = async () => {
    await signOutUser();
    setUser(null);
    setProfile(null);
    setIsLoggedIn(false);
    await AsyncStorage.removeItem('user');
  };

  const updateProfileHandler = async (profileData: Partial<Profile>) => {
    const result = await updateUserProfile(profileData);
    if (result.success && result.user) {
      setProfile({
        displayName: result.user.displayName || '',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
      });
      await AsyncStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
  };

  const refreshUserData = async () => {
    const current = getCurrentUser();
    if (current) {
      setUser(current);
      setProfile({
        displayName: current.displayName || '',
        email: current.email || '',
        photoURL: current.photoURL || '',
      });
      setVerified(current.emailVerified);
      await AsyncStorage.setItem('user', JSON.stringify(current));
    }
  };

  const sendVerification = async () => await sendEmailVerificationToUser();

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        isLoggedIn,
        isLoading,
        login,
        register,
        logout,
        updateProfile: updateProfileHandler,
        refreshUserData,
        sendVerification,
        isEmailVerified: verified,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
