import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Firebase is automatically initialized with react-native-firebase
// Make sure you have google-services.json (Android) and GoogleService-Info.plist (iOS) configured

const db = firestore();
const storageRef = storage();

// Auth state listener with proper React Native Firebase types
auth().onAuthStateChanged(async (user: any) => {
  let sessionTimeout: ReturnType<typeof setTimeout> | null = null;

  if (user === null) {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    await AsyncStorage.multiRemove(['user', 'role']);
    sessionTimeout = null;
  } else {
    try {
      const idTokenResult = await user.getIdTokenResult();
      const authTime = idTokenResult.claims.auth_time;

      // Check if auth_time exists and is a valid number
      if (authTime && typeof authTime === 'number') {
        const authTimeMs = authTime * 1000;
        const sessionDuration = 1000 * 60 * 60 * 24 * 30; // 30 days
        const millisecondsUntilExpiration = sessionDuration - (Date.now() - authTimeMs);

        // Only set timeout if expiration is in the future
        if (millisecondsUntilExpiration > 0) {
          sessionTimeout = setTimeout(async () => {
            await auth().signOut();
            await AsyncStorage.multiRemove(['user', 'role']);
          }, millisecondsUntilExpiration);
        }
      } else {
        console.warn('Invalid auth_time in token claims:', authTime);
      }
    } catch (error) {
      console.error('Error getting ID token result:', error);
    }
  }
});

export { auth, db, storageRef as storage };

