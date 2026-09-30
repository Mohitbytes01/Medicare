import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Volume2,
  VolumeX,
  ArrowRight,
} from 'lucide-react';
import {
  PrescriptionVerificationResult,
  SupportedLanguage,
  TimeSlot,
} from '../types/prescription';

interface DosageScheduleViewProps {
  result: PrescriptionVerificationResult;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onNavigateTab: (
    tab: 'schedule' | 'safety' | 'prices' | 'care_circle' | 'automation'
  ) => void;
  isComparingPrices?: boolean;
}

const LANGUAGE_LABELS: Array<{ id: SupportedLanguage; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'bn', label: 'বাংলা (Bengali)' },
  { id: 'hi', label: 'हिन्दी (Hindi)' },
];

const SPEECH_LANG_MAP: Record<SupportedLanguage, string[]> = {
  en: ['en-IN', 'en-GB', 'en-US', 'en'],
  bn: ['bn-IN', 'bn-BD', 'bn'],
  hi: ['hi-IN', 'hi'],
};

const TIME_SLOTS: Array<{ id: 'all' | TimeSlot; label: string }> = [
  { id: 'all', label: 'All Day' },
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
];

export const DosageScheduleView: React.FC<DosageScheduleViewProps> = ({
  result,
  language,
  onLanguageChange,
  onNavigateTab,
  isComparingPrices = false,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<'all' | TimeSlot>('all');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  // Stop active speech if user switches language
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }
  }, [language]);

  const filteredMedicines =
    selectedSlot === 'all'
      ? result.medicines
      : result.medicines.filter((m) => m.timing.includes(selectedSlot));

  const speakWithWebSpeechApi = (id: string, text: string) => {
    setSpeechError(null);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechError('Voice playback is not supported in this browser.');
      return;
    }

    // If already speaking this item, stop playback
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const preferredLangCodes = SPEECH_LANG_MAP[language];
    utterance.lang = preferredLangCodes[0];
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    // Pick the best matching voice for English, Hindi, or Bengali
    const voices =
      availableVoices.length > 0
        ? availableVoices
        : window.speechSynthesis.getVoices();

    for (const code of preferredLangCodes) {
      const matchedVoice = voices.find(
        (v) =>
          v.lang.toLowerCase() === code.toLowerCase() ||
          v.lang.toLowerCase().startsWith(code.toLowerCase())
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
        utterance.lang = matchedVoice.lang;
        break;
      }
    }

    utterance.onstart = () => setSpeakingId(id);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const overallRisk = result.safetyAudit.overallStatus;

  return (
    <div className="space-y-6">
      {/* Simple Patient & Doctor Summary Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{result.clinicName}</span>
              <span aria-hidden="true">·</span>
              <span>Date: {result.prescriptionDate}</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Patient: {result.patientName}{' '}
              <span className="text-sm font-normal text-slate-600">
                ({result.patientAgeGender})
              </span>
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Prescribed by <strong>{result.doctorName}</strong> ({result.doctorQualification})
            </p>
          </div>

          {/* Clear Safety Status Button */}
          <button
            type="button"
            onClick={() => onNavigateTab('safety')}
            className={`min-h-[46px] px-4 py-2.5 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer shrink-0 ${
              overallRisk === 'HIGH_RISK'
                ? 'bg-red-50 border-red-200 text-red-900 hover:bg-red-100/80'
                : overallRisk === 'CAUTION'
                  ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/80'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80'
            }`}
          >
            {overallRisk === 'HIGH_RISK' ? (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            ) : overallRisk === 'CAUTION' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold">
                {overallRisk === 'HIGH_RISK'
                  ? 'Warning: 2 Medicines Clash — Tap to Check'
                  : overallRisk === 'CAUTION'
                    ? 'Note: Keep Time Gap Between Medicines'
                    : 'Safe: All Medicines Can Be Taken Together'}
              </div>
              <div className="text-[11px] opacity-85">
                Tap here to read the simple safety advice
              </div>
            </div>
          </button>
        </div>

        {/* Language Selector & Read Aloud Bar */}
        <div className="pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <p className="text-xs font-semibold text-slate-500">
              What this prescription is for:
            </p>
            <p className="text-sm text-slate-800 leading-relaxed">
              {result.diagnosisSummary}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
              aria-label="Selected instruction language"
              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-700 cursor-pointer"
            >
              {LANGUAGE_LABELS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                speakWithWebSpeechApi(
                  'summary-tts',
                  result.regionalSummary[language]
                )
              }
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              {speakingId === 'summary-tts' ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span>
                {speakingId === 'summary-tts'
                  ? 'Stop Reading'
                  : 'Listen to Full Schedule'}
              </span>
            </button>
          </div>
        </div>

        {speechError && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            {speechError}
          </div>
        )}

        {/* Easy Summary Box */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-teal-800">
            {language === 'bn'
              ? 'পুরো দিনের সংক্ষিপ্ত নিয়ম (বাংলা):'
              : language === 'hi'
                ? 'पूरे दिन का आसान नियम (हिन्दी):'
                : 'Quick Daily Summary:'}
          </p>
          <p className="mt-1 text-base text-slate-900 leading-relaxed font-medium">
            {result.regionalSummary[language]}
          </p>
        </div>
      </section>

      {/* Main Medicine List */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              When to Take Your Medicines ({result.medicines.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tap a time of day below or tap &ldquo;Listen&rdquo; to hear instructions aloud
            </p>
          </div>

          {/* Time-of-Day Filter Bar */}
          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto"
            role="group"
            aria-label="Filter medicines by time of day"
          >
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(slot.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedSlot === slot.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {filteredMedicines.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No medicines need to be taken in the {selectedSlot}.
            </p>
            <button
              type="button"
              onClick={() => setSelectedSlot('all')}
              className="mt-3 min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              Show All Medicines
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredMedicines.map((med, idx) => {
              const relatedAlert = result.safetyAudit.alerts.find(
                (a) =>
                  a.severity !== 'SAFE' &&
                  a.involvedDrugs.some(
                    (d) =>
                      d.toLowerCase().includes(med.name.toLowerCase()) ||
                      med.name.toLowerCase().includes(d.toLowerCase())
                  )
              );

              const lowestQuote =
                med.pharmacyQuotes.find((q) => q.isLowestPrice) || med.pharmacyQuotes[0];

              return (
                <div key={med.id} className="py-5 first:pt-4 last:pb-1">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Medicine Name & What it is for */}
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {idx + 1}.
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {med.name}
                        </h3>
                        <span className="text-xs text-slate-500">
                          ({med.genericComposition})
                        </span>
                      </div>

                      {/* Simple Purpose & Timing */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                        <span>
                          <strong>Used for:</strong> {med.purpose}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          <strong>Dose:</strong> {med.dosage}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          <strong>When:</strong>{' '}
                          <span className="capitalize font-semibold text-teal-800">
                            {med.timing.join(' & ')} ({med.mealRelation})
                          </span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          <strong>How long:</strong> {med.duration}
                        </span>
                      </div>

                      {/* Clear Step-by-Step Instruction in Selected Language + Web Speech API Listen Button */}
                      <div className="pt-1 flex items-start justify-between gap-3">
                        <p className="text-base text-slate-900 leading-relaxed font-medium">
                          {med.instructions[language]}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            speakWithWebSpeechApi(
                              med.id,
                              language === 'en'
                                ? `${med.name}. ${med.instructions.en}`
                                : med.instructions[language]
                            )
                          }
                          className={`min-h-[40px] px-3.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                            speakingId === med.id
                              ? 'bg-teal-700 border-teal-700 text-white'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                          }`}
                          aria-label={
                            speakingId === med.id
                              ? `Stop reading instructions for ${med.name}`
                              : `Listen to instructions for ${med.name}`
                          }
                        >
                          {speakingId === med.id ? (
                            <VolumeX className="w-3.5 h-3.5" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                          )}
                          <span>{speakingId === med.id ? 'Stop' : 'Listen'}</span>
                        </button>
                      </div>

                      {/* Simple Warning Box if Medicine Clashes */}
                      {relatedAlert && (
                        <div
                          className={`mt-2 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            relatedAlert.severity === 'HIGH_RISK'
                              ? 'bg-red-50 border-red-200 text-red-900'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="text-xs space-y-0.5">
                            <p className="font-bold">
                              {relatedAlert.severity === 'HIGH_RISK'
                                ? 'Safety Warning: '
                                : 'Important Note: '}
                              {relatedAlert.title}
                            </p>
                            <p>{relatedAlert.translatedAdvisory[language]}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigateTab('safety')}
                            className="text-xs font-bold underline whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
                          >
                            See Why
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right Price Preview (Shows background comparison indicator while prices load) */}
                    {isComparingPrices ? (
                      <div className="lg:text-right flex sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span>Comparing 4 pharmacies...</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Running in background
                        </span>
                      </div>
                    ) : (
                      lowestQuote && (
                        <div className="lg:text-right flex sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                          <div>
                            <div className="text-xs text-slate-500">
                              Best Price on {lowestQuote.platformName}
                            </div>
                            <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                              ₹{lowestQuote.discountedPrice.toFixed(2)}{' '}
                              <span className="text-xs font-normal text-slate-400 line-through">
                                ₹{lowestQuote.mrp.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigateTab('prices')}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <span>Buy / Compare</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Doctor's Short Words Explained */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            Doctor&apos;s Short Words Explained
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Simple meaning of the short codes written on your prescription
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {result.jargonTranslations.map((item, i) => (
            <div
              key={i}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
            >
              <div>
                <span className="font-mono font-bold text-slate-900">
                  {item.term}
                </span>
                <span className="mx-2 text-slate-400">·</span>
                <span className="text-slate-600">{item.meaning}</span>
              </div>
              <div className="text-slate-900 font-medium sm:text-right">
                {item.patientAction}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
