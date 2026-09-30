import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
  Volume2,
} from 'lucide-react';
import {
  PrescriptionVerificationResult,
  SupportedLanguage,
} from '../types/prescription';

interface SafetyAuditorViewProps {
  result: PrescriptionVerificationResult;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onUpdateResult: (updated: PrescriptionVerificationResult) => void;
}

const QUICK_CABINET_DRUGS = [
  'Brufen 400 (Painkiller)',
  'Omez 20 (Gas Capsule)',
  'Clopilet 75 (Blood Thinner)',
  'Calpol 650 (Fever Tablet)',
];

export const SafetyAuditorView: React.FC<SafetyAuditorViewProps> = ({
  result,
  language,
  onLanguageChange,
  onUpdateResult,
}) => {
  const [newMedicineInput, setNewMedicineInput] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [speakingAlertId, setSpeakingAlertId] = useState<string | null>(null);

  const handleAddMedicineAudit = async (medNameOverride?: string) => {
    const targetName = (medNameOverride || newMedicineInput).trim();
    if (!targetName || isAuditing) return;

    setIsAuditing(true);
    setAuditError(null);
    try {
      const res = await fetch('/api/audit-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentResult: result,
          newMedicineName: targetName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to check medicine safety');
      }
      onUpdateResult(data);
      setNewMedicineInput('');
    } catch (err: unknown) {
      setAuditError(
        err instanceof Error ? err.message : 'Could not check medicine right now.'
      );
    } finally {
      setIsAuditing(false);
    }
  };

  const speakAdvisory = async (alertId: string, text: string) => {
    if (speakingAlertId === alertId) {
      window.speechSynthesis?.cancel();
      setSpeakingAlertId(null);
      return;
    }
    setSpeakingAlertId(alertId);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioDataUrl) {
          const audio = new Audio(data.audioDataUrl);
          audio.onended = () => setSpeakingAlertId(null);
          audio.onerror = () => setSpeakingAlertId(null);
          await audio.play();
          return;
        }
      }
      throw new Error('Fallback speech');
    } catch {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = language === 'bn' ? 'bn-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
        u.onend = () => setSpeakingAlertId(null);
        u.onerror = () => setSpeakingAlertId(null);
        window.speechSynthesis.speak(u);
      } else {
        setSpeakingAlertId(null);
      }
    }
  };

  const status = result.safetyAudit.overallStatus;

  return (
    <div className="space-y-6">
      {/* Simple Safety Check Summary */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-start gap-3.5">
            {status === 'HIGH_RISK' ? (
              <ShieldAlert className="w-7 h-7 text-red-600 shrink-0 mt-0.5" />
            ) : status === 'CAUTION' ? (
              <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {status === 'HIGH_RISK'
                  ? 'Safety Warning: Some Medicines Should Not Be Taken Together'
                  : status === 'CAUTION'
                    ? 'Important: Keep a Time Gap Between These Medicines'
                    : 'All Safe: Your Medicines Can Be Taken Together Safely'}
              </h1>
              <p className="mt-1.5 text-sm text-slate-700 leading-relaxed max-w-3xl">
                {result.safetyAudit.auditorSummary}
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start"
            role="group"
            aria-label="Select language"
          >
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
                onClick={() => onLanguageChange(l.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  language === l.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Simple Safety Explanations */}
        <div className="divide-y divide-slate-200 mt-2">
          {result.safetyAudit.alerts.map((alert) => (
            <div key={alert.id} className="py-6 first:pt-4 last:pb-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span
                  className={`font-bold ${
                    alert.severity === 'HIGH_RISK'
                      ? 'text-red-700'
                      : alert.severity === 'CAUTION'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                  }`}
                >
                  {alert.severity === 'HIGH_RISK'
                    ? 'High Risk Warning'
                    : alert.severity === 'CAUTION'
                      ? 'Take With Care'
                      : 'Safe Combination'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-slate-900">
                  Medicines: {alert.involvedDrugs.join(' + ')}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900">
                {alert.title}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Why is this important?
                  </p>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                    {alert.mechanism}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    What should you do?
                  </p>
                  <p className="mt-1 text-sm text-slate-900 font-medium leading-relaxed">
                    {alert.clinicalRecommendation}
                  </p>
                </div>
              </div>

              {/* Translated Advice Box */}
              <div
                className={`mt-2 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  alert.severity === 'HIGH_RISK'
                    ? 'bg-red-50/70 border-red-200 text-red-950'
                    : alert.severity === 'CAUTION'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                <p className="text-base font-semibold leading-relaxed">
                  {alert.translatedAdvisory[language]}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    speakAdvisory(alert.id, alert.translatedAdvisory[language])
                  }
                  className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                >
                  {speakingAlertId === alert.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                  )}
                  <span>Listen</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Check Another Medicine You Take at Home */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            Check Another Medicine You Take at Home
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Type any other tablet you take daily to see if it is safe with this prescription
          </p>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newMedicineInput}
            onChange={(e) => setNewMedicineInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddMedicineAudit();
            }}
            placeholder="Type medicine name (e.g., Brufen 400, Omez 20, Thyronorm)..."
            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
          />
          <button
            type="button"
            disabled={isAuditing || !newMedicineInput.trim()}
            onClick={() => handleAddMedicineAudit()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            {isAuditing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>
              {isAuditing ? 'Checking Safety...' : 'Check If Safe'}
            </span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Tap to test:</span>
          {QUICK_CABINET_DRUGS.map((drug) => (
            <button
              key={drug}
              type="button"
              disabled={isAuditing}
              onClick={() => handleAddMedicineAudit(drug)}
              className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
            >
              + {drug}
            </button>
          ))}
        </div>

        {auditError && (
          <p className="mt-3 text-xs text-red-600 font-medium">{auditError}</p>
        )}
      </section>
    </div>
  );
};
