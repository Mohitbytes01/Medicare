import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Download,
  IndianRupee,
  Languages,
  Loader2,
  LogOut,
  MessageSquare,
  RotateCcw,
  Save,
  User,
  Volume2,
} from 'lucide-react';
import {
  AuthUser,
  PrescriptionVerificationResult,
  SupportedLanguage,
} from '../types/prescription';
import { auth, updateFirebaseUserProfile } from '../firebase';

export interface AppSettingsPreferences {
  voiceRate: number;
  autoPlayAudioAfterScan: boolean;
  seniorLargeText: boolean;
  morningDoseTime: string;
  afternoonDoseTime: string;
  eveningDoseTime: string;
  nightDoseTime: string;
  missedDoseThresholdMinutes: number;
  enableCaregiverWhatsAppAlerts: boolean;
  preferredPharmacy: 'smart_split' | '1mg' | 'pharmeasy' | 'netmeds' | 'apollo';
  highlightJanAushadhi: boolean;
  deliveryPincode: string;
}

export const DEFAULT_APP_SETTINGS: AppSettingsPreferences = {
  voiceRate: 0.9,
  autoPlayAudioAfterScan: false,
  seniorLargeText: false,
  morningDoseTime: '08:00',
  afternoonDoseTime: '13:30',
  eveningDoseTime: '18:00',
  nightDoseTime: '21:30',
  missedDoseThresholdMinutes: 60,
  enableCaregiverWhatsAppAlerts: true,
  preferredPharmacy: 'smart_split',
  highlightJanAushadhi: true,
  deliveryPincode: '700001',
};

export const APP_SETTINGS_STORAGE_KEY = 'verimed_app_settings_v1';

