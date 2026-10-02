import React, { useEffect, useState } from 'react';
import { ExternalLink, HeartPulse, X } from 'lucide-react';
import { PrescriptionVerificationResult } from '../types/prescription';

interface AdBannerProps {
  variant?: 'sidebar' | 'horizontal';
  prescription?: PrescriptionVerificationResult | null;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({
  variant = 'horizontal',
  prescription,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const adsenseClientId = (
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_ADSENSE_CLIENT_ID || ''
  ).trim();
  const adsenseSlot =
    variant === 'sidebar'
      ? (import.meta as unknown as { env?: Record<string, string> }).env
          ?.VITE_ADSENSE_SLOT_SIDEBAR || '1234567890'
      : (import.meta as unknown as { env?: Record<string, string> }).env
          ?.VITE_ADSENSE_SLOT_HORIZONTAL || '0987654321';

  useEffect(() => {
    if (!adsenseClientId || dismissed) return;

    const existingScript = document.querySelector(
      'script[src*="pagead2.googlesyndication.com"]'
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        adsenseClientId
      )}`;
      document.head.appendChild(script);
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignore AdSense push warnings during initial mount
    }
  }, [adsenseClientId, dismissed]);

  if (dismissed) return null;

  // Contextual Health / Lab Partner Selection based on scanned medicines
  const medText = (prescription?.medicines || [])
    .map((m) => `${m.name} ${m.genericComposition} ${m.purpose}`.toLowerCase())
    .join(' ');

  const isDiabetesRx =
    medText.includes('metformin') ||
    medText.includes('glycomet') ||
    medText.includes('glimepiride') ||
    medText.includes('sugar') ||
    medText.includes('diabetes');

  const isCardiacRx =
    medText.includes('telma') ||
    medText.includes('telmisartan') ||
    medText.includes('atorva') ||
    medText.includes('rosuvas') ||
    medText.includes('ecosprin') ||
    medText.includes('aspirin') ||
    medText.includes('cholesterol') ||
    medText.includes('blood pressure');

  const contextualOffer = isDiabetesRx
    ? {
        partner: 'Tata 1mg Labs · Sponsored Health Checkup',
        title: 'HbA1c + Fasting Blood Sugar Home Test Package',
        subtitle:
          'Recommended for patients taking daily diabetes medicines. Free doorstep sample collection & NABL-certified report.',
        price: '₹299',
        mrp: '₹750',
        cta: 'Book Home Test',
        url: 'https://www.1mg.com/labs?utm_source=verimed_app&utm_medium=contextual_ad',
      }
    : isCardiacRx
      ? {
          partner: 'Apollo 24|7 Diagnostics · Sponsored Health Checkup',
          title: 'Complete Heart & Lipid Profile Blood Test (Home Pickup)',
          subtitle:
            'Recommended for blood pressure & cholesterol regimens. Includes Total Cholesterol, Triglycerides, HDL/LDL & ECG.',
          price: '₹499',
          mrp: '₹1,200',
          cta: 'Book Heart Checkup',
          url: 'https://www.apollo247.com/lab-tests?utm_source=verimed_app&utm_medium=contextual_ad',
        }
      : {
          partner: 'Tata 1mg & Thyrocare · Sponsored Senior Care Offer',
          title: 'Full Body Senior Citizen Health Checkup (65+ Tests at Home)',
          subtitle:
            'Includes Blood Sugar, Kidney, Liver, Thyroid & Vitamin D/B12 screening with free home sample collection.',
          price: '₹599',
          mrp: '₹1,499',
          cta: 'View Partner Offer',
          url: 'https://www.1mg.com/labs?utm_source=verimed_app&utm_medium=sponsored_banner',
        };

  if (adsenseClientId) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-3 relative">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          <span>Sponsored Advertisement</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Dismiss advertisement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <ins
          className="adsbygoogle block"
          style={{ display: 'block' }}
          data-ad-client={adsenseClientId}
          data-ad-slot={adsenseSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {contextualOffer.partner}
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Hide sponsored offer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-900 leading-snug">
            {contextualOffer.title}
          </h3>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {contextualOffer.subtitle}
          </p>
        </div>

        <div className="pt-1 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-sm font-bold text-teal-800">
              {contextualOffer.price}
            </span>
            <span className="font-mono text-[11px] text-slate-400 line-through">
              {contextualOffer.mrp}
            </span>
          </div>

          <a
            href={contextualOffer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[34px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <span>{contextualOffer.cta}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
          <HeartPulse className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {contextualOffer.partner}
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            {contextualOffer.title}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {contextualOffer.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
        <div className="text-right">
          <div className="font-mono text-base font-bold text-teal-800">
            {contextualOffer.price}
          </div>
          <div className="font-mono text-[11px] text-slate-400 line-through">
            MRP {contextualOffer.mrp}
          </div>
        </div>

        <a
          href={contextualOffer.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <span>{contextualOffer.cta}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label="Dismiss sponsored banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
