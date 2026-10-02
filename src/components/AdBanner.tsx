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
  const adsterraSmartlinkUrl = (
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_ADSTERRA_SMARTLINK_URL ||
    'https://asiafilm.org/4/1aa8f7a6481d1f8762a00d2cfe07f570'
  ).trim();
  const adsenseSlot =
    variant === 'sidebar'
      ? (import.meta as unknown as { env?: Record<string, string> }).env
          ?.VITE_ADSENSE_SLOT_SIDEBAR || '1234567890'
      : (import.meta as unknown as { env?: Record<string, string> }).env
          ?.VITE_ADSENSE_SLOT_HORIZONTAL || '0987654321';

  useEffect(() => {
    if (dismissed) return;

    // Load Adsterra Native Banner (#3) when horizontal banner is mounted
    if (variant === 'horizontal') {
      const nativeSrc =
        'https://bauval.org/21/1974d1c2b5413f77ab4437a704477cd2';
      if (!document.querySelector(`script[src="${nativeSrc}"]`)) {
        const nativeScript = document.createElement('script');
        nativeScript.async = true;
        nativeScript.setAttribute('data-cfasync', 'false');
        nativeScript.src = nativeSrc;
        document.body.appendChild(nativeScript);
      }
    }

    if (!adsenseClientId) return;

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
  }, [adsenseClientId, dismissed, variant]);

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
        partner: 'Sponsored Partner Offer · Health & Wellness',
        title: 'HbA1c + Fasting Blood Sugar Home Checkup Offer',
        subtitle:
          'Recommended for patients taking daily diabetes medicines. View today’s special partner offer & discount.',
        price: '₹299',
        mrp: '₹750',
        cta: 'View Special Offer',
        url: adsterraSmartlinkUrl,
      }
    : isCardiacRx
      ? {
          partner: 'Sponsored Partner Offer · Heart & Wellness',
          title: 'Complete Heart & Lipid Profile Checkup Offer',
          subtitle:
            'Recommended for blood pressure & cholesterol regimens. View today’s special partner offer & discount.',
          price: '₹499',
          mrp: '₹1,200',
          cta: 'View Special Offer',
          url: adsterraSmartlinkUrl,
        }
      : {
          partner: 'Sponsored Advertisement · Special Partner Offer',
          title: 'Full Body Health & Wellness Partner Offer',
          subtitle:
            'Tap below to view today’s sponsored partner promotion and exclusive user deals.',
          price: 'Special',
          mrp: 'Deal',
          cta: 'Open Offer',
          url: adsterraSmartlinkUrl,
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

  const adsterra300x250SrcDoc = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;background:transparent;overflow:hidden;}</style></head><body><script type="text/javascript">atOptions={'key':'08b428238a3eeb25bd294271cb352020','format':'iframe','height':250,'width':300,'params':{}};</script><script type="text/javascript" src="https://bauval.org/22/08b428238a3eeb25bd294271cb352020"></script></body></html>`;

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

        <div className="flex justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
          <iframe
            title="Sponsored Partner Display"
            srcDoc={adsterra300x250SrcDoc}
            width={300}
            height={250}
            scrolling="no"
            className="border-0 max-w-full"
          />
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
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* Adsterra Native Banner (#3) */}
      <div id="container-1974d1c2b5413f77ab4437a704477cd2" />
    </div>
  );
};