export function loadAppSettings(): AppSettingsPreferences {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

interface SettingsViewProps {
  currentUser: AuthUser | null;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onUserUpdated: (updated: AuthUser) => void;
  onSignOut: () => void;
  verificationResult: PrescriptionVerificationResult | null;
  settings: AppSettingsPreferences;
  onUpdateSettings: (newSettings: AppSettingsPreferences) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  language,
  onLanguageChange,
  onUserUpdated,
  onSignOut,
  verificationResult,
  settings,
  onUpdateSettings,
}) => {
  const [name, setName] = useState(currentUser?.name || 'Guest Patient');
  const [phone, setPhone] = useState(currentUser?.phone || '+91 ');
  const [email] = useState(currentUser?.identifier || 'Not signed in (Guest session)');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhone(currentUser.phone || '+91 ');
    }
  }, [currentUser]);

  const handleFieldChange = <K extends keyof AppSettingsPreferences>(
    key: K,
    value: AppSettingsPreferences[K]
  ) => {
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveBanner(null);

    try {
      localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));

      if (auth.currentUser && currentUser) {
        await updateFirebaseUserProfile(auth.currentUser.uid, {
          name,
          phone,
          preferredLanguage: language,
        });
        onUserUpdated({
          ...currentUser,
          name: name.trim() || currentUser.name,
          phone: phone.trim(),
          preferredLanguage: language,
        });
      } else {
        const token = localStorage.getItem('mediverify_auth_token');
        if (token && token !== 'firebase_session') {
          const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name,
              phone,
              preferredLanguage: language,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) onUserUpdated(data.user);
          }
        } else if (currentUser) {
          onUserUpdated({
            ...currentUser,
            name: name.trim(),
            phone: phone.trim(),
            preferredLanguage: language,
          });
        }
      }

      setSaveBanner('All profile details and app settings have been saved.');
    } catch {
      setSaveBanner('Settings saved locally on this device.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsTestingVoice(true);

    const sampleScripts: Record<SupportedLanguage, string> = {
      en: 'Hello from VeriMed. Your daily medicine schedule and safety checks are active.',
      bn: 'নমস্কার, ভেরিমেড থেকে আপনার প্রতিদিনের ওষুধ খাওয়ার নিয়ম ও সময়সূচী চালু রয়েছে।',
      hi: 'नमस्ते, वेरीमेड में आपकी दैनिक दवा की समय-सारणी और सुरक्षा जांच सक्रिय है।',
    };

    const utterance = new SpeechSynthesisUtterance(sampleScripts[language]);
    utterance.lang =
      language === 'bn' ? 'bn-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = settings.voiceRate;
    utterance.onend = () => setIsTestingVoice(false);
    utterance.onerror = () => setIsTestingVoice(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        name,
        phone,
        email,
        preferredLanguage: language,
      },
      preferences: settings,
      activePrescription: verificationResult,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'verimed-settings-and-records.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDefaults = () => {
    onUpdateSettings(DEFAULT_APP_SETTINGS);
    localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify(DEFAULT_APP_SETTINGS)
    );
    setSaveBanner('Preferences reset to default values.');
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      {/* Page Header */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Settings &amp; Preferences</h1>
          <p className="mt-1 text-xs text-slate-600">
            Manage your profile, regional voice settings, dose reminder timings, pharmacy preferences, and WhatsApp Bot integration.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSavingProfile}
          className="min-h-[42px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          {isSavingProfile ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSavingProfile ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </section>

      {saveBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs font-semibold text-emerald-900">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{saveBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setSaveBanner(null)}
            className="text-emerald-800 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Patient / Caregiver Profile & Contact Details */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
          <User className="w-4 h-4 text-teal-700" />
          <h2 className="text-base font-bold text-slate-900">
            1. Profile &amp; Primary WhatsApp Contact
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Name (Patient or Caregiver)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary WhatsApp / Mobile Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Email / Identifier
            </label>
            <input
              type="text"
              value={email}
              disabled
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 font-mono"
            />
          </div>
        </div>
      </section>

      {/* 2. Language, Spoken Audio & Senior Accessibility */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Languages className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">
              2. Language, Voice Speed &amp; Senior Reading Accessibility
            </h2>
          </div>

          <button
            type="button"
            onClick={handleTestVoice}
            className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-teal-700" />
            <span>{isTestingVoice ? 'Speaking...' : 'Test Voice Output'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default Prescription &amp; Audio Language
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl min-h-[42px]">
              {(
                [
                  { id: 'en', label: 'English' },
                  { id: 'bn', label: 'বাংলা (Bengali)' },
                  { id: 'hi', label: 'हिन्दी (Hindi)' },
                ] as const
              ).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onLanguageChange(l.id)}
                  className={`rounded-lg text-xs font-bold transition-colors cursor-pointer ${
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Voice Note Speech Speed
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl min-h-[42px]">
              {(
                [
                  { rate: 0.82, label: 'Slow (Seniors)' },
                  { rate: 0.92, label: 'Normal' },
                  { rate: 1.08, label: 'Fast' },
                ] as const
              ).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleFieldChange('voiceRate', item.rate)}
                  className={`rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    Math.abs(settings.voiceRate - item.rate) < 0.05
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Senior Large-Text Mode
              </div>
              <div className="text-[11px] text-slate-500">
                Increases font size across schedules and instructions for easier reading
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.seniorLargeText}
              onChange={(e) => handleFieldChange('seniorLargeText', e.target.checked)}
              className="w-4 h-4 accent-teal-700 cursor-pointer"
            />
          </label>

          <label className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Auto-Play Spoken Summary After Scanning
              </div>
              <div className="text-[11px] text-slate-500">
                Automatically read the prescription instructions aloud once analyzed
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPlayAudioAfterScan}
              onChange={(e) =>
                handleFieldChange('autoPlayAudioAfterScan', e.target.checked)
              }
              className="w-4 h-4 accent-teal-700 cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* 3. Daily Dose Schedule Times & Care Circle Missed-Dose Alerts */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
          <Bell className="w-4 h-4 text-teal-700" />
          <h2 className="text-base font-bold text-slate-900">
            3. Daily Dose Timings &amp; Family Care Circle Alerts
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Morning Dose Time
            </label>
            <input
              type="time"
              value={settings.morningDoseTime}
              onChange={(e) => handleFieldChange('morningDoseTime', e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Afternoon Dose Time
            </label>
            <input
              type="time"
              value={settings.afternoonDoseTime}
              onChange={(e) => handleFieldChange('afternoonDoseTime', e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Evening Dose Time
            </label>
            <input
              type="time"
              value={settings.eveningDoseTime}
              onChange={(e) => handleFieldChange('eveningDoseTime', e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Night Dose Time
            </label>
            <input
              type="time"
              value={settings.nightDoseTime}
              onChange={(e) => handleFieldChange('nightDoseTime', e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Missed-Dose Caregiver Alert Threshold
            </label>
            <select
              value={settings.missedDoseThresholdMinutes}
              onChange={(e) =>
                handleFieldChange(
                  'missedDoseThresholdMinutes',
                  Number(e.target.value)
                )
              }
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900"
            >
              <option value={30}>Alert caregiver if dose is missed by &gt; 30 Minutes</option>
              <option value={60}>Alert caregiver if dose is missed by &gt; 1 Hour (Recommended)</option>
              <option value={120}>Alert caregiver if dose is missed by &gt; 2 Hours</option>
            </select>
          </div>

          <label className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 self-end">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Caregiver WhatsApp Overdue Notifications
              </div>
              <div className="text-[11px] text-slate-500">
                Prepare 1-tap WhatsApp alert when a parent misses a scheduled dose
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableCaregiverWhatsAppAlerts}
              onChange={(e) =>
                handleFieldChange('enableCaregiverWhatsAppAlerts', e.target.checked)
              }
              className="w-4 h-4 accent-teal-700 cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* 4. Pharmacy & Price Comparison Preferences */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
          <IndianRupee className="w-4 h-4 text-teal-700" />
          <h2 className="text-base font-bold text-slate-900">
            4. Pharmacy Checkout &amp; Generic Price Preferences
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default Preferred Online Pharmacy
            </label>
            <select
              value={settings.preferredPharmacy}
              onChange={(e) =>
                handleFieldChange(
                  'preferredPharmacy',
                  e.target.value as AppSettingsPreferences['preferredPharmacy']
                )
              }
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900"
            >
              <option value="smart_split">Lowest Full Bill Automatically</option>
              <option value="1mg">Tata 1mg</option>
              <option value="pharmeasy">PharmEasy</option>
              <option value="netmeds">Netmeds</option>
              <option value="apollo">Apollo 24|7</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Delivery Pincode
            </label>
            <input
              type="text"
              value={settings.deliveryPincode}
              onChange={(e) => handleFieldChange('deliveryPincode', e.target.value)}
              placeholder="e.g. 700001"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900"
            />
          </div>

          <label className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 self-end">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Show Jan Aushadhi Generic Rates
              </div>
              <div className="text-[11px] text-slate-500">
                Display Govt. PMBJP generic benchmark prices
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.highlightJanAushadhi}
              onChange={(e) =>
                handleFieldChange('highlightJanAushadhi', e.target.checked)
              }
              className="w-4 h-4 accent-teal-700 cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* 5. WhatsApp Business Bot (Coming Soon) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              5. Official WhatsApp Business Bot
            </h2>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Coming Soon</span>
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Automated prescription photo scanning and spoken Bengali/Hindi voice-note replies directly inside WhatsApp are launching soon. Your primary WhatsApp number (<span className="font-mono font-bold text-slate-800">{phone.trim() || 'Not set'}</span>) will be notified when early access opens.
        </p>
      </section>

      {/* 6. Data Export, Reset & Account Actions */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportData}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-teal-700" />
            <span>Export Settings &amp; Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
        </div>

        {currentUser && (
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of VeriMed</span>
          </button>
        )}
      </section>
    </form>
  );
};
