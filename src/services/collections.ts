import firestore from '@react-native-firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  avatar?: string;
  createdAt?: any;
  updatedAt?: any;
  emailVerified?: Boolean
}

// Type-safe collection references
const usersCollection = firestore().collection<User>('users');
const userDoc = (uid: string) => usersCollection.doc(uid);

export { userDoc, usersCollection };

