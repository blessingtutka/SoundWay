import { createUserWithEmailAndPassword, deleteUser as deleteAuthUser, User as FirebaseUser, updateProfile } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { User } from './collections';
import { auth, db } from './firebase';

interface UserDoc extends User {
  docId: string;
}

// Reference to users collection
const usersCollection = collection(db, 'users');
const userDoc = (uid: string) => doc(db, 'users', uid);

// Get Auth Users
const getCollectionUsers = async (uid: string): Promise<UserDoc[]> => {
  try {
    const q = query(usersCollection, where('uid', '==', uid));
    const querySnapshot = await getDocs(q);

    const usersList = querySnapshot.docs.map((doc) => {
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
    await setDoc(newUserDoc, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error creating user document: ', e);
    throw e;
  }
};

// Read All Users
const getUsers = async (): Promise<UserDoc[] | undefined> => {
  try {
    const querySnapshot = await getDocs(usersCollection);
    const usersList = querySnapshot.docs.map((doc) => {
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
const getUser = async (uid: string): Promise<UserDoc | null> => {
  try {
    const userDocRef = userDoc(uid);
    const userData = await getDoc(userDocRef);

    if (userData.exists()) {
      const data = userData.data();
      return {
        docId: userData.id,
        ...data,
      } as UserDoc;
    } else {
      return null;
    }
  } catch (e) {
    console.error('Error getting user: ', e);
    return null;
  }
};

// Update User in Firestore only
const updateUser = async (uid: string, updatedUser: Partial<User>): Promise<void> => {
  try {
    const userDocRef = userDoc(uid);
    await updateDoc(userDocRef, {
      ...updatedUser,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error updating user: ', e);
    throw e;
  }
};

// Update both Firestore and Auth profile
const updateAuthUser = async (uid: string, updatedUser: Partial<User>): Promise<void> => {
  try {
    // Update Firestore
    const userDocRef = userDoc(uid);
    await updateDoc(userDocRef, {
      ...updatedUser,
      updatedAt: serverTimestamp(),
    });

    // Update Auth profile
    const userAuth = auth.currentUser;
    if (userAuth && (updatedUser.displayName || updatedUser.avatar)) {
      await updateProfile(userAuth, {
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
    await deleteDoc(userDocRef);
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
    await deleteDoc(userDocRef);

    // Delete from Auth
    const userAuth = auth.currentUser;
    if (userAuth) {
      await deleteAuthUser(userAuth);
    }
  } catch (e) {
    console.error('Error deleting user: ', e);
    throw e;
  }
};

// Create user with email and password
const createUserWithEmail = async (email: string, password: string, userData: Partial<User>): Promise<FirebaseUser> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await createUser(user.uid, {
      uid: user.uid,
      email: user.email || email,
      displayName: userData.displayName || '',
      avatar: userData.avatar || '',
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
  return onSnapshot(
    userDoc(uid),
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
    },
  );
};

// Check if user document exists
const userExists = async (uid: string): Promise<boolean> => {
  try {
    const userDocRef = userDoc(uid);
    const userData = await getDoc(userDocRef);
    return userData.exists();
  } catch (e) {
    console.error('Error checking if user exists: ', e);
    return false;
  }
};

// Batch operations for multiple users
const getUsersByIds = async (uids: string[]): Promise<UserDoc[]> => {
  try {
    // Since Firestore Web doesn't have direct "in" query with array.contains,
    // we need to get all users and filter
    const allUsers = await getUsers();
    if (!allUsers) return [];

    return allUsers.filter((user) => uids.includes(user.uid));
  } catch (e) {
    console.error('Error getting users by IDs: ', e);
    return [];
  }
};

// Search users by display name
const searchUsersByName = async (searchTerm: string): Promise<UserDoc[]> => {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a basic prefix search - consider using Algolia or similar for advanced search
    const allUsers = await getUsers();
    if (!allUsers) return [];

    return allUsers.filter((user) => user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()));
  } catch (e) {
    console.error('Error searching users: ', e);
    return [];
  }
};

export {
  createUser,
  createUserWithEmail,
  deleteUser,
  deleteUserAuth,
  getCollectionUsers,
  getUser,
  getUserRealTime,
  getUsers,
  getUsersByIds,
  searchUsersByName,
  updateAuthUser,
  updateUser,
  userDoc,
  userExists,
  usersCollection,
};

export type { UserDoc };
