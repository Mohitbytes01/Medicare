import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  MessageSquare,
  Mic,
  Send,
  ShoppingCart,
  Square,
  Upload,
  Volume2,
} from 'lucide-react';
import {
  AutomationLogEntry,
  PrescriptionVerificationResult,
  SupportedLanguage,
} from '../types/prescription';
import { normalizeUploadedPrescriptionFile } from '../utils/imageNormalizer';

interface WhatsAppBotExchange {
  id: string;
  timestamp: string;
  senderPhone: string;
  language: 'en' | 'bn' | 'hi';
  patientName: string;
  doctorName: string;
  voiceNoteScript: string;
  audioDataUrl?: string | null;
  whatsappTextReply: string;
  bestPharmacyName: string;
  bestPharmacyTotal: number;
  mrpTotal: number;
  savingsAmount: number;
  primaryPurchaseUrl: string;
  metaApiDelivered?: boolean;
  medicineLinks: Array<{
    name: string;
    dosage: string;
    timingLabel: string;
    instruction: string;
    price: number;
    buyUrl: string;
  }>;
}

interface MetaWebhookConfigStatus {
  webhookCallbackUrl: string;
  verifyToken: string;
  metaCloudConfigured: boolean;
  botDisplayNumber: string;
}

interface AutomationAndSchemaViewProps {
  result: PrescriptionVerificationResult | null;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  defaultPhone?: string;
  onPrescriptionExtractedFromBot?: (newResult: PrescriptionVerificationResult) => void;
}

