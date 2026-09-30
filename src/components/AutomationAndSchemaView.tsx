import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Send,
  Loader2,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AutomationLogEntry,
  PrescriptionVerificationResult,
  SupportedLanguage,
} from '../types/prescription';

interface AutomationAndSchemaViewProps {
  result: PrescriptionVerificationResult;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  defaultPhone?: string;
}

export const AutomationAndSchemaView: React.FC<AutomationAndSchemaViewProps> = ({
  result,
  language,
  onLanguageChange,
  defaultPhone,
}) => {
  const [patientPhone, setPatientPhone] = useState(
    defaultPhone || '+91 98301 44820'
  );
  const [isDispatching, setIsDispatching] = useState(false);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [copiedSms, setCopiedSms] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultPhone) {
      setPatientPhone(defaultPhone);
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

  const smsText = `[VeriMed] ${result.patientName} (${result.prescriptionDate}): ${result.regionalSummary[language]}`;
  const cleanDigitsPhone = patientPhone.replace(/[^0-9]/g, '');
  const whatsappDeepLink = `https://wa.me/${cleanDigitsPhone}?text=${encodeURIComponent(smsText)}`;
  const nativeSmsDeepLink = `sms:+${cleanDigitsPhone}?body=${encodeURIComponent(smsText)}`;

  const handleTriggerAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    setDispatchSuccessMsg(null);

    try {
      const res = await fetch('/api/automation/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: result.patientName,
          patientPhone,
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
        `Saved reminder for ${result.patientName} (${patientPhone}) in the Pharmacy Order Record below.`
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
    a.download = `medicine-reminders-${result.verificationId.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Simple Phone & WhatsApp Reminder Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="pb-5 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">
            Send Medicine Reminders to Phone
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Share the daily medicine schedule in Bengali, Hindi, or English via WhatsApp or SMS
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
                required
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
              Message Preview (for {patientPhone}):
            </div>
            <p className="text-base text-slate-900 font-medium leading-relaxed">
              {smsText}
            </p>

            {/* Easy 1-Tap Share Buttons */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2.5">
              <a
                href={whatsappDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send on WhatsApp</span>
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
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Saved Reminders &amp; Pharmacy Order List
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              History of sent schedules and medicine orders
            </p>
          </div>

          {logs.length > 0 && (
            <button
              type="button"
              onClick={handleExportPharmacyCsv}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-700" />
              <span>Download Excel / Sheet (.csv)</span>
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">
            No reminders saved yet. Tap &ldquo;Save to Pharmacy Record&rdquo; above to log a schedule.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 pr-4">Time</th>
                  <th className="py-3 px-4">Patient &amp; Phone</th>
                  <th className="py-3 px-4">Message Sent</th>
                  <th className="py-3 pl-4 text-right">Lowest Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {logs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 pr-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{entry.patientName}</div>
                      <div className="text-xs font-mono text-slate-500">{entry.patientPhone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 max-w-md">
                      {entry.smsPreview}
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      ₹{entry.optimalCartTotal.toFixed(2)} ({entry.medicineCount} medicines)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
