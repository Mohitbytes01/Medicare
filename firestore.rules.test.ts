/**
 * Firestore Security Rules Specification Test Suite
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated profile create',
    operation: 'create',
    path: '/users/user_1/private/profile',
    auth: null,
    payload: { uid: 'user_1', name: 'Test', email: 'a@b.com', preferredLanguage: 'en' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email profile create',
    operation: 'create',
    path: '/users/user_1/private/profile',
    auth: { uid: 'user_1', email_verified: false },
    payload: { uid: 'user_1', name: 'Test', email: 'a@b.com', preferredLanguage: 'en' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-user PII profile read',
    operation: 'get',
    path: '/users/user_1/private/profile',
    auth: { uid: 'user_2', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Identity spoofing uid mismatch',
    operation: 'create',
    path: '/users/user_1/private/profile',
    auth: { uid: 'user_1', email_verified: true },
    payload: { uid: 'user_2', name: 'Test', email: 'a@b.com', preferredLanguage: 'en' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow field injection (isAdmin)',
    operation: 'create',
    path: '/users/user_1/private/profile',
    auth: { uid: 'user_1', email_verified: true },
    payload: { uid: 'user_1', name: 'Test', email: 'a@b.com', preferredLanguage: 'en', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Oversized name string (>120 chars)',
    operation: 'create',
    path: '/users/user_1/private/profile',
    auth: { uid: 'user_1', email_verified: true },
    payload: { uid: 'user_1', name: 'A'.repeat(200), email: 'a@b.com', preferredLanguage: 'en' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Invalid preferredLanguage enum value',
    operation: 'create',
    path: '/users/user_1/private/profile',
    auth: { uid: 'user_1', email_verified: true },
    payload: { uid: 'user_1', name: 'Test', email: 'a@b.com', preferredLanguage: 'fr' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Forged createdAt client timestamp',
    operation: 'create',
    path: '/users/user_1/private/profile',
    auth: { uid: 'user_1', email_verified: true },
    payload: { uid: 'user_1', name: 'Test', email: 'a@b.com', preferredLanguage: 'en', createdAt: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immortal field createdAt mutation on update',
    operation: 'update',
    path: '/users/user_1/private/profile',
    auth: { uid: 'user_1', email_verified: true },
    payload: { createdAt: '2099-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Orphaned prescription write without parent profile',
    operation: 'create',
    path: '/users/user_orphan/prescriptions/rx_1',
    auth: { uid: 'user_orphan', email_verified: true },
    payload: { ownerId: 'user_orphan', verificationId: 'MV-1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Path ID poisoning on prescriptionId',
    operation: 'create',
    path: '/users/user_1/prescriptions/bad$id!',
    auth: { uid: 'user_1', email_verified: true },
    payload: { ownerId: 'user_1', verificationId: 'MV-1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Immutable prescription update attempt',
    operation: 'update',
    path: '/users/user_1/prescriptions/rx_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { smartSplitCartTotal: 1 },
    expectedResult: 'PERMISSION_DENIED',
  },
];