export const AutomationAndSchemaView: React.FC<AutomationAndSchemaViewProps> = ({
  result,
  language,
  onLanguageChange,
  defaultPhone,
  onPrescriptionExtractedFromBot,
}) => {
  const [patientPhone, setPatientPhone] = useState(
    defaultPhone || '+91 '
  );
  const [botLanguage, setBotLanguage] = useState<SupportedLanguage>(
    language === 'en' ? 'bn' : language
  );
  const [isBotProcessing, setIsBotProcessing] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);
  const [uploadedChatImage, setUploadedChatImage] = useState<string | null>(null);
  const [botMessages, setBotMessages] = useState<WhatsAppBotExchange[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);

  const [metaConfig, setMetaConfig] = useState<MetaWebhookConfigStatus>({
    webhookCallbackUrl:
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/whatsapp/webhook`
        : '/api/whatsapp/webhook',
    verifyToken: 'verimed_whatsapp_verify_2026',
    metaCloudConfigured: false,
    botDisplayNumber: '+1 555 092 8471',
  });
  const [showMetaSetupGuide, setShowMetaSetupGuide] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);

  const [isDispatching, setIsDispatching] = useState(false);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [copiedSms, setCopiedSms] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (defaultPhone) {
      setPatientPhone(defaultPhone);
    }
  }, [defaultPhone]);

  useEffect(() => {
    fetch('/api/whatsapp/config-status')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.webhookCallbackUrl) {
          setMetaConfig(data);
        }
      })
      .catch(() => {});

    fetch('/api/whatsapp/messages')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.messages)) {
          setBotMessages(data.messages);
        }
      })
      .catch(() => {});

    fetch('/api/automation/logs')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      })
      .catch(() => {});

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Automatically generate an initial WhatsApp Bot reply if user already analyzed a prescription and history is empty
  useEffect(() => {
    if (result && botMessages.length === 0 && !isBotProcessing) {
      handleSimulateWhatsAppBot({ existingRx: result, targetLang: botLanguage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const handleSimulateWhatsAppBot = async (opts: {
    imageBase64?: string;
    mimeType?: string;
    existingRx?: PrescriptionVerificationResult | null;
    targetLang?: SupportedLanguage;
  }) => {
    const chosenLang = opts.targetLang || botLanguage;
    setIsBotProcessing(true);
    setBotError(null);

    try {
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderPhone: patientPhone.trim() || '+91 98300 00000',
          language: chosenLang,
          imageBase64: opts.imageBase64,
          mimeType: opts.mimeType || 'image/jpeg',
          verificationResult: opts.imageBase64 ? undefined : opts.existingRx || result,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'WhatsApp Bot could not process the prescription');
      }
      if (Array.isArray(data.messages)) {
        setBotMessages(data.messages);
      } else if (data.exchange) {
        setBotMessages((prev) => [data.exchange, ...prev]);
      }
      if (data.updatedPrescriptionResult && onPrescriptionExtractedFromBot && !result) {
        onPrescriptionExtractedFromBot(data.updatedPrescriptionResult);
      }
    } catch (err: unknown) {
      setBotError(
        err instanceof Error ? err.message : 'Failed to process WhatsApp prescription photo.'
      );
    } finally {
      setIsBotProcessing(false);
    }
  };

  const handleChatPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const { dataUrl, mimeType } = await normalizeUploadedPrescriptionFile(file);
      setUploadedChatImage(dataUrl);
      await handleSimulateWhatsAppBot({
        imageBase64: dataUrl,
        mimeType,
        targetLang: botLanguage,
      });
    } catch (err: unknown) {
      setBotError(
        err instanceof Error ? err.message : 'Could not read the selected photo.'
      );
    }
  };

  const handlePlayVoiceNote = async (msg: WhatsAppBotExchange) => {
    if (playingId === msg.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Play pre-generated Gemini TTS audio if available
    if (msg.audioDataUrl) {
      const audio = new Audio(msg.audioDataUrl);
      audioRef.current = audio;
      setPlayingId(msg.id);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      await audio.play();
      return;
    }

    // Otherwise request on-demand Gemini TTS or fallback to Web Speech Synthesis
    setLoadingAudioId(msg.id);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg.voiceNoteScript,
          language: msg.language,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioDataUrl) {
          // Cache audioDataUrl on the message so user can also download the .wav
          setBotMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id ? { ...m, audioDataUrl: data.audioDataUrl } : m
            )
          );
          const audio = new Audio(data.audioDataUrl);
          audioRef.current = audio;
          setLoadingAudioId(null);
          setPlayingId(msg.id);
          audio.onended = () => setPlayingId(null);
          audio.onerror = () => setPlayingId(null);
          await audio.play();
          return;
        }
      }
    } catch {
      // Fallback to native speech synthesis below
    }

    setLoadingAudioId(null);
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(msg.voiceNoteScript);
      utterance.lang =
        msg.language === 'bn' ? 'bn-IN' : msg.language === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.92;
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      setPlayingId(msg.id);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDownloadVoiceNote = async (msg: WhatsAppBotExchange) => {
    let wavDataUrl = msg.audioDataUrl;
    if (!wavDataUrl) {
      setLoadingAudioId(msg.id);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: msg.voiceNoteScript,
            language: msg.language,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          wavDataUrl = data.audioDataUrl;
        }
      } catch {
        // ignore
      } finally {
        setLoadingAudioId(null);
      }
    }

    if (wavDataUrl) {
      const a = document.createElement('a');
      a.href = wavDataUrl;
      a.download = `VeriMed_VoiceNote_${msg.language.toUpperCase()}_${msg.id}.wav`;
      a.click();
    }
  };

  const cleanDigitsPhone = patientPhone.replace(/[^0-9]/g, '');
  const smsText = result
    ? `[VeriMed] ${result.patientName} (${result.prescriptionDate}): ${result.regionalSummary[language]}`
    : `[VeriMed WhatsApp Bot] Upload a prescription photo to receive an instant Bengali/Hindi voice note schedule and lowest-price medicine purchase link.`;

  // If user typed a valid phone number, target that number; otherwise open WhatsApp contact picker with pre-filled text
  const buildWhatsAppLink = (text: string) =>
    cleanDigitsPhone.length >= 10
      ? `https://wa.me/${cleanDigitsPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

  const whatsappDeepLink = buildWhatsAppLink(smsText);
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

  const activeExchange = botMessages[0] || null;

  return (
    <div className="space-y-6">
      {/* Section 1: WhatsApp Business Bot Channel (Meta Free Test Number + Live Bot Simulator) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-emerald-700">
                Zero-Friction Access · Meta Official WhatsApp Cloud API Ready
              </span>
              {metaConfig.metaCloudConfigured ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Meta Cloud API Connected</span>
                </span>
              ) : null}
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              VeriMed WhatsApp Business Bot Channel
            </h1>
            <p className="mt-1 text-xs text-slate-600 max-w-2xl leading-relaxed">
              Elderly patients or users in Tier-2/3 cities simply WhatsApp a photo of their prescription. Gemini VLM reads the handwriting and replies in WhatsApp with a{' '}
              <strong className="text-slate-900">spoken Bengali / Hindi voice note</strong> explaining the schedule plus a{' '}
              <strong className="text-slate-900">1-tap lowest-price purchase link</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowMetaSetupGuide((prev) => !prev)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>
                {showMetaSetupGuide
                  ? 'Hide Meta Free Test Number Webhook Info'
                  : 'Connect Meta Free Test Number (₹0)'}
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible Meta Free Test WhatsApp Number Webhook Configuration Info */}
        {showMetaSetupGuide && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  How to Connect Meta&apos;s Free Test WhatsApp Number (₹0, No SIM Needed)
                </h2>
                <p className="text-slate-600 mt-0.5">
                  Paste the Webhook Callback URL and Verify Token below into{' '}
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 font-bold underline"
                  >
                    developers.facebook.com
                  </a>{' '}
                  → WhatsApp → Configuration:
                </p>
              </div>
              <span className="font-mono text-[11px] font-semibold text-emerald-800">
                GET &amp; POST /api/whatsapp/webhook Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-500">
                    1. Webhook Callback URL
                  </div>
                  <div className="font-mono text-xs text-slate-900 truncate">
                    {metaConfig.webhookCallbackUrl}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(metaConfig.webhookCallbackUrl);
                    setCopiedWebhookUrl(true);
                    setTimeout(() => setCopiedWebhookUrl(false), 2000);
                  }}
                  className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedWebhookUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedWebhookUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-500">
                    2. Webhook Verify Token
                  </div>
                  <div className="font-mono text-xs text-slate-900 truncate">
                    {metaConfig.verifyToken}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(metaConfig.verifyToken);
                    setCopiedVerifyToken(true);
                    setTimeout(() => setCopiedVerifyToken(false), 2000);
                  }}
                  className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedVerifyToken ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedVerifyToken ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              3. Subscribe to the <code className="font-mono font-bold text-slate-800">messages</code> webhook field in Meta&apos;s dashboard, and set <code className="font-mono font-bold text-slate-800">WHATSAPP_ACCESS_TOKEN</code> and <code className="font-mono font-bold text-slate-800">WHATSAPP_PHONE_NUMBER_ID</code> in your environment secrets. Any photo sent to your Meta Test Number will be processed automatically by Gemini VLM!
            </p>
          </div>
        )}

        {/* Bot Controls: Real Recipient WhatsApp Number + Audio Language + Photo Upload */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Real WhatsApp Number Input */}
            <div className="lg:col-span-4">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                1. Your Real WhatsApp Number (Optional for Direct Send):
              </label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>

            {/* Audio Reply Language Selector */}
            <div className="lg:col-span-4">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                2. Bot Audio Reply Language:
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-white border border-slate-200 rounded-xl min-h-[40px]">
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
                    onClick={() => {
                      setBotLanguage(l.id);
                      onLanguageChange(l.id);
                      if (result || uploadedChatImage) {
                        handleSimulateWhatsAppBot({
                          imageBase64: uploadedChatImage || undefined,
                          existingRx: result,
                          targetLang: l.id,
                        });
                      }
                    }}
                    className={`rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      botLanguage === l.id
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="lg:col-span-4 flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleChatPhotoUpload}
                className="hidden"
              />

              <button
                type="button"
                disabled={isBotProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer flex-1 justify-center"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>Send Prescription Photo to Bot</span>
              </button>

              {result && (
                <button
                  type="button"
                  disabled={isBotProcessing}
                  onClick={() =>
                    handleSimulateWhatsAppBot({
                      existingRx: result,
                      targetLang: botLanguage,
                    })
                  }
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isBotProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Refresh Audio</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {botError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {botError}
          </div>
        )}

        {/* Interactive WhatsApp Business Chat Thread */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-[#EFEAE2]">
          {/* WhatsApp Top Bar */}
          <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                VM
              </div>
              <div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <span>VeriMed Official WhatsApp Bot</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/30 font-semibold">
                    Meta Cloud API
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100 font-mono">
                  Instant Gemini VLM + Bengali/Hindi Voice Note + Lowest-Price Link
                </div>
              </div>
            </div>
            <div className="text-[11px] text-emerald-100 hidden sm:block font-mono">
              /api/whatsapp/webhook
            </div>
          </div>

          {/* WhatsApp Chat Messages Area */}
          <div className="p-4 sm:p-6 space-y-4 max-h-[580px] overflow-y-auto">
            {isBotProcessing && (
              <div className="p-4 rounded-xl bg-white/95 border border-emerald-200 flex items-center gap-3 text-xs font-semibold text-slate-800 max-w-md">
                <Loader2 className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
                <span>
                  VeriMed WhatsApp Bot is reading the prescription photo via Gemini VLM and recording your{' '}
                  {botLanguage === 'bn' ? 'Bengali (বাংলা)' : botLanguage === 'hi' ? 'Hindi (हिन्दी)' : 'English'} audio voice note...
                </span>
              </div>
            )}

            {!activeExchange && !isBotProcessing ? (
              <div className="p-6 rounded-xl bg-white/95 border border-slate-200 text-center space-y-3 max-w-lg mx-auto">
                <MessageSquare className="w-7 h-7 text-emerald-700 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Send a Prescription Photo to the WhatsApp Bot
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tap <strong className="text-slate-900">Send Prescription Photo to Bot</strong> above to see the instant Bengali/Hindi voice note and lowest-price purchase link reply, then forward it to your real WhatsApp number in one click.
                  </p>
                </div>
              </div>
            ) : activeExchange ? (
              <div className="space-y-4">
                {/* Outgoing Patient Message Bubble (Right-aligned green bubble) */}
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] text-slate-900 rounded-2xl rounded-tr-xs p-3.5 max-w-sm shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-slate-600 font-mono">
                      <span>Patient ({activeExchange.patientName})</span>
                      <span>{activeExchange.timestamp}</span>
                    </div>
                    {uploadedChatImage && (
                      <img
                        src={uploadedChatImage}
                        alt="WhatsApp prescription"
                        className="w-full max-h-40 object-cover rounded-lg border border-emerald-300"
                      />
                    )}
                    <p className="text-xs font-semibold text-slate-800">
                      📷 Prescription Photo Sent —{' '}
                      {activeExchange.language === 'bn'
                        ? 'দয়া করে বাংলায় ওষুধ খাওয়ার নিয়ম ও কেনার লিঙ্ক পাঠান।'
                        : activeExchange.language === 'hi'
                          ? 'कृपया हिन्दी में दवा लेने का समय और खरीदने का लिंक भेजें।'
                          : 'Please send audio dosage instructions and lowest-price buy link.'}
                    </p>
                  </div>
                </div>

                {/* Incoming VeriMed Bot Reply Bubble (Left-aligned white bubble with Audio Note + Buy Link) */}
                <div className="flex justify-start">
                  <div className="bg-white text-slate-900 rounded-2xl rounded-tl-xs p-4 sm:p-5 max-w-2xl w-full shadow-xs space-y-4 border border-slate-200/80">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-800">
                          VeriMed Bot · Instant VLM + Voice Note Reply
                        </span>
                        {activeExchange.metaApiDelivered && (
                          <span className="text-[10px] font-semibold text-emerald-700">
                            · Delivered via Meta Cloud API ✓
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {activeExchange.timestamp}
                      </span>
                    </div>

                    {/* 1. WhatsApp Audio Voice Note Player + Download .WAV */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handlePlayVoiceNote(activeExchange)}
                            disabled={loadingAudioId === activeExchange.id}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                              playingId === activeExchange.id
                                ? 'bg-slate-900 text-white'
                                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            }`}
                            aria-label="Play WhatsApp voice note"
                          >
                            {loadingAudioId === activeExchange.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : playingId === activeExchange.id ? (
                              <Square className="w-4 h-4" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                              <Mic className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>
                                {activeExchange.language === 'bn'
                                  ? 'বাংলা অডিও ভয়েস নোট (Bengali Voice Note)'
                                  : activeExchange.language === 'hi'
                                    ? 'हिन्दी ऑडियो वॉयस नोट (Hindi Voice Note)'
                                    : 'English Audio Voice Note'}
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-800 truncate">
                              {playingId === activeExchange.id
                                ? 'Speaking dosage instructions aloud...'
                                : 'Tap Play to listen to the spoken schedule'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadVoiceNote(activeExchange)}
                          className="min-h-[32px] px-2.5 py-1 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-900 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Audio (.wav)</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                        “{activeExchange.voiceNoteScript}”
                      </p>
                    </div>

                    {/* 2. Structured Medicine Schedule in Selected Language */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-800">
                        👨‍⚕️ {activeExchange.doctorName} · 👤 {activeExchange.patientName}
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {activeExchange.medicineLinks.map((m, idx) => (
                          <div
                            key={`${m.name}-${idx}`}
                            className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-slate-900">
                                {idx + 1}. {m.name}{' '}
                                <span className="font-mono text-[11px] text-teal-700">
                                  [{m.timingLabel}]
                                </span>
                              </div>
                              <div className="text-xs text-slate-600">{m.instruction}</div>
                            </div>

                            <a
                              href={m.buyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-teal-700 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 self-start sm:self-center"
                            >
                              <span className="font-mono">₹{m.price.toFixed(0)}</span>
                              <span>· Buy</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Direct Purchase Link Card inside WhatsApp Reply */}
                    <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-teal-950">
                          🛒 Lowest Full Bill on {activeExchange.bestPharmacyName}:{' '}
                          <span className="font-mono">
                            ₹{activeExchange.bestPharmacyTotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-semibold">
                          Save ₹{activeExchange.savingsAmount.toFixed(2)} off MRP (₹
                          {activeExchange.mrpTotal.toFixed(2)})
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={activeExchange.primaryPurchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Order on {activeExchange.bestPharmacyName}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <a
                          href={buildWhatsAppLink(activeExchange.whatsappTextReply)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>
                            {cleanDigitsPhone.length >= 10
                              ? `Send to ${patientPhone}`
                              : 'Send to My WhatsApp'}
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Section 2: Direct Phone & SMS Reminder Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="pb-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            Send Text Reminders to Patient or Caregiver Phone
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Enter any real WhatsApp mobile number below (or leave blank to pick a contact inside WhatsApp)
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

            {/* Easy 1-Tap Share Buttons */}
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
                    ? `Send on WhatsApp (${patientPhone})`
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
