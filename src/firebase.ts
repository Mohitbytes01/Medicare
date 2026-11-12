import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  AuthUser,
  PrescriptionVerificationResult,
  RiskSeverity,
  SavedOrderSummaryRecord,
  SavedPrescriptionRecord,
  SupportedLanguage,
} from './types/prescription';

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
  CHRONIC_DISEASES_MAX_LENGTH: 500,
  KNOWN_ALLERGIES_MAX_LENGTH: 300,
  ACTIVE_MEDICINES_MAX_LENGTH: 600,
};

export const SAVED_PRESCRIPTION_CONSTRAINTS = {
  VERIFICATION_ID_MAX_LENGTH: 64,
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  PATIENT_NAME_MAX_LENGTH: 120,
  DOCTOR_NAME_MAX_LENGTH: 120,
  PRESCRIPTION_DATE_MAX_LENGTH: 40,
  DIAGNOSIS_SUMMARY_MAX_LENGTH: 400,
  MEDICINES_SUMMARY_MAX_LENGTH: 600,
};

export const SAVED_ORDER_CONSTRAINTS = {
  ORDER_ID_MAX_LENGTH: 64,
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  PLATFORM_NAME_MAX_LENGTH: 40,
  ITEMS_SUMMARY_MAX_LENGTH: 600,
  ITEM_IDS_CSV_MAX_LENGTH: 500,
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
        age: typeof data.age === 'number' ? data.age : undefined,
        chronicDiseases: String(data.chronicDiseases || ''),
        knownAllergies: String(data.knownAllergies || ''),
        activeMedicines: String(data.activeMedicines || ''),
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
      age: 0,
      chronicDiseases: '',
      knownAllergies: '',
      activeMedicines: '',
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
    age: 0,
    chronicDiseases: '',
    knownAllergies: '',
    activeMedicines: '',
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
    age?: number;
    chronicDiseases?: string;
    knownAllergies?: string;
    activeMedicines?: string;
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
  const safeAge = Math.max(0, Math.min(130, Math.round(Number(updates.age || 0))));
  const safeDiseases = (updates.chronicDiseases || '')
    .trim()
    .slice(0, USER_PROFILE_CONSTRAINTS.CHRONIC_DISEASES_MAX_LENGTH);
  const safeAllergies = (updates.knownAllergies || '')
    .trim()
    .slice(0, USER_PROFILE_CONSTRAINTS.KNOWN_ALLERGIES_MAX_LENGTH);
  const safeMedicines = (updates.activeMedicines || '')
    .trim()
    .slice(0, USER_PROFILE_CONSTRAINTS.ACTIVE_MEDICINES_MAX_LENGTH);

  try {
    await updateDoc(profileRef, {
      name: safeName || 'Patient',
      phone: safePhone,
      age: safeAge,
      chronicDiseases: safeDiseases,
      knownAllergies: safeAllergies,
      activeMedicines: safeMedicines,
      preferredLanguage: updates.preferredLanguage,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }
}

export function extractClinicalSummaryFromPrescription(
  result: PrescriptionVerificationResult,
  existingUser?: AuthUser | null
): {
  age: number;
  chronicDiseases: string;
  activeMedicines: string;
} {
  // Parse integer age from strings like "64 yrs / Male" or "58Y/F"
  const ageMatch = String(result.patientAgeGender || '').match(/(\d{1,3})/);
  const parsedAge = ageMatch ? Math.min(130, Math.max(0, parseInt(ageMatch[1], 10))) : 0;
  const finalAge = parsedAge > 0 ? parsedAge : existingUser?.age || 0;

  const newDiagnosis = (result.diagnosisSummary || '').trim();
  const prevDiseases = (existingUser?.chronicDiseases || '').trim();
  const combinedDiseases =
    newDiagnosis && !prevDiseases.toLowerCase().includes(newDiagnosis.toLowerCase())
      ? prevDiseases
        ? `${prevDiseases}; ${newDiagnosis}`
        : newDiagnosis
      : prevDiseases || newDiagnosis;

  const medNames = (result.medicines || [])
    .map((m) => `${m.name} (${m.dosage})`.trim())
    .filter(Boolean)
    .join(', ');
  const finalMedicines = medNames || existingUser?.activeMedicines || '';

  return {
    age: finalAge,
    chronicDiseases: combinedDiseases.slice(
      0,
      USER_PROFILE_CONSTRAINTS.CHRONIC_DISEASES_MAX_LENGTH
    ),
    activeMedicines: finalMedicines.slice(
      0,
      USER_PROFILE_CONSTRAINTS.ACTIVE_MEDICINES_MAX_LENGTH
    ),
  };
}

export async function saveVerifiedPrescriptionToFirestore(
  uid: string,
  result: PrescriptionVerificationResult
): Promise<SavedPrescriptionRecord> {
  const safeUid = uid.slice(0, USER_PROFILE_CONSTRAINTS.UID_MAX_LENGTH);
  const safeId = (result.verificationId || `RX-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, SAVED_PRESCRIPTION_CONSTRAINTS.VERIFICATION_ID_MAX_LENGTH);

  const rxPath = `users/${safeUid}/prescriptions/${safeId}`;
  const rxRef = doc(db, 'users', safeUid, 'prescriptions', safeId);

  const safePatientName = (result.patientName || 'Patient')
    .trim()
    .slice(0, SAVED_PRESCRIPTION_CONSTRAINTS.PATIENT_NAME_MAX_LENGTH);
  const safeDoctorName = (result.doctorName || 'Doctor')
    .trim()
    .slice(0, SAVED_PRESCRIPTION_CONSTRAINTS.DOCTOR_NAME_MAX_LENGTH);
  const safeDate = (result.prescriptionDate || new Date().toLocaleDateString('en-IN'))
    .trim()
    .slice(0, SAVED_PRESCRIPTION_CONSTRAINTS.PRESCRIPTION_DATE_MAX_LENGTH);
  const safeDiagnosis = (result.diagnosisSummary || '')
    .trim()
    .slice(0, SAVED_PRESCRIPTION_CONSTRAINTS.DIAGNOSIS_SUMMARY_MAX_LENGTH);
  const safeMedsSummary = (result.medicines || [])
    .map((m) => `${m.name} (${m.dosage})`)
    .join(', ')
    .slice(0, SAVED_PRESCRIPTION_CONSTRAINTS.MEDICINES_SUMMARY_MAX_LENGTH);
  const safeStatus: RiskSeverity =
    result.safetyAudit?.overallStatus === 'HIGH_RISK' ||
    result.safetyAudit?.overallStatus === 'CAUTION'
      ? result.safetyAudit.overallStatus
      : 'SAFE';
  const safeCount = Math.min(50, Math.max(0, (result.medicines || []).length));
  const safeTotal = Math.max(0, Number(result.priceSummary?.smartSplitCartTotal || 0));

  try {
    await setDoc(rxRef, {
      ownerId: safeUid,
      verificationId: safeId,
      patientName: safePatientName,
      doctorName: safeDoctorName,
      prescriptionDate: safeDate,
      diagnosisSummary: safeDiagnosis,
      medicinesSummary: safeMedsSummary,
      overallSafetyStatus: safeStatus,
      medicineCount: safeCount,
      smartSplitCartTotal: safeTotal,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, rxPath);
  }

  return {
    verificationId: safeId,
    patientName: safePatientName,
    doctorName: safeDoctorName,
    prescriptionDate: safeDate,
    diagnosisSummary: safeDiagnosis,
    medicinesSummary: safeMedsSummary,
    overallSafetyStatus: safeStatus,
    medicineCount: safeCount,
    smartSplitCartTotal: safeTotal,
    createdAt: new Date().toISOString(),
  };
}

export async function listSavedPrescriptionsFromFirestore(
  uid: string
): Promise<SavedPrescriptionRecord[]> {
  const safeUid = uid.slice(0, USER_PROFILE_CONSTRAINTS.UID_MAX_LENGTH);
  const colPath = `users/${safeUid}/prescriptions`;
  const colRef = collection(db, 'users', safeUid, 'prescriptions');
  const q = query(colRef, where('ownerId', '==', safeUid), limit(20));

  try {
    const snap = await getDocs(q);
    const records: SavedPrescriptionRecord[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      records.push({
        verificationId: String(d.verificationId || docSnap.id),
        patientName: String(d.patientName || 'Patient'),
        doctorName: String(d.doctorName || 'Doctor'),
        prescriptionDate: String(d.prescriptionDate || ''),
        diagnosisSummary: String(d.diagnosisSummary || ''),
        medicinesSummary: String(d.medicinesSummary || ''),
        overallSafetyStatus:
          d.overallSafetyStatus === 'HIGH_RISK' || d.overallSafetyStatus === 'CAUTION'
            ? d.overallSafetyStatus
            : 'SAFE',
        medicineCount: Number(d.medicineCount || 0),
        smartSplitCartTotal: Number(d.smartSplitCartTotal || 0),
        createdAt:
          d.createdAt && typeof d.createdAt.toDate === 'function'
            ? d.createdAt.toDate().toISOString()
            : new Date().toISOString(),
      });
    });
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function deleteSavedPrescriptionFromFirestore(
  uid: string,
  verificationId: string
): Promise<void> {
  const safeUid = uid.slice(0, USER_PROFILE_CONSTRAINTS.UID_MAX_LENGTH);
  const safeId = verificationId
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, SAVED_PRESCRIPTION_CONSTRAINTS.VERIFICATION_ID_MAX_LENGTH);
  const docPath = `users/${safeUid}/prescriptions/${safeId}`;
  const docRef = doc(db, 'users', safeUid, 'prescriptions', safeId);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function saveOrderSummaryToFirestore(
  uid: string,
  input: {
    orderId?: string;
    platformId: '1mg' | 'pharmeasy' | 'netmeds' | 'apollo';
    platformName: string;
    itemsSummary: string;
    itemIdsCsv: string;
    itemCount: number;
    totalMrp: number;
    totalPaid: number;
    totalSaved: number;
  }
): Promise<SavedOrderSummaryRecord> {
  const safeUid = uid.slice(0, USER_PROFILE_CONSTRAINTS.UID_MAX_LENGTH);
  const rawOrderId =
    input.orderId ||
    `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const safeOrderId = rawOrderId
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, SAVED_ORDER_CONSTRAINTS.ORDER_ID_MAX_LENGTH);

  const orderPath = `users/${safeUid}/orders/${safeOrderId}`;
  const orderRef = doc(db, 'users', safeUid, 'orders', safeOrderId);

  const safePlatformId: '1mg' | 'pharmeasy' | 'netmeds' | 'apollo' =
    input.platformId === 'pharmeasy' ||
    input.platformId === 'netmeds' ||
    input.platformId === 'apollo'
      ? input.platformId
      : '1mg';

  const safePlatformName = (input.platformName || 'Tata 1mg')
    .trim()
    .slice(0, SAVED_ORDER_CONSTRAINTS.PLATFORM_NAME_MAX_LENGTH);
  const safeItemsSummary = (input.itemsSummary || 'Healthcare Essentials')
    .trim()
    .slice(0, SAVED_ORDER_CONSTRAINTS.ITEMS_SUMMARY_MAX_LENGTH);
  const safeItemIdsCsv = (input.itemIdsCsv || 'cat-fev-1:1')
    .trim()
    .slice(0, SAVED_ORDER_CONSTRAINTS.ITEM_IDS_CSV_MAX_LENGTH);
  const safeItemCount = Math.min(
    100,
    Math.max(1, Math.round(Number(input.itemCount || 1)))
  );
  const safeTotalMrp = Math.max(0, Number(Number(input.totalMrp || 0).toFixed(2)));
  const safeTotalPaid = Math.max(0, Number(Number(input.totalPaid || 0).toFixed(2)));
  const safeTotalSaved = Math.max(0, Number(Number(input.totalSaved || 0).toFixed(2)));

  try {
    await setDoc(orderRef, {
      ownerId: safeUid,
      orderId: safeOrderId,
      platformId: safePlatformId,
      platformName: safePlatformName,
      itemsSummary: safeItemsSummary,
      itemIdsCsv: safeItemIdsCsv,
      itemCount: safeItemCount,
      totalMrp: safeTotalMrp,
      totalPaid: safeTotalPaid,
      totalSaved: safeTotalSaved,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, orderPath);
  }

  return {
    orderId: safeOrderId,
    platformId: safePlatformId,
    platformName: safePlatformName,
    itemsSummary: safeItemsSummary,
    itemIdsCsv: safeItemIdsCsv,
    itemCount: safeItemCount,
    totalMrp: safeTotalMrp,
    totalPaid: safeTotalPaid,
    totalSaved: safeTotalSaved,
    createdAt: new Date().toISOString(),
  };
}

export async function listSavedOrdersFromFirestore(
  uid: string
): Promise<SavedOrderSummaryRecord[]> {
  const safeUid = uid.slice(0, USER_PROFILE_CONSTRAINTS.UID_MAX_LENGTH);
  const colPath = `users/${safeUid}/orders`;
  const colRef = collection(db, 'users', safeUid, 'orders');
  const q = query(colRef, where('ownerId', '==', safeUid), limit(25));

  try {
    const snap = await getDocs(q);
    const records: SavedOrderSummaryRecord[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const pid = String(d.platformId || '1mg');
      records.push({
        orderId: String(d.orderId || docSnap.id),
        platformId:
          pid === 'pharmeasy' || pid === 'netmeds' || pid === 'apollo'
            ? pid
            : '1mg',
        platformName: String(d.platformName || 'Tata 1mg'),
        itemsSummary: String(d.itemsSummary || ''),
        itemIdsCsv: String(d.itemIdsCsv || ''),
        itemCount: Number(d.itemCount || 1),
        totalMrp: Number(d.totalMrp || 0),
        totalPaid: Number(d.totalPaid || 0),
        totalSaved: Number(d.totalSaved || 0),
        createdAt:
          d.createdAt && typeof d.createdAt.toDate === 'function'
            ? d.createdAt.toDate().toISOString()
            : new Date().toISOString(),
      });
    });
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function deleteSavedOrderFromFirestore(
  uid: string,
  orderId: string
): Promise<void> {
  const safeUid = uid.slice(0, USER_PROFILE_CONSTRAINTS.UID_MAX_LENGTH);
  const safeId = orderId
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, SAVED_ORDER_CONSTRAINTS.ORDER_ID_MAX_LENGTH);
  const docPath = `users/${safeUid}/orders/${safeId}`;
  const docRef = doc(db, 'users', safeUid, 'orders', safeId);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function signOutFromFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch {
    // Ignore if not signed into Firebase
  }
}
