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
  LogOut,
  UserPlus,
  HeartHandshake,
  Menu,
  X,
  Settings,
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
import {
  SettingsView,
  AppSettingsPreferences,
  loadAppSettings,
} from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { VeriMedLogo } from './components/VeriMedLogo';
import { OfflineIndicator } from './components/PWAInstallButton';
import { AdBanner } from './components/AdBanner';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, syncFirebaseUserProfile } from './firebase';

type ActiveTab =
  | 'schedule'
  | 'safety'
  | 'prices'
  | 'care_circle'
  | 'automation'
  | 'settings';

const AUTH_TOKEN_KEY = 'mediverify_auth_token';

interface SidebarNavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}

const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    id: 'schedule',
    label: 'Medicine Schedule',
    icon: CalendarClock,
  },
  {
    id: 'safety',
    label: 'Safety Check',
    icon: ShieldAlert,
  },
  {
    id: 'prices',
    label: 'Compare Prices',
    icon: IndianRupee,
  },
  {
    id: 'care_circle',
    label: 'Family Care Circle',
    icon: HeartHandshake,
  },
  {
    id: 'automation',
    label: 'WhatsApp Bot',
    icon: Send,
    comingSoon: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(false);
  const [authScreenMode, setAuthScreenMode] = useState<'signin' | 'register'>('signin');
  const [authReasonMessage, setAuthReasonMessage] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [appSettings, setAppSettings] = useState<AppSettingsPreferences>(() =>
    loadAppSettings()
  );

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
    setAuthReasonMessage(null);
    setShowAuthScreen(false);
  };

  const requireSignInForUpload = () => {
    setAuthReasonMessage(
      'Please Sign In or Register a free account first to upload and analyze your prescription.'
    );
    setAuthScreenMode('signin');
    setShowAuthScreen(true);
  };

  const handleSignOut = async () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setShowAuthScreen(true);
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
    }).catch(() => {});
  };

  const handleLanguageSelect = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    if (previewDataUrl) {
      prewarmPrescriptionScan(previewDataUrl, uploadedMimeType, newLang);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!currentUser) {
      requireSignInForUpload();
      return;
    }
    setScanError(null);
    setScanSuccessBanner(null);
    setUploadedFileName(file.name);

    try {
      const { dataUrl, mimeType } = await normalizeUploadedPrescriptionFile(file);
      setPreviewDataUrl(dataUrl);
      setUploadedMimeType(mimeType);
      setScanSuccessBanner(
        'Photo loaded! Choose your language on the left and tap "Analyze Prescription".'
      );
      prewarmPrescriptionScan(dataUrl, mimeType, language);
    } catch (err: unknown) {
      setScanError(
        err instanceof Error
          ? err.message
          : 'Could not read that image format. Please upload a clear JPG, PNG, or WEBP photo.'
      );
    }
  };

  const executeGeminiScan = async (
    imageDataUrl: string,
    mimeType: string,
    selectedLang: SupportedLanguage = language
  ) => {
    if (!currentUser) {
      requireSignInForUpload();
      return;
    }
    if (!imageDataUrl) {
      setScanError('Please upload or take a photo of a prescription first.');
      return;
    }

    setIsScanning(true);
    setIsComparingPrices(false);
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

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'The prescription reader took too long or received a very large photo. Please try again.'
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to read prescription image');
      }

      setVerificationResult(data);
      setActiveTab('schedule');
      setScanSuccessBanner(
        `Read ${data.medicines?.length || 0} medicines from ${data.doctorName}'s prescription. Comparing live prices across 4 pharmacies...`
      );
      setIsScanning(false);

      if (
        appSettings.autoPlayAudioAfterScan &&
        'speechSynthesis' in window &&
        data.regionalSummary?.[selectedLang]
      ) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(data.regionalSummary[selectedLang]);
        u.lang =
          selectedLang === 'bn'
            ? 'bn-IN'
            : selectedLang === 'hi'
              ? 'hi-IN'
              : 'en-IN';
        u.rate = appSettings.voiceRate;
        window.speechSynthesis.speak(u);
      }

      setIsComparingPrices(true);
      fetch('/api/compare-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicines: data.medicines || [],
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((priceData) => {
          if (priceData && Array.isArray(priceData.medicines)) {
            setVerificationResult((prev) =>
              prev
                ? {
                    ...prev,
                    medicines: priceData.medicines,
                    priceSummary: priceData.priceSummary || prev.priceSummary,
                  }
                : prev
            );
            setScanSuccessBanner(
              `Read ${data.medicines?.length || 0} medicines from ${data.doctorName}'s prescription and compared live prices across all 4 pharmacies.`
            );
          }
        })
        .catch(() => {})
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

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 ${
        appSettings.seniorLargeText ? 'text-[106%]' : ''
      }`}
    >
      {/* Top Header Bar with 3-Line Menu Toggle */}
      <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between">
        {/* Left: 3-Line Hamburger Icon + Brand Logo */}
        <div className="flex items-center gap-3">
          {!showAuthScreen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Toggle navigation sidebar"
              title="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

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
        </div>

        {/* Right: User Account / Sign In & Register Actions */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-1">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-xs font-semibold text-slate-700 hover:text-teal-700 truncate max-w-[160px] cursor-pointer"
              >
                {currentUser.name}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-600 inline-flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
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

      {/* Main Body with Collapsible Left Sidebar + Workspace */}
      <div className="flex-1 flex relative">
        {/* Mobile Backdrop when Sidebar is open on small screens */}
        {!showAuthScreen && isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Clean Application Sidebar */}
        {!showAuthScreen && (
          <aside
            aria-label="Primary Sidebar Navigation"
            className={`fixed lg:sticky top-14 left-0 z-30 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 flex flex-col transition-all duration-200 ease-in-out overflow-hidden shrink-0 ${
              isSidebarOpen
                ? 'w-64 translate-x-0'
                : 'w-0 -translate-x-full lg:translate-x-0 border-r-0'
            }`}
          >
            <div className="w-64 h-full flex flex-col justify-between">
              {/* Navigation Links */}
              <div className="p-3 space-y-1">
                <div className="px-3 py-2 flex items-center justify-between lg:hidden">
                  <span className="text-xs font-bold text-slate-500">Menu</span>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
                    aria-label="Close sidebar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {SIDEBAR_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isLoadingPrice = item.id === 'prices' && isComparingPrices;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          if (window.innerWidth < 1024) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        className={`w-full min-h-[42px] px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-3 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-teal-700' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>

                        {item.comingSoon ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                            Soon
                          </span>
                        ) : (
                          isLoadingPrice && (
                            <Loader2 className="w-3.5 h-3.5 text-teal-700 animate-spin shrink-0" />
                          )
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sidebar Footer: Language Selector */}
              <div className="p-3 border-t border-slate-200 bg-slate-50/60 space-y-2">
                <div className="px-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Languages className="w-3.5 h-3.5 text-teal-700" />
                  <span>Language</span>
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-white border border-slate-200 rounded-xl">
                  {(
                    [
                      { id: 'en', label: 'English' },
                      { id: 'bn', label: 'বাংলা' },
                      { id: 'hi', label: 'हिन्दी' },
                    ] as const
                  ).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleLanguageSelect(l.id)}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        language === l.id
                          ? 'bg-teal-700 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Workspace Content Area */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <main className="w-full max-w-[1280px] mx-auto px-4 lg:px-8 pt-6 pb-12">
            {authChecking ? (
              <div className="py-20 text-center text-sm text-slate-500">
                Loading your VeriMed account...
              </div>
            ) : showAuthScreen ? (
              <AuthView
                key={authScreenMode}
                initialMode={authScreenMode}
                reasonMessage={authReasonMessage}
                onAuthSuccess={handleAuthSuccess}
                onContinueAsGuest={() => {
                  setAuthReasonMessage(null);
                  setShowAuthScreen(false);
                }}
              />
            ) : activeTab === 'schedule' ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Left Column: Prescription Photo Uploader + Sponsored Health Offer */}
                <div className="xl:col-span-4 xl:sticky xl:top-20 space-y-4">
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
                    isAuthenticated={Boolean(currentUser)}
                    onRequireSignIn={requireSignInForUpload}
                  />
                  <AdBanner variant="sidebar" prescription={verificationResult} />
                </div>

                {/* Right Column: Live Medicine Schedule or Clean Upload Prompt */}
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
                    <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
                      <p className="text-xs font-semibold text-teal-700">
                        {currentUser
                          ? `Welcome, ${currentUser.name}`
                          : 'Simple Prescription Reader & Medicine Helper'}
                      </p>
                      <h1 className="text-2xl font-bold text-slate-900">
                        Upload a Prescription Photo to Begin
                      </h1>
                      <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                        Upload or take a photo of your doctor&apos;s prescription on the left to view your daily medicine schedule in English, বাংলা, or हिन्दी.
                      </p>
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
              /* Full-Width Layout for Safety Check, Compare Prices, Care Circle, WhatsApp Bot, and Settings */
              <div className="w-full max-w-5xl mx-auto space-y-4">
                {activeTab === 'settings' ? (
                  <SettingsView
                    currentUser={currentUser}
                    language={language}
                    onLanguageChange={handleLanguageSelect}
                    onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
                    onSignOut={handleSignOut}
                    verificationResult={verificationResult}
                    settings={appSettings}
                    onUpdateSettings={setAppSettings}
                  />
                ) : activeTab === 'care_circle' ? (
                  <CareCircleView
                    verificationResult={verificationResult}
                    language={language}
                    onLanguageChange={setLanguage}
                  />
                ) : activeTab === 'automation' ? (
                  <AutomationAndSchemaView
                    result={verificationResult}
                    language={language}
                    onLanguageChange={setLanguage}
                    defaultPhone={currentUser?.phone}
                    onPrescriptionExtractedFromBot={(newRx) => setVerificationResult(newRx)}
                    isAuthenticated={Boolean(currentUser)}
                    onRequireSignIn={requireSignInForUpload}
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
                        <strong className="text-slate-900">Medicine Schedule</strong> page to view safety checks and pharmacy prices.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab('schedule')}
                        className="min-h-[42px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Go to Medicine Schedule</span>
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
                  </>
                )}

                {activeTab !== 'settings' && (
                  <AdBanner variant="horizontal" prescription={verificationResult} />
                )}
              </div>
            )}
          </main>

          {/* Quiet Clinical Footer */}
          <footer className="border-t border-slate-200 bg-white py-6 px-4 lg:px-8">
            <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <VeriMedLogo variant="horizontal" size="sm" />
                <span>· Prescription Reader, Safety Checker &amp; Family Care Circle</span>
              </div>
              <p>
                Always consult your doctor or pharmacist before changing how you take your medicines.
              </p>
            </div>
          </footer>
        </div>
      </div>

      {/* Offline Status Banner */}
      <OfflineIndicator />
    </div>
  );
}
