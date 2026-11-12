export type SupportedLanguage = 'en' | 'bn' | 'hi';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export type RiskSeverity = 'HIGH_RISK' | 'CAUTION' | 'SAFE';

export interface TrilingualText {
  en: string;
  bn: string;
  hi: string;
}

export interface PharmacyQuote {
  platformId: '1mg' | 'pharmeasy' | 'netmeds' | 'apollo';
  platformName: 'Tata 1mg' | 'PharmEasy' | 'Netmeds' | 'Apollo 24|7';
  mrp: number;
  discountedPrice: number;
  discountPercent: number;
  packSize: string;
  stockStatus: 'In Stock' | 'Express 2hr' | 'Limited Stock';
  isLowestPrice: boolean;
  deepLink: string;
  isLiveGrounded?: boolean;
  lastLiveSync?: string | null;
}

export interface ExtractedMedicine {
  id: string;
  name: string;
  genericComposition: string;
  dosage: string;
  frequency: string;
  timing: TimeSlot[];
  mealRelation: string;
  duration: string;
  purpose: string;
  instructions: TrilingualText;
  janAushadhiGenericPrice: number;
  pharmacyQuotes: PharmacyQuote[];
}

export interface JargonTranslation {
  term: string;
  meaning: string;
  patientAction: string;
}

export interface DrugInteractionAlert {
  id: string;
  severity: RiskSeverity;
  involvedDrugs: string[];
  activeIngredients: string[];
  title: string;
  mechanism: string;
  clinicalRecommendation: string;
  fdaSourceNote?: string;
  translatedAdvisory: TrilingualText;
}

export interface PrescriptionVerificationResult {
  verificationId: string;
  processedAt: string;
  doctorName: string;
  doctorQualification: string;
  clinicName: string;
  registrationNumber: string;
  patientName: string;
  patientAgeGender: string;
  prescriptionDate: string;
  diagnosisSummary: string;
  medicines: ExtractedMedicine[];
  jargonTranslations: JargonTranslation[];
  safetyAudit: {
    overallStatus: RiskSeverity;
    auditorSummary: string;
    openFdaCheckedCount: number;
    alerts: DrugInteractionAlert[];
  };
  regionalSummary: TrilingualText;
  priceSummary: {
    totalMrp: number;
    lowestSinglePharmacyName: string;
    lowestSinglePharmacyTotal: number;
    smartSplitCartTotal: number;
    maxSavingsAmount: number;
    janAushadhiTotal: number;
  };
}

export interface AutomationLogEntry {
  id: string;
  timestamp: string;
  patientName: string;
  patientPhone: string;
  language: SupportedLanguage;
  webhookUrl: string;
  webhookStatus: 'DELIVERED_200' | 'SIMULATED_LOCAL' | 'FAILED';
  smsPreview: string;
  medicineCount: number;
  optimalCartTotal: number;
}

export interface AuthUser {
  id: string;
  name: string;
  identifier: string; // email or phone number
  phone: string;
  age?: number;
  chronicDiseases?: string;
  knownAllergies?: string;
  activeMedicines?: string;
  preferredLanguage: SupportedLanguage;
  createdAt: string;
}

export interface SavedPrescriptionRecord {
  verificationId: string;
  patientName: string;
  doctorName: string;
  prescriptionDate: string;
  diagnosisSummary: string;
  medicinesSummary: string;
  overallSafetyStatus: RiskSeverity;
  medicineCount: number;
  smartSplitCartTotal: number;
  createdAt: string;
}

export type CareDoseStatus = 'TAKEN' | 'PENDING' | 'MISSED_OVERDUE';

export interface CareCircleDoseItem {
  id: string;
  medicineName: string;
  dosage: string;
  slot: TimeSlot;
  scheduledTime: string;
  mealRelation: string;
  instructions: TrilingualText;
  status: CareDoseStatus;
  takenAt?: string;
  overdueMinutes?: number;
}

export interface CareCircleMember {
  id: string;
  name: string;
  relation: string;
  age: number;
  location: string;
  phone: string;
  caregiverPhone: string;
  preferredLanguage: SupportedLanguage;
  conditionSummary: string;
  lastCheckInText: string;
  doses: CareCircleDoseItem[];
}

export interface CareCircleActivityEvent {
  id: string;
  timestamp: string;
  memberId: string;
  memberName: string;
  relation: string;
  type: 'DOSE_TAKEN' | 'MISSED_ALERT' | 'CHECK_IN_SENT' | 'PRESCRIPTION_ASSIGNED';
  message: string;
}

export type MedicineCategoryId =
  | 'all'
  | 'personal_hygiene'
  | 'antiseptic_skin'
  | 'diabetes'
  | 'cardiac'
  | 'acidity'
  | 'fever_pain'
  | 'vitamins'
  | 'thyroid'
  | 'antibiotics';

export interface StoreMedicineItem {
  id: string;
  name: string;
  imageUrl?: string;
  manufacturer: string;
  genericComposition: string;
  category: Exclude<MedicineCategoryId, 'all'>;
  categoryLabel: string;
  packSize: string;
  dosage: string;
  frequency: string;
  timing: TimeSlot[];
  mealRelation: string;
  purpose: string;
  prescriptionRequired: boolean;
  substituteBrand: string;
  substituteManufacturer: string;
  substitutePrice: number;
  mrp: number;
  janAushadhiGenericPrice: number;
  lowestPrice: number;
  lowestPlatformName: string;
  lowestDeepLink: string;
  maxSavingsPercent: number;
  instructions: TrilingualText;
  pharmacyQuotes: PharmacyQuote[];
}

export interface SavedOrderSummaryRecord {
  orderId: string;
  platformId: '1mg' | 'pharmeasy' | 'netmeds' | 'apollo';
  platformName: string;
  itemsSummary: string;
  itemIdsCsv: string;
  itemCount: number;
  totalMrp: number;
  totalPaid: number;
  totalSaved: number;
  createdAt: string;
}



