import React, { useState } from 'react';
import { StoreMedicineItem } from '../types/prescription';
import sanitaryPadsImg from '../assets/images/sanitary_pads_pack_1790943924808.jpg';
import diapersWipesImg from '../assets/images/diapers_wipes_pack_1790943939253.jpg';
import antisepticBottleImg from '../assets/images/dettol_antiseptic_bottle_1790943958680.jpg';
import medicatedSoapsImg from '../assets/images/medicated_soap_bars_1790943971119.jpg';
import tabletBlisterImg from '../assets/images/tablet_blister_strips_1790943983374.jpg';

const STUDIO_PHOTOS = {
  pads: sanitaryPadsImg,
  diapers_wipes: diapersWipesImg,
  antiseptic: antisepticBottleImg,
  soaps: medicatedSoapsImg,
  tablets: tabletBlisterImg,
} as const;

export function getFallbackStudioPhotoUrl(product: StoreMedicineItem): string {
  const text = `${product.id} ${product.name} ${product.categoryLabel} ${product.packSize}`.toLowerCase();

  if (
    text.includes('whisper') ||
    text.includes('stayfree') ||
    text.includes('sofy') ||
    text.includes('sanitary') ||
    text.includes('pad')
  ) {
    return STUDIO_PHOTOS.pads;
  }

  if (
    text.includes('diaper') ||
    text.includes('mamypoko') ||
    text.includes('pampers') ||
    text.includes('friends') ||
    text.includes('wipe') ||
    text.includes('himalaya')
  ) {
    return STUDIO_PHOTOS.diapers_wipes;
  }

  if (
    text.includes('soap') ||
    text.includes('tetmosol') ||
    text.includes('ketostar') ||
    text.includes('acnestar') ||
    text.includes('bar')
  ) {
    return STUDIO_PHOTOS.soaps;
  }

  if (
    text.includes('dettol') ||
    text.includes('savlon') ||
    text.includes('betadine') ||
    text.includes('ointment') ||
    text.includes('hansaplast') ||
    text.includes('band-aid') ||
    text.includes('electral') ||
    text.includes('ors') ||
    product.category === 'antiseptic_skin'
  ) {
    return STUDIO_PHOTOS.antiseptic;
  }

  return STUDIO_PHOTOS.tablets;
}

interface ProductVisualPreviewProps {
  product: StoreMedicineItem;
  size?: 'card' | 'thumb';
  discountPercent?: number;
}

export const ProductVisualPreview: React.FC<ProductVisualPreviewProps> = ({
  product,
  size = 'card',
  discountPercent = 0,
}) => {
  const fallbackUrl = getFallbackStudioPhotoUrl(product);
  const primaryRealUrl =
    product.imageUrl ||
    `/api/product-image?id=${encodeURIComponent(product.id)}&q=${encodeURIComponent(product.name)}`;

  const [imgSrc, setImgSrc] = useState<string>(primaryRealUrl);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  const handleImgError = () => {
    if (!usingFallback) {
      setUsingFallback(true);
      setImgSrc(fallbackUrl);
    }
  };

  if (size === 'thumb') {
    return (
      <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white p-1.5 overflow-hidden relative shrink-0 group flex items-center justify-center">
        <img
          src={imgSrc}
          alt={product.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={handleImgError}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-24 sm:h-36 rounded-xl border border-slate-200/90 bg-white p-2 sm:p-2.5 overflow-hidden group flex items-center justify-center">
      <img
        src={imgSrc}
        alt={product.name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={handleImgError}
        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
      />

      {/* Top Left: Category / Rx Badge */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
        <span className="px-1.5 py-0.5 rounded bg-slate-900/85 backdrop-blur-xs text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white shadow-2xs truncate max-w-[110px] sm:max-w-none">
          {product.categoryLabel}
        </span>
        {product.prescriptionRequired && (
          <span className="px-1 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-2xs">
            Rx
          </span>
        )}
      </div>

      {/* Top Right: Discount Badge */}
      {discountPercent > 0 && (
        <div className="absolute top-1.5 right-1.5">
          <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white font-mono text-[9px] sm:text-[10px] font-bold shadow-2xs">
            {discountPercent}% OFF
          </span>
        </div>
      )}

      {/* Bottom Right Pack Size Pill */}
      <div className="hidden sm:block absolute bottom-1.5 right-2">
        <span className="px-1.5 py-0.5 rounded bg-slate-100/95 border border-slate-200 text-[10px] font-mono font-semibold text-slate-700">
          {product.packSize}
        </span>
      </div>
    </div>
  );
};
