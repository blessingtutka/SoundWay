import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
// import { getAuth } from 'firebase/auth';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// For dev import-data and reset-data script
// JUST DON'T USE IT, I HAVE ALREADY IMPORTED DATA
// IF YOU WANT TO IMPORT YOUR OWN DATA YOU HAVE TO RESET AND THE IMPORT BUT DON'T PLEASE
// use  getAuth for auth and uncommment the lines below
// import { config } from 'dotenv';
// import path from 'path';
// const envPath = path.resolve(process.cwd(), '.env');
// config({ path: envPath });

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

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
// const auth = getAuth(app);

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
