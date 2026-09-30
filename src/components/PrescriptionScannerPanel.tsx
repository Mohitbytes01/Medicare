import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  FileText,
  Maximize2,
  RefreshCw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

const SCAN_STAGES = [
  {
    label: 'Analyzing handwriting...',
    detail: 'Reading doctor script, clinic details, and medical abbreviations',
    threshold: 25,
  },
  {
    label: 'Extracting medicines & dosages...',
    detail: 'Identifying tablet strengths, meal relations, and daily schedule',
    threshold: 50,
  },
  {
    label: 'Checking drug interactions...',
    detail: 'Cross-checking medicines for clashes and safety warnings',
    threshold: 72,
  },
  {
    label: 'Translating into বাংলা, हिन्दी & English...',
    detail: 'Preparing simple regional language dosage instructions',
    threshold: 88,
  },
  {
    label: 'Comparing online pharmacy prices...',
    detail: 'Fetching lowest prices across Tata 1mg, PharmEasy, Netmeds & Apollo',
    threshold: 100,
  },
];

interface PrescriptionScannerPanelProps {
  previewDataUrl: string;
  uploadedFileName: string | null;
  isScanning: boolean;
  scanError: string | null;
  onUploadFile: (file: File) => void;
  onRunLiveGeminiScan: () => void;
}

export const PrescriptionScannerPanel: React.FC<PrescriptionScannerPanelProps> = ({
  previewDataUrl,
  uploadedFileName,
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

    setScanProgress(10);
    const interval = window.setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 94) return prev;
        const step = prev < 50 ? 6 : prev < 80 ? 4 : 2;
        return Math.min(94, prev + step);
      });
    }, 380);

    return () => window.clearInterval(interval);
  }, [isScanning]);

  const activeStageIndex = Math.max(
    0,
    SCAN_STAGES.findIndex((s) => scanProgress <= s.threshold)
  );
  const currentStage = SCAN_STAGES[activeStageIndex] || SCAN_STAGES[0];

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
    <aside className="w-full bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-5">
      {/* Simple Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-base font-bold text-slate-900">
          Your Prescription Photo
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Upload or take a clear photo of your doctor&apos;s prescription
        </p>
      </div>

      {/* Primary Upload & Camera Buttons right at the top for easy access */}
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
          className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Upload className="w-4 h-4 shrink-0" />
          <span>Upload Photo</span>
        </button>

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Camera className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Take Photo</span>
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
          className="relative h-[300px] overflow-auto flex items-start justify-center p-3 bg-slate-100"
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
                    className="h-full bg-teal-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                {/* Current Stage Detail Subtitle */}
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {currentStage.detail}
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

      {/* Re-Analyze Action Button (Only shown once a photo is uploaded) */}
      {previewDataUrl && (
        <button
          type="button"
          disabled={isScanning}
          onClick={onRunLiveGeminiScan}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 shrink-0 ${isScanning ? 'animate-spin text-teal-400' : ''}`} />
          <span>
            {isScanning
              ? `${currentStage.label} (${scanProgress}%)`
              : 'Read This Prescription Again'}
          </span>
        </button>
      )}

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
