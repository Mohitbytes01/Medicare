import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';
import { AuthUser, SupportedLanguage } from '../types/prescription';
import { signInWithGoogle } from '../firebase';
import { VeriMedLogo } from './VeriMedLogo';

interface AuthViewProps {
  initialMode?: 'signin' | 'register';
  onAuthSuccess: (user: AuthUser, token: string) => void;
  onContinueAsGuest?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'signin',
  onAuthSuccess,
  onContinueAsGuest,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>('en');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const switchMode = (nextMode: 'signin' | 'register') => {
    setMode(nextMode);
    setErrorMsg(null);
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsGoogleLoading(true);
    try {
      const fbAuthUser = await signInWithGoogle(preferredLanguage);
      onAuthSuccess(fbAuthUser, 'firebase_session');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Google Sign-In could not be completed. You can also sign in or register with your email/phone below.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'signin'
          ? { identifier, password }
          : {
              name,
              identifier,
              phone: phone.trim() || (!identifier.includes('@') ? identifier.trim() : ''),
              password,
              preferredLanguage,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not complete request. Please try again.');
      }

      onAuthSuccess(data.user, data.token);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-4">
      {/* Left Column: Simple Welcome & App Benefits */}
      <div className="lg:col-span-6 space-y-6 pt-2">
        <div>
          <div className="mb-3">
            <VeriMedLogo variant="horizontal" size="lg" />
          </div>
          <p className="text-xs font-semibold text-teal-700">
            VeriMed · Patient &amp; Family Portal
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Read Doctor Prescriptions &amp; Find Lowest Medicine Prices
          </h1>
          <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
            Sign in or create a free account to save your medicine schedules, get instructions in{' '}
            <strong className="text-slate-900">English, বাংলা (Bengali), and हिन्दी (Hindi)</strong>, check medicine safety, and send WhatsApp/SMS reminders.
          </p>
        </div>

        <div className="border-t border-slate-200 divide-y divide-slate-200">
          {[
            {
              title: 'Clear Daily Medicine Timings',
              desc: 'Turns doctor handwriting into a simple Morning, Afternoon, Evening, and Night schedule.',
            },
            {
              title: 'Speak Aloud in বাংলা, हिन्दी & English',
              desc: 'Listens and speaks how to take each tablet clearly for elderly family members.',
            },
            {
              title: 'Medicine Safety & Clash Warnings',
              desc: 'Alerts you immediately if two medicines clash or need a time gap.',
            },
            {
              title: 'Compare Prices Across 4 Online Pharmacies',
              desc: 'Finds the lowest price on Tata 1mg, PharmEasy, Netmeds, and Apollo 24|7.',
            },
          ].map((item, idx) => (
            <div key={idx} className="py-3.5 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Clean Sign In / Register Card */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`min-h-[42px] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4 text-teal-700" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`min-h-[42px] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4 text-teal-700" />
            <span>Register (New Account)</span>
          </button>
        </div>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            {mode === 'signin' ? 'Welcome Back — Sign In' : 'Create Your Free Account'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {mode === 'signin'
              ? 'Enter your email address or phone number and password to continue.'
              : 'Fill in your details below to register as a patient or family caregiver.'}
          </p>
        </div>

        {/* 1-Click Firebase Google Login */}
        <div className="mb-5">
          <button
            type="button"
            disabled={isGoogleLoading || isLoading}
            onClick={handleGoogleSignIn}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.98-2.19-6.96-5.14H1.05v3.14C3.06 21.17 7.21 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.04 14.03c-.25-.74-.39-1.54-.39-2.36s.14-1.62.39-2.36V6.17H1.05A11.98 11.98 0 0 0 0 11.67c0 1.93.46 3.75 1.05 5.5l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.5-3.5C18.07 1.19 15.3 0 12 0 7.21 0 3.06 2.83 1.05 6.83l3.99 3.14c.98-2.95 3.72-5.22 6.96-5.22z"
                />
              </svg>
            )}
            <span>
              {isGoogleLoading ? 'Connecting with Google...' : 'Continue with Google'}
            </span>
          </button>

          <div className="relative my-5 flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-medium text-slate-400 whitespace-nowrap">
              or use Email / Phone
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Your Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Subir Chatterjee"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address or Phone Number
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g., name@gmail.com or +91 98301 44820"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
            />
          </div>

          {mode === 'register' && identifier.includes('@') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                WhatsApp / Mobile Number (for medicine reminders)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +91 98301 44820"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {mode === 'signin' ? 'Password' : 'Create Password (at least 6 characters)'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={mode === 'register' ? 6 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full min-h-[44px] pl-3.5 pr-11 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Preferred Language for Medicine Instructions
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl min-h-[44px]">
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
                    onClick={() => setPreferredLanguage(l.id)}
                    className={`rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      preferredLanguage === l.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-800">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signin' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {isLoading
                ? mode === 'signin'
                  ? 'Signing In...'
                  : 'Creating Account...'
                : mode === 'signin'
                  ? 'Sign In to VeriMed'
                  : 'Register & Open App'}
            </span>
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <button
            type="button"
            onClick={() => switchMode(mode === 'signin' ? 'register' : 'signin')}
            className="font-semibold text-teal-700 hover:text-teal-900 underline cursor-pointer"
          >
            {mode === 'signin'
              ? 'New user? Tap here to Register an account'
              : 'Already have an account? Tap here to Sign In'}
          </button>

          {onContinueAsGuest && (
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
            >
              Skip for now &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
