import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

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
  register: (email: string, password: string, displayName?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<AuthResponse>;
  refreshUserData: () => Promise<void>;
  sendVerification: () => Promise<AuthResponse>;
  isEmailVerified: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verified, setVerified] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setProfile({
          displayName: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
        });
        setIsLoggedIn(true);
        setVerified(firebaseUser.emailVerified);
      } else {
        setUser(null);
        setProfile(null);
        setIsLoggedIn(false);
        setVerified(false);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  //auth actions
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const result = await signInUser(email, password);

    if (!result.success) {
      await signOutUser();
      return result;
    }

    return result;
  };

  const register = async (email: string, password: string, displayName?: string): Promise<AuthResponse> => {
    return await signUpUser(email, password, displayName);
  };

  const logout = async () => {
    await signOutUser();
  };

  const updateProfileHandler = async (data: Partial<Profile>): Promise<AuthResponse> => {
    const result = await updateUserProfile(data);
    if (result.success) {
      await refreshUserData();
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
    }
  };

  const sendVerification = async (): Promise<AuthResponse> => {
    return await sendEmailVerificationToUser();
  };

  const value: UserContextType = {
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
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
