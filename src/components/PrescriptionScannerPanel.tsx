import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  FileText,
  Languages,
  Maximize2,
  RefreshCw,
  Sparkles,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { SupportedLanguage } from '../types/prescription';

const LANGUAGE_OPTIONS: Array<{ id: SupportedLanguage; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'bn', label: 'বাংলা (Bengali)' },
  { id: 'hi', label: 'हिन्दी (Hindi)' },
];

const SCAN_STAGES = [
  {
    label: 'Analyzing handwriting...',
    detail: 'Reading doctor script, clinic details, and medical abbreviations',
    threshold: 35,
  },
  {
    label: 'Extracting medicines & dosages...',
    detail: 'Identifying tablet strengths, meal relations, and daily schedule',
    threshold: 70,
  },
  {
    label: 'Checking drug interactions...',
    detail: 'Cross-checking medicines for clashes and preparing instructions',
    threshold: 100,
  },
];

interface PrescriptionScannerPanelProps {
  previewDataUrl: string;
  uploadedFileName: string | null;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  isScanning: boolean;
  scanError: string | null;
  onUploadFile: (file: File) => void;
  onRunLiveGeminiScan: () => void;
}

export const PrescriptionScannerPanel: React.FC<PrescriptionScannerPanelProps> = ({
  previewDataUrl,
  uploadedFileName,
  language,
  onLanguageChange,
  isScanning,
  scanError,
  onUploadFile,
  onRunLiveGeminiScan,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);

  useEffect(() => {
    if (!isScanning) {
      setScanProgress(0);
      return;
    }

    setScanProgress(18);
    const interval = window.setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 92) return prev;
        const step = prev < 60 ? 12 : prev < 85 ? 7 : 3;
        return Math.min(92, prev + step);
      });
    }, 220);

    return () => window.clearInterval(interval);
  }, [isScanning]);

  const activeStageIndex = Math.max(
    0,
    SCAN_STAGES.findIndex((s) => scanProgress <= s.threshold)
  );
  const currentStage = SCAN_STAGES[activeStageIndex] || SCAN_STAGES[0];

  const selectedLanguageLabel =
    LANGUAGE_OPTIONS.find((l) => l.id === language)?.label || 'English';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  return (
    <aside className="w-full bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
      {/* Simple Header */}
      <div className="border-b border-slate-100 pb-3.5">
        <h2 className="text-base font-bold text-slate-900">
          Your Prescription Photo
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          1. Upload photo · 2. Select language from dropdown · 3. Tap Analyze
        </p>
      </div>

      {/* Step 1: Upload & Camera Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Upload className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Upload Photo</span>
        </button>

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Camera className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Take Photo</span>
        </button>
      </div>

      {/* Step 2: Language Dropdown Selector + Primary Analyze Button */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div>
          <label
            htmlFor="rx-language-select"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1.5"
          >
            <Languages className="w-3.5 h-3.5 text-teal-700" />
            <span>Select Language for Analysis</span>
          </label>
          <select
            id="rx-language-select"
            value={language}
            disabled={isScanning}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-700 cursor-pointer"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!previewDataUrl || isScanning}
          onClick={onRunLiveGeminiScan}
          className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-xs"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>
                {currentStage.label} ({scanProgress}%)
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                {previewDataUrl
                  ? `Analyze Prescription in ${selectedLanguageLabel}`
                  : 'Upload a Photo First to Analyze'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Prescription Image Viewport */}
      <div className="relative rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-slate-200 text-xs">
          <span className="truncate">
            {uploadedFileName ? `Uploaded: ${uploadedFileName}` : 'Prescription Preview'}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Zoom out"
              title="Smaller"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.25, Number((z + 0.25).toFixed(2))))}
              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Zoom in"
              title="Larger"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Full screen"
              title="Full Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative h-[280px] overflow-auto flex items-start justify-center p-3 bg-slate-100"
        >
          {previewDataUrl ? (
            <img
              src={previewDataUrl}
              alt="Doctor prescription"
              referrerPolicy="no-referrer"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              className="max-w-full h-auto rounded shadow-xs transition-transform duration-150"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center">
              <FileText className="w-8 h-8 text-slate-400" />
              <p className="text-xs font-medium">
                Drop a prescription photo here or tap Upload Photo above
              </p>
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col justify-center p-5 text-white">
              <div className="w-full max-w-xs mx-auto space-y-4">
                {/* Active Stage Header & Percentage */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <RefreshCw className="w-4 h-4 text-teal-400 animate-spin shrink-0" />
                    <span className="text-xs font-bold text-white truncate">
                      {currentStage.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-bold text-teal-300 shrink-0">
                    {scanProgress}%
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div
                  className="w-full h-2 bg-slate-800 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={scanProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Prescription scan progress"
                >
                  <div
                    className="h-full bg-teal-400 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                {/* Current Stage Detail Subtitle */}
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {currentStage.detail} ({selectedLanguageLabel})
                </p>

                {/* Step-by-Step Status Checklist */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  {SCAN_STAGES.map((stage, idx) => {
                    const isCompleted = idx < activeStageIndex;
                    const isCurrent = idx === activeStageIndex;
                    return (
                      <div
                        key={stage.label}
                        className={`flex items-center gap-2 text-[11px] transition-opacity ${
                          isCompleted
                            ? 'text-teal-300 opacity-95'
                            : isCurrent
                              ? 'text-white font-semibold'
                              : 'text-slate-400 opacity-60'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        ) : isCurrent ? (
                          <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          </span>
                        )}
                        <span className="truncate">{stage.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {scanError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
          <p className="font-semibold">Could not read photo clearly</p>
          <p className="mt-0.5">{scanError}</p>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && previewDataUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen prescription photo"
        >
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900">
                Prescription Photo (Full View)
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Close full screen view"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-auto flex justify-center bg-slate-100">
              <img
                src={previewDataUrl}
                alt="Full resolution prescription"
                referrerPolicy="no-referrer"
                className="max-w-full h-auto rounded shadow"
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
