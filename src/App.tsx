/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  IndianRupee,
  Loader2,
  Send,
  ShieldAlert,
  Languages,
  Upload,
  LogIn,
  UserPlus,
  HeartHandshake,
} from 'lucide-react';
import {
  AuthUser,
  PrescriptionVerificationResult,
  SupportedLanguage,
} from './types/prescription';
import { normalizeUploadedPrescriptionFile } from './utils/imageNormalizer';
import { PrescriptionScannerPanel } from './components/PrescriptionScannerPanel';
import { DosageScheduleView } from './components/DosageScheduleView';
import { SafetyAuditorView } from './components/SafetyAuditorView';
import { PharmacyAggregatorView } from './components/PharmacyAggregatorView';
import { AutomationAndSchemaView } from './components/AutomationAndSchemaView';
import { CareCircleView } from './components/CareCircleView';
import { AuthView } from './components/AuthView';
import { VeriMedLogo } from './components/VeriMedLogo';
import { OfflineIndicator } from './components/PWAInstallButton';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, syncFirebaseUserProfile } from './firebase';

type ActiveTab = 'schedule' | 'safety' | 'prices' | 'care_circle' | 'automation';

const AUTH_TOKEN_KEY = 'mediverify_auth_token';

const APP_FEATURES = [
  {
    number: '01',
    title: 'Reads Handwritten Doctor Prescriptions',
    description:
      'Turns hard-to-read doctor handwriting and medical short words (like PC, AC, BD, SOS) into a clear Morning, Afternoon, Evening, and Night medicine schedule.',
  },
  {
    number: '02',
    title: 'Instructions in English, বাংলা (Bengali) & हिन्दी (Hindi)',
    description:
      'Translates how and when to take every tablet into simple regional languages, with a Listen button that speaks the instructions aloud for elderly patients.',
  },
  {
    number: '03',
    title: 'Medicine Safety & Clash Check',
    description:
      'Checks all prescribed medicines against FDA safety guidelines to warn you if two medicines clash or need a time gap, and lets you check any extra home medicines.',
  },
  {
    number: '04',
    title: 'Lowest Price Comparison Across 4 Online Pharmacies',
    description:
      'Compares medicine prices side-by-side across Tata 1mg, PharmEasy, Netmeds, and Apollo 24|7 alongside Govt. Jan Aushadhi generic rates with 1-click buy links.',
  },
  {
    number: '05',
    title: 'Family Care Circle & Missed-Dose Alerts (>1 Hour)',
    description:
      'Add elderly parents or dependents to your Care Circle. Get daily status updates when they mark a dose as taken, and receive an alert if a dose is missed by over 1 hour.',
  },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(true);
  const [authScreenMode, setAuthScreenMode] = useState<'signin' | 'register'>('signin');

  const [verificationResult, setVerificationResult] =
    useState<PrescriptionVerificationResult | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [uploadedMimeType, setUploadedMimeType] = useState<string>('image/jpeg');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('schedule');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isComparingPrices, setIsComparingPrices] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccessBanner, setScanSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const synced = await syncFirebaseUserProfile(fbUser);
          setCurrentUser(synced);
          setLanguage(synced.preferredLanguage || 'en');
          setShowAuthScreen(false);
          setAuthChecking(false);
          return;
        } catch {
          // Fallback to local session check if Firestore profile read fails
        }
      }

      const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!savedToken || savedToken === 'firebase_session') {
        setAuthChecking(false);
        return;
      }

      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Session expired');
          return res.json();
        })
        .then((data) => {
          if (data.user) {
            setCurrentUser(data.user);
            setLanguage(data.user.preferredLanguage || 'en');
            setShowAuthScreen(false);
          }
        })
        .catch(() => {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        })
        .finally(() => {
          setAuthChecking(false);
        });
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (user: AuthUser, token: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setCurrentUser(user);
    if (user.preferredLanguage) {
      setLanguage(user.preferredLanguage);
    }
    setShowAuthScreen(false);
  };

  const prewarmPrescriptionScan = (
    imageDataUrl: string,
    mimeType: string,
    selectedLang: SupportedLanguage
  ) => {
    if (!imageDataUrl) return;
    fetch('/api/verify-prescription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: imageDataUrl,
        mimeType,
        language: selectedLang,
      }),
    }).catch(() => {
      // Silent background pre-warm; errors handled if user clicks Analyze
    });
  };

  const handleLanguageSelect = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    if (previewDataUrl) {
      prewarmPrescriptionScan(previewDataUrl, uploadedMimeType, newLang);
    }
  };

  const handleUploadFile = async (file: File) => {
    setScanError(null);
    setScanSuccessBanner(null);
    setUploadedFileName(file.name);

    try {
      const { dataUrl, mimeType } = await normalizeUploadedPrescriptionFile(file);
      setPreviewDataUrl(dataUrl);
      setUploadedMimeType(mimeType);
      setScanSuccessBanner(
        'Photo loaded! Choose your language from the dropdown on the left and tap "Analyze Prescription".'
      );
      // Silently pre-warm the OCR + analysis for the currently selected language
      // so clicking "Analyze Prescription" returns almost instantaneously
      prewarmPrescriptionScan(dataUrl, mimeType, language);
    } catch (err: unknown) {
      setScanError(
        err instanceof Error ? err.message : 'Could not read the selected image file.'
      );
    }
  };

  const executeGeminiScan = async (
    imageDataUrl: string,
    mimeType: string,
    selectedLang: SupportedLanguage = language
  ) => {
    if (!imageDataUrl) return;
    setIsScanning(true);
    setScanError(null);
    setScanSuccessBanner(null);

    try {
      const response = await fetch('/api/verify-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType,
          language: selectedLang,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Prescription analysis failed');
      }
      setVerificationResult(data);
      setActiveTab('schedule');
      setIsScanning(false);

      const count = Array.isArray(data.medicines) ? data.medicines.length : 0;
      setScanSuccessBanner(
        `Prescription read! Showing ${count} medicine(s) & schedule now — comparing pharmacy prices in the background...`
      );

      // Run pharmacy price comparison & monograph check asynchronously in the background
      setIsComparingPrices(true);
      fetch('/api/compare-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicines: data.medicines || [],
          alerts: data.safetyAudit?.alerts || [],
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((bgData) => {
          if (bgData && Array.isArray(bgData.medicines)) {
            setVerificationResult((prev) =>
              prev
                ? {
                    ...prev,
                    medicines: bgData.medicines,
                    priceSummary: bgData.priceSummary || prev.priceSummary,
                    safetyAudit: {
                      ...prev.safetyAudit,
                      alerts: Array.isArray(bgData.alerts)
                        ? bgData.alerts
                        : prev.safetyAudit.alerts,
                    },
                  }
                : prev
            );
            setScanSuccessBanner(
              `Prescription & lowest prices across 4 pharmacies ready for all ${count} medicine(s)!`
            );
          }
        })
        .catch(() => {
          // Initial quotes are already present on data.medicines
        })
        .finally(() => {
          setIsComparingPrices(false);
        });
    } catch (err: unknown) {
      setScanError(
        err instanceof Error
          ? err.message
          : 'Could not read the photo clearly. Please try uploading a clearer image.'
      );
      setIsScanning(false);
    }
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'schedule',
      label: 'Medicine Schedule',
      shortLabel: 'Medicines',
      icon: CalendarClock,
    },
    {
      id: 'safety',
      label: 'Safety Check',
      shortLabel: 'Safety',
      icon: ShieldAlert,
    },
    {
      id: 'prices',
      label: 'Compare Prices',
      shortLabel: 'Prices',
      icon: IndianRupee,
    },
    {
      id: 'care_circle',
      label: 'Family Care Circle',
      shortLabel: 'Care Circle',
      icon: HeartHandshake,
    },
    {
      id: 'automation',
      label: 'Send Reminders',
      shortLabel: 'Reminders',
      icon: Send,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 pb-20 md:pb-12">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between">
        {/* Zone 1: Brand Logo & Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            if (currentUser) {
              setShowAuthScreen(false);
            }
            setActiveTab('schedule');
          }}
          className="inline-flex items-center whitespace-nowrap"
          aria-label="VeriMed Health Home"
        >
          <VeriMedLogo variant="horizontal" size="md" />
        </a>

        {/* Zone 2: Clean Text Navigation Links (visible when in main workspace) */}
        {!showAuthScreen ? (
          <nav
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
            aria-label="Primary workspace navigation"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isPricesLoading = item.id === 'prices' && isComparingPrices;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                    isActive
                      ? 'border-teal-700 text-slate-900 font-semibold'
                      : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                  {isPricesLoading && (
                    <Loader2 className="w-3.5 h-3.5 text-teal-700 animate-spin" />
                  )}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden md:block" />
        )}

        {/* Zone 3: User Account / Sign In & Register Actions */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-1">
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">
                {currentUser.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthScreenMode('signin');
                  setShowAuthScreen(true);
                }}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  showAuthScreen && authScreenMode === 'signin'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-800'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthScreenMode('register');
                  setShowAuthScreen(true);
                }}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  showAuthScreen && authScreenMode === 'register'
                    ? 'bg-teal-700 text-white'
                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main 1440px Clinical Workspace */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 lg:px-8 pt-6">
        {authChecking ? (
          <div className="py-20 text-center text-sm text-slate-500">
            Loading your VeriMed account...
          </div>
        ) : showAuthScreen ? (
          <AuthView
            key={authScreenMode}
            initialMode={authScreenMode}
            onAuthSuccess={handleAuthSuccess}
            onContinueAsGuest={() => setShowAuthScreen(false)}
          />
        ) : activeTab === 'schedule' ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Left Column: Prescription Photo Uploader (Only on Medicine Schedule Page) */}
            <div className="xl:col-span-4 xl:sticky xl:top-20">
              <PrescriptionScannerPanel
                previewDataUrl={previewDataUrl}
                uploadedFileName={uploadedFileName}
                language={language}
                onLanguageChange={handleLanguageSelect}
                isScanning={isScanning}
                scanError={scanError}
                onUploadFile={handleUploadFile}
                onRunLiveGeminiScan={() =>
                  executeGeminiScan(previewDataUrl, uploadedMimeType, language)
                }
              />
            </div>

            {/* Right Column: Feature Overview or Live Medicine Schedule */}
            <div className="xl:col-span-8 min-w-0 space-y-4">
              {scanSuccessBanner && (
                <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3 text-xs font-semibold text-teal-900">
                  <span>{scanSuccessBanner}</span>
                  <button
                    type="button"
                    onClick={() => setScanSuccessBanner(null)}
                    className="text-teal-700 hover:text-teal-950 underline shrink-0 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {!verificationResult ? (
                <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <p className="text-xs font-semibold text-teal-700">
                        {currentUser
                          ? `Welcome, ${currentUser.name} · Simple Prescription Reader`
                          : 'Simple Prescription Reader & Medicine Helper'}
                      </p>
                      <h1 className="mt-1 text-2xl font-bold text-slate-900">
                        Understand Your Doctor&apos;s Prescription in Seconds
                      </h1>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
                        Upload or take a photo of any handwritten prescription on the left, or open your{' '}
                        <strong className="text-slate-900">Family Care Circle</strong> to check if your parents have taken their daily medicines today.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('care_circle')}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <HeartHandshake className="w-4 h-4" />
                      <span>Open Family Care Circle</span>
                    </button>
                  </div>

                  {/* Clean List of App Features (Hairline Dividers, Zero Nested Cards) */}
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-3">
                      What VeriMed Does For You:
                    </h2>
                    <div className="divide-y divide-slate-200 border-t border-slate-200">
                      {APP_FEATURES.map((feat) => (
                        <div
                          key={feat.number}
                          className="py-4 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-5"
                        >
                          <span className="font-mono text-xs font-bold text-teal-700 shrink-0">
                            {feat.number}.
                          </span>
                          <div className="space-y-1">
                            <h3 className="text-base font-bold text-slate-900">
                              {feat.title}
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {feat.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Simple Callout to Upload */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-teal-700" />
                      <span>
                        Tap <strong className="text-slate-900">Upload Photo</strong> or{' '}
                        <strong className="text-slate-900">Take Photo</strong> in the left box to begin.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Languages className="w-4 h-4 text-teal-700" />
                      <span>Supports English · বাংলা · हिन्दी</span>
                    </div>
                  </div>
                </section>
              ) : (
                <DosageScheduleView
                  result={verificationResult}
                  language={language}
                  onLanguageChange={setLanguage}
                  onNavigateTab={setActiveTab}
                  isComparingPrices={isComparingPrices}
                />
              )}
            </div>
          </div>
        ) : (
          /* Clean Full-Width Layout for Safety Check, Compare Prices, Care Circle, and Reminders */
          <div className="w-full max-w-5xl mx-auto space-y-4">
            {activeTab === 'care_circle' ? (
              <CareCircleView
                verificationResult={verificationResult}
                language={language}
                onLanguageChange={setLanguage}
              />
            ) : !verificationResult ? (
              <section className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Upload a Prescription Photo First
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Please upload and analyze your prescription on the{' '}
                    <strong className="text-slate-900">Medicine Schedule</strong> page to view safety checks, pharmacy prices, and WhatsApp reminders.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('schedule')}
                    className="min-h-[42px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Go to Medicine Schedule to Upload Photo</span>
                  </button>
                </div>
              </section>
            ) : (
              <>
                {activeTab === 'safety' && (
                  <SafetyAuditorView
                    result={verificationResult}
                    language={language}
                    onLanguageChange={setLanguage}
                    onUpdateResult={setVerificationResult}
                  />
                )}

                {activeTab === 'prices' && (
                  <PharmacyAggregatorView result={verificationResult} />
                )}

                {activeTab === 'automation' && (
                  <AutomationAndSchemaView
                    result={verificationResult}
                    language={language}
                    onLanguageChange={setLanguage}
                    defaultPhone={currentUser?.phone}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Quiet Clinical Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 px-4 lg:px-8">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <VeriMedLogo variant="horizontal" size="sm" />
            <span>· Prescription Reader, Safety Checker &amp; Family Care Circle</span>
          </div>
          <p>
            Always consult your doctor or pharmacist before changing how you take your medicines.
          </p>
        </div>
      </footer>

      {/* Mobile Thumb-Zone Bottom Navigation Bar (<768px) */}
      {!showAuthScreen && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center"
          aria-label="Mobile thumb navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
                  isActive ? 'text-teal-700 font-semibold' : 'text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <OfflineIndicator />
    </div>
  );
}
