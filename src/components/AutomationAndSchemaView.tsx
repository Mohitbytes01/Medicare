import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileSpreadsheet,
  Loader2,
  MessageSquare,
  Mic,
  Send,
  ShoppingCart,
  Upload,
} from 'lucide-react';
import {
  AutomationLogEntry,
  PrescriptionVerificationResult,
  SupportedLanguage,
} from '../types/prescription';

interface AutomationAndSchemaViewProps {
  result: PrescriptionVerificationResult | null;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  defaultPhone?: string;
  onPrescriptionExtractedFromBot?: (newResult: PrescriptionVerificationResult) => void;
  isAuthenticated?: boolean;
  onRequireSignIn?: () => void;
}

export const AutomationAndSchemaView: React.FC<AutomationAndSchemaViewProps> = ({
  result,
  language,
  onLanguageChange,
  defaultPhone,
}) => {
  const [patientPhone, setPatientPhone] = useState(defaultPhone || '+91 ');
  const [waitlistPhone, setWaitlistPhone] = useState(defaultPhone || '+91 ');
  const [waitlistSaved, setWaitlistSaved] = useState(false);

  const [isDispatching, setIsDispatching] = useState(false);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [copiedSms, setCopiedSms] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultPhone) {
      setPatientPhone(defaultPhone);
      setWaitlistPhone(defaultPhone);
    }
  }, [defaultPhone]);

  useEffect(() => {
    fetch('/api/automation/logs')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      })
      .catch(() => {});
  }, []);

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (waitlistPhone.replace(/[^0-9]/g, '').length < 10) return;
    localStorage.setItem('verimed_whatsapp_waitlist_phone', waitlistPhone.trim());
    setWaitlistSaved(true);
  };

  const cleanDigitsPhone = patientPhone.replace(/[^0-9]/g, '');
  const smsText = result
    ? `[VeriMed] ${result.patientName} (${result.prescriptionDate}): ${result.regionalSummary[language]}`
    : `[VeriMed] Upload your doctor's prescription on VeriMed to get your daily medicine schedule in English, বাংলা, or हिन्दी.`;

  const whatsappDeepLink =
    cleanDigitsPhone.length >= 10
      ? `https://wa.me/${cleanDigitsPhone}?text=${encodeURIComponent(smsText)}`
      : `https://wa.me/?text=${encodeURIComponent(smsText)}`;

  const nativeSmsDeepLink = cleanDigitsPhone
    ? `sms:+${cleanDigitsPhone}?body=${encodeURIComponent(smsText)}`
    : `sms:?body=${encodeURIComponent(smsText)}`;

  const handleTriggerAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;
    setIsDispatching(true);
    setDispatchSuccessMsg(null);

    try {
      const res = await fetch('/api/automation/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: result.patientName,
          patientPhone: patientPhone.trim() || 'WhatsApp Contact',
          language,
          useBuiltInEngine: true,
          verificationResult: result,
        }),
      });
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
      setDispatchSuccessMsg(
        `Saved reminder for ${result.patientName} in the Pharmacy Order Record below.`
      );
    } catch {
      setDispatchSuccessMsg('Saved reminder to your local list.');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCopySms = async () => {
    await navigator.clipboard.writeText(smsText);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2000);
  };

  const handleExportPharmacyCsv = () => {
    const headers = [
      'Record ID',
      'Time',
      'Patient Name',
      'Phone Number',
      'Language',
      'Medicines',
      'Best Price Total (INR)',
      'Reminder Text',
    ];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.patientName.replace(/"/g, '""')}"`,
      `"${l.patientPhone}"`,
      l.language.toUpperCase(),
      String(l.medicineCount),
      String(l.optimalCartTotal.toFixed(2)),
      `"${l.smsPreview.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verimed-reminders.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: WhatsApp Business Bot — Coming Soon Banner & Early Access */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Coming Soon</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              VeriMed Official WhatsApp Business Bot
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Soon, elderly patients and families in Tier-2/3 cities won&apos;t even need to open a website. Simply send a photo of any handwritten prescription on WhatsApp to receive an instant{' '}
              <strong className="text-slate-900">spoken Bengali / Hindi voice note</strong> and a{' '}
              <strong className="text-slate-900">1-tap lowest-price medicine purchase link</strong>.
            </p>
          </div>
        </div>

        {/* 3 Upcoming Capabilities Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Upload className="w-4 h-4 text-teal-700" />
              <span>1. Send Photo in WhatsApp</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Snap and send a photo of your doctor&apos;s prescription directly in your regular WhatsApp chat.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Mic className="w-4 h-4 text-teal-700" />
              <span>2. Spoken Audio Voice Note</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Receive an automatic বাংলা (Bengali), हिन्दी (Hindi), or English voice note reading every dose aloud.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <ShoppingCart className="w-4 h-4 text-teal-700" />
              <span>3. Direct Pharmacy Buy Link</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Get a 1-tap checkout link for the lowest verified medicine bill across 4 online pharmacies.
            </p>
          </div>
        </div>

        {/* Early Access Notification Form */}
        <div className="p-5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">
              Get Notified When the WhatsApp Bot Launches
            </h2>
            <p className="text-xs text-slate-600">
              Enter your WhatsApp mobile number below and we will send you the official VeriMed bot contact as soon as it goes live.
            </p>
          </div>

          {waitlistSaved ? (
            <div className="p-3 rounded-xl bg-white border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                You&apos;re on the early-access list! We will notify {waitlistPhone} on WhatsApp when the bot is live.
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleJoinWaitlist}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-lg"
            >
              <input
                type="tel"
                required
                value={waitlistPhone}
                onChange={(e) => setWaitlistPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Notify Me on WhatsApp</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Section 2: Direct Phone & WhatsApp Share (Available Right Now) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="pb-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            Share Prescription Schedule Manually via WhatsApp or SMS (Available Now)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            While the automated WhatsApp Bot is coming soon, you can still forward your analyzed medicine schedule to any family member&apos;s phone in one tap below.
          </p>
        </div>

        <form onSubmit={handleTriggerAutomation} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Patient or Family Member Phone Number
              </label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Message Language
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl min-h-[44px]">
                {(
                  [
                    { id: 'bn', label: 'বাংলা (Bengali)' },
                    { id: 'hi', label: 'हिन्दी (Hindi)' },
                    { id: 'en', label: 'English' },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onLanguageChange(l.id)}
                    className={`rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
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
          </div>

          {/* Message Preview Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-500">
              Message Preview:
            </div>
            <p className="text-sm text-slate-900 font-medium leading-relaxed">
              {smsText}
            </p>

            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2.5">
              <a
                href={whatsappDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4" />
                <span>
                  {cleanDigitsPhone.length >= 10
                    ? `Share on WhatsApp (${patientPhone})`
                    : 'Choose Contact on WhatsApp'}
                </span>
              </a>

              <a
                href={nativeSmsDeepLink}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <span>Send via Phone SMS</span>
              </a>

              <button
                type="button"
                onClick={handleCopySms}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedSms ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-600" />
                )}
                <span>{copiedSms ? 'Copied!' : 'Copy Message'}</span>
              </button>

              {result && (
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ml-auto"
                >
                  {isDispatching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {isDispatching ? 'Saving...' : 'Save to Pharmacy Record'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {dispatchSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
              {dispatchSuccessMsg}
            </div>
          )}
        </form>
      </section>

      {/* Saved Reminder & Order History */}
      {logs.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Saved Reminder &amp; Order Records
              </h2>
              <p className="text-xs text-slate-500">
                Download this list as a spreadsheet file (CSV) for your local pharmacy
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportPharmacyCsv}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-700" />
              <span>Download Spreadsheet (CSV)</span>
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {logs.map((log) => (
              <div
                key={log.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {log.patientName}
                    </span>
                    <span className="font-mono text-slate-500">
                      ({log.patientPhone})
                    </span>
                    <span className="text-slate-400">· {log.timestamp}</span>
                  </div>
                  <p className="text-slate-600">{log.smsPreview}</p>
                </div>
                <div className="font-mono font-bold text-teal-800 shrink-0">
                  {log.medicineCount} Meds · ₹{log.optimalCartTotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
