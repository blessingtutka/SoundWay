import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
// ===== Types =====
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: any; // Use any for RNFB user object or define proper interface
  code?: string;
}

// ===== Error Mapping =====
const getAuthErrorMessage = (error: any): string => {
  const map: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address format.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No user found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'Email already in use.',
    'auth/weak-password': 'Weak password, choose a stronger one.',
    'auth/requires-recent-login': 'Please sign in again.',
    'auth/network-request-failed': 'Network error, check connection.',
    'auth/too-many-requests': 'Too many attempts, try later.',
    'auth/expired-action-code': 'Reset link expired.',
    'auth/invalid-action-code': 'Reset link invalid.',
    'auth/network-error': 'Network error, check connection.',
  };
  return map[error?.code] || error?.message || 'Unexpected error occurred.';
};

// ===== Auth Functions =====

// Sign Up
export const signUpUser = async (
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResponse> => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    if (displayName) {
      await user.updateProfile({
        displayName: displayName,
      });
    }
    
    await user.sendEmailVerification();
    return {
      success: true,
      message: 'Account created. Verify your email.',
      user,
    };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

// Sign In
export const signInUser = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return { 
      success: true, 
      message: 'Signed in successfully.', 
      user: userCredential.user 
    };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

// Sign Out
export const signOutUser = async (): Promise<AuthResponse> => {
  try {
    await auth().signOut();
    return { success: true, message: 'Signed out successfully.' };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

// Request Password Reset (sends email)
export const requestPasswordReset = async (
  email: string,
): Promise<AuthResponse> => {
  try {
    await auth().sendPasswordResetEmail(email);
    return { success: true, message: 'Password reset email sent.' };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

// Confirm Password Reset (using token)
export const resetPassword = async (
  token: string,
  newPassword: string,
): Promise<AuthResponse> => {
  try {
    await auth().confirmPasswordReset(token, newPassword);
    return { success: true, message: 'Password has been reset successfully.' };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

// Change Password
export const changePassword = async (
  oldPassword: string,
  newPassword: string,
): Promise<AuthResponse> => {
  const user = auth().currentUser;
  if (!user || !user.email) {
    return { success: false, message: 'No user signed in.' };
  }

  try {
    // Reauthenticate user
    const credential = auth.EmailAuthProvider.credential(user.email, oldPassword);
    await user.reauthenticateWithCredential(credential);

    // Update password
    await user.updatePassword(newPassword);

    return { success: true, message: 'Password updated successfully.' };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

// Update Profile
export const updateUserProfile = async (data: {
  displayName?: string;
  photoURL?: string;
}): Promise<AuthResponse> => {
  const user = auth().currentUser;
  if (!user) return { success: false, message: 'No user signed in.' };

  try {
    await user.updateProfile(data);
    // Reload user to get updated data
    await user.reload();
    return {
      success: true,
      message: 'Profile updated.',
      user: auth().currentUser,
    };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

// Update Email
export const updateUserEmail = async (
  newEmail: string,
): Promise<AuthResponse> => {
  const user = auth().currentUser;
  if (!user) return { success: false, message: 'No user signed in.' };

  try {
    await user.verifyBeforeUpdateEmail(newEmail);
    return {
      success: true,
      message: 'Verification email sent to new address.',
    };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

// Send Verification Email
export const sendEmailVerificationToUser = async (): Promise<AuthResponse> => {
  const user = auth().currentUser;
  if (!user) return { success: false, message: 'No user signed in.' };
  if (user.emailVerified)
    return { success: true, message: 'Email already verified.' };

  try {
    await user.sendEmailVerification();
    return { success: true, message: 'Verification email sent.' };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

// ===== Utilities =====
export const getCurrentUser = (): any => auth().currentUser;

export const onAuthStateChange = (callback: (user: any | null) => void) => 
  auth().onAuthStateChanged(callback);

export const isUserAuthenticated = (): boolean => !!auth().currentUser;

export const isEmailVerified = (): boolean =>
  auth().currentUser?.emailVerified || false;

// Additional RNFB specific utilities
export const getIdToken = async (): Promise<string | null> => {
  try {
    const user = auth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    return null;
  }
};

export const getIdTokenResult = async () => {
  try {
    const user = auth().currentUser;
    if (!user) return null;
    return await user.getIdTokenResult();
  } catch (error) {
    return null;
  }
};

export type User = FirebaseAuthTypes.User;
