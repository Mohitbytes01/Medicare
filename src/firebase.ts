import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AuthUser, SupportedLanguage } from './types/prescription';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Validate Connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Verbatim maxLength and pattern constants from firebase-blueprint.json
export const USER_PROFILE_CONSTRAINTS = {
  UID_MAX_LENGTH: 128,
  UID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  NAME_MAX_LENGTH: 120,
  EMAIL_MAX_LENGTH: 254,
  PHONE_MAX_LENGTH: 32,
};

export async function syncFirebaseUserProfile(
  fbUser: User,
  preferredLanguage: SupportedLanguage = 'en'
): Promise<AuthUser> {
  const uid = fbUser.uid.slice(0, USER_PROFILE_CONSTRAINTS.UID_MAX_LENGTH);
  const profilePath = `users/${uid}/private/profile`;
  const profileRef = doc(db, 'users', uid, 'private', 'profile');

  const safeName = (fbUser.displayName || fbUser.email?.split('@')[0] || 'Patient')
    .trim()
    .slice(0, USER_PROFILE_CONSTRAINTS.NAME_MAX_LENGTH);
  const safeEmail = (fbUser.email || 'user@mediverify.app')
    .trim()
    .slice(0, USER_PROFILE_CONSTRAINTS.EMAIL_MAX_LENGTH);
  const safePhone = (fbUser.phoneNumber || '+91 98301 44820')
    .trim()
    .slice(0, USER_PROFILE_CONSTRAINTS.PHONE_MAX_LENGTH);

  try {
    const existingSnap = await getDoc(profileRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      return {
        id: uid,
        name: String(data.name || safeName),
        identifier: String(data.email || safeEmail),
        phone: String(data.phone || safePhone),
        preferredLanguage:
          data.preferredLanguage === 'bn' || data.preferredLanguage === 'hi'
            ? data.preferredLanguage
            : 'en',
        createdAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, profilePath);
  }

  try {
    await setDoc(profileRef, {
      uid,
      name: safeName,
      email: safeEmail,
      phone: safePhone,
      preferredLanguage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, profilePath);
  }

  return {
    id: uid,
    name: safeName,
    identifier: safeEmail,
    phone: safePhone,
    preferredLanguage,
    createdAt: new Date().toISOString(),
  };
}

export async function signInWithGoogle(
  preferredLanguage: SupportedLanguage = 'en'
): Promise<AuthUser> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return syncFirebaseUserProfile(credential.user, preferredLanguage);
}

export async function updateFirebaseUserProfile(
  uid: string,
  updates: {
    name: string;
    phone: string;
    preferredLanguage: SupportedLanguage;
  }
): Promise<void> {
  const safeUid = uid.slice(0, USER_PROFILE_CONSTRAINTS.UID_MAX_LENGTH);
  const profilePath = `users/${safeUid}/private/profile`;
  const profileRef = doc(db, 'users', safeUid, 'private', 'profile');

  const safeName = updates.name
    .trim()
    .slice(0, USER_PROFILE_CONSTRAINTS.NAME_MAX_LENGTH);
  const safePhone = updates.phone
    .trim()
    .slice(0, USER_PROFILE_CONSTRAINTS.PHONE_MAX_LENGTH);

  try {
    await updateDoc(profileRef, {
      name: safeName || 'Patient',
      phone: safePhone,
      preferredLanguage: updates.preferredLanguage,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }
}

export async function signOutFromFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch {
    // Ignore if not signed into Firebase
  }
}
