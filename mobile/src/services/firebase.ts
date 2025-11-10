import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
// const auth = getauth(app);

const db = getFirestore(app);
const storage = getStorage(app);

// Auth state listener
onAuthStateChanged(auth, async (user) => {
  let sessionTimeout = null;

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

      if (authTime && typeof authTime === 'number') {
        const authTimeMs = authTime * 1000;
        const sessionDuration = 1000 * 60 * 60 * 24 * 30;
        const millisecondsUntilExpiration = sessionDuration - (Date.now() - authTimeMs);

        if (millisecondsUntilExpiration > 0) {
          sessionTimeout = setTimeout(async () => {
            await signOut(auth);
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

export { auth, db, storage };
