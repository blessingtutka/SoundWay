import { collection, CollectionReference, doc, DocumentReference, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  avatar?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  emailVerified?: boolean;
}

const usersCollection = collection(db, 'users') as CollectionReference<User>;
const userDoc = (uid: string) => doc(db, 'users', uid) as DocumentReference<User>;

export { userDoc, usersCollection };
