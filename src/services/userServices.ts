import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { User } from './collections';

interface UserDoc extends User {
  docId: string;
}

// Reference to users collection
const usersCollection = firestore().collection('users');
const userDoc = (uid: string) => firestore().collection('users').doc(uid);

// Get Auth Users
const getCollectionUsers = async (uid: string): Promise<UserDoc[]> => {
  try {
    const querySnapshot = await usersCollection.where('uid', '==', uid).get();
    
    const usersList = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        docId: doc.id,
        ...data,
      } as UserDoc;
    });
    return usersList;
  } catch (e) {
    console.error('Error getting collection users: ', e);
    return [];
  }
};

// Create User when sign in
const createUser = async (uid: string, userData: User): Promise<void> => {
  try {
    const newUserDoc = userDoc(uid);
    await newUserDoc.set({
      ...userData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error('Error creating user document: ', e);
    throw e;
  }
};

// Read All Users
const getUsers = async (): Promise<UserDoc[] | undefined> => {
  try {
    const querySnapshot = await usersCollection.get();
    const usersList = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        docId: doc.id,
        ...data,
      } as UserDoc;
    });
    return usersList;
  } catch (e) {
    console.error('Error getting users: ', e);
    return undefined;
  }
};

// Read User by ID
const getUser = async (uid: string): Promise<UserDoc | {}> => {
  try {
    const userDocRef = userDoc(uid);
    const userData = await userDocRef.get();
    
    if (userData.exists()) {
      const data = userData.data();
      return {
        docId: userData.id,
        ...data,
      } as UserDoc;
    } else {
      return {};
    }
  } catch (e) {
    console.error('Error getting user: ', e);
    return {};
  }
};

// Update User in Firestore only
const updateUser = async (
  uid: string,
  updatedUser: Partial<User>,
): Promise<void | Error> => {
  try {
    const userDocRef = userDoc(uid);
    await userDocRef.update({
      ...updatedUser,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error('Error updating user: ', e);
    return e as Error;
  }
};

// Update both Firestore and Auth profile
const updateAuthUser = async (
  uid: string,
  updatedUser: Partial<User>,
): Promise<void> => {
  try {
    // Update Firestore
    const userDocRef = userDoc(uid);
    await userDocRef.update({
      ...updatedUser,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Update Auth profile
    const userAuth = auth().currentUser;
    if (userAuth && (updatedUser.displayName || updatedUser.avatar)) {
      await userAuth.updateProfile({
        displayName: updatedUser.displayName || userAuth.displayName || '',
        photoURL: updatedUser.avatar || userAuth.photoURL || '',
      });
    }
  } catch (e) {
    console.error('Error updating user: ', e);
    throw e;
  }
};

// Delete User from Firestore only
const deleteUser = async (uid: string): Promise<void> => {
  try {
    const userDocRef = userDoc(uid);
    await userDocRef.delete();
  } catch (e) {
    console.error('Error deleting user: ', e);
    throw e;
  }
};

// Delete User from both Firestore and Auth
const deleteUserAuth = async (uid: string): Promise<void> => {
  try {
    // Delete from Firestore
    const userDocRef = userDoc(uid);
    await userDocRef.delete();

    // Delete from Auth
    const userAuth = auth().currentUser;
    if (userAuth) {
      await userAuth.delete();
    }
  } catch (e) {
    console.error('Error deleting user: ', e);
    throw e;
  }
};

// Create user with email and password
const createUserWithEmail = async (
  email: string,
  password: string,
  userData: Partial<User>,
): Promise<any> => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await createUser(user.uid, {
      uid: user.uid,
      email: user.email || email,
      displayName: userData.displayName || '',
      photoURL: userData.avatar || '',
      emailVerified: user.emailVerified,
      ...userData,
    } as User);

    return user;
  } catch (e) {
    console.error('Error creating user with email: ', e);
    throw e;
  }
};

// Additional utility functions
const getUserRealTime = (uid: string, callback: (user: UserDoc | null) => void) => {
  return userDoc(uid).onSnapshot(
    (documentSnapshot) => {
      if (documentSnapshot.exists()) {
        const data = documentSnapshot.data();
        callback({
          docId: documentSnapshot.id,
          ...data,
        } as UserDoc);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in real-time user listener: ', error);
      callback(null);
    }
  );
};

// Check if user document exists
const userExists = async (uid: string): Promise<boolean> => {
  try {
    const userDocRef = userDoc(uid);
    const userData = await userDocRef.get();
    return userData.exists();
  } catch (e) {
    console.error('Error checking if user exists: ', e);
    return false;
  }
};

export {
  createUser, createUserWithEmail, deleteUser, deleteUserAuth, getCollectionUsers, getUser, getUserRealTime, getUsers, updateAuthUser, updateUser, userDoc, userExists,
  usersCollection
};

  export type { User, UserDoc };

