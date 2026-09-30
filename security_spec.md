# Medi-Verify AI — Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Global Catch-All**: Every path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **PII Split-Collection Isolation**: User PII (`email`, `phone`, `name`) is stored strictly inside `/users/{userId}/private/{docId}` where `docId == 'profile'`, and is only readable/writable by the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`).
3. **Strict Schema & Key Validation**: Every `create` and `update` on `UserProfile` and `SavedPrescription` is validated via standalone helper functions (`isValidUserProfile`, `isValidSavedPrescription`) enforcing `hasAll`, `hasOnly`, string length bounds, enum allowlists, and `request.time` server timestamps.
4. **Relational Parent Sync (Master Gate)**: Creating or reading `/users/{userId}/prescriptions/{prescriptionId}` requires `request.auth.uid == userId` and `exists(/databases/$(database)/documents/users/$(userId)/private/profile)`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: `auth = null` attempting `create` on `/users/u1/private/profile`.
2. **Unverified Email Write**: `auth.token.email_verified = false` attempting `create` on `/users/u1/private/profile`.
3. **Cross-User PII Read**: `auth.uid = 'u2'` attempting `get` on `/users/u1/private/profile`.
4. **Identity Spoofing on Create**: `auth.uid = 'u1'` writing `uid: 'u2'` in `/users/u1/private/profile`.
5. **Shadow / Ghost Field Injection**: Adding `isAdmin: true` to `/users/u1/private/profile`.
6. **Oversized String DoS**: Writing a 5,000-character string into `name` (exceeding `maxLength: 120`).
7. **Invalid Language Enum**: Setting `preferredLanguage: 'fr'` instead of `['en', 'bn', 'hi']`.
8. **Client Timestamp Forgery**: Providing a past or future timestamp instead of `request.time` for `createdAt`.
9. **Immortal Field Mutation**: Modifying `createdAt` or `uid` during an `update` on `/users/u1/private/profile`.
10. **Orphaned Subcollection Write**: Creating `/users/u1/prescriptions/rx1` when `/users/u1/private/profile` does not exist.
11. **Path ID Poisoning**: Creating `/users/u1/prescriptions/invalid$id!` with disallowed characters.
12. **Unauthorized Update of Immutable Prescription**: Attempting to `update` an already saved prescription in `/users/u1/prescriptions/{prescriptionId}`.
