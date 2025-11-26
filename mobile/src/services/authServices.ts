import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  User,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { auth } from './firebase';

// ===== Types =====
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User | null;
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
export const signUpUser = async (email: string, password: string, displayName?: string): Promise<AuthResponse> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) {
      await updateProfile(user, {
        displayName: displayName,
      });
    }

    await sendEmailVerification(user);
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
export const signInUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      message: 'Signed in successfully.',
      user: userCredential.user,
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
    await signOut(auth);
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
export const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
  try {
    await sendPasswordResetEmail(auth, email);
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
  code: string, // Firebase Web uses "code" instead of "token"
  newPassword: string,
): Promise<AuthResponse> => {
  try {
    await confirmPasswordReset(auth, code, newPassword);
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
export const changePassword = async (oldPassword: string, newPassword: string): Promise<AuthResponse> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    return { success: false, message: 'No user signed in.' };
  }

  try {
    // Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

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
export const updateUserProfile = async (data: { displayName?: string; photoURL?: string }): Promise<AuthResponse> => {
  const user = auth.currentUser;
  if (!user) return { success: false, message: 'No user signed in.' };

  try {
    await updateProfile(user, data);
    return {
      success: true,
      message: 'Profile updated.',
      user: auth.currentUser, // Note: currentUser is updated automatically
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
export const updateUserEmail = async (newEmail: string): Promise<AuthResponse> => {
  const user = auth.currentUser;
  if (!user) return { success: false, message: 'No user signed in.' };

  try {
    await verifyBeforeUpdateEmail(user, newEmail);
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
  const user = auth.currentUser;
  if (!user) return { success: false, message: 'No user signed in.' };
  if (user.emailVerified) return { success: true, message: 'Email already verified.' };

  try {
    await sendEmailVerification(user);
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
export const getCurrentUser = (): User | null => auth.currentUser;

export const onAuthStateChange = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);

export const isUserAuthenticated = (): boolean => !!auth.currentUser;

export const isEmailVerified = (): boolean => auth.currentUser?.emailVerified || false;

export const getIdToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    return null;
  }
};

export const getIdTokenResult = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdTokenResult();
  } catch (error) {
    return null;
  }
};

// Delete user account
export const deleteUserAccount = async (password: string): Promise<AuthResponse> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    return { success: false, message: 'No user signed in.' };
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    await user.delete();
    return { success: true, message: 'Account deleted successfully.' };
  } catch (error: any) {
    return {
      success: false,
      message: getAuthErrorMessage(error),
      code: error.code,
    };
  }
};

export { User };
