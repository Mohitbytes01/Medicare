import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  IndianRupee,
  Loader2,
  Minus,
  Plus,
  ShieldAlert,
  ShoppingBag,
  Store,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  PrescriptionVerificationResult,
  StoreMedicineItem,
  SupportedLanguage,
} from '../types/prescription';
import { ProductVisualPreview } from './ProductVisualPreview';

export interface BasketItemWithQty {
  medicine: StoreMedicineItem;
  quantity: number;
}

interface BasketViewProps {
  basket: StoreMedicineItem[];
  quantities: Record<string, number>;
  onUpdateQuantity: (medId: string, delta: number) => void;
  onRemoveItem: (medId: string) => void;
  onClearBasket: () => void;
  onBackToStore: () => void;
  onOpenScanner: () => void;
  onApplyBasketAsPrescription: (
    result: PrescriptionVerificationResult,
    targetTab: 'schedule' | 'safety' | 'prices'
  ) => void;
  onSaveOrderCheckout?: (summary: {
    platformId: '1mg' | 'pharmeasy' | 'netmeds' | 'apollo';
    platformName: string;
    itemsSummary: string;
    itemIdsCsv: string;
    itemCount: number;
    totalMrp: number;
    totalPaid: number;
    totalSaved: number;
  }) => void;
  language: SupportedLanguage;
  patientName?: string;
}

export const BasketView: React.FC<BasketViewProps> = ({
  basket,
  quantities,
  onUpdateQuantity,
  onRemoveItem,
  onClearBasket,
  onBackToStore,
  onOpenScanner,
  onApplyBasketAsPrescription,
  onSaveOrderCheckout,
  language,
  patientName,
}) => {
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

  const getQty = (id: string) => Math.max(1, quantities[id] || 1);

  if (basket.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">
            Your Medicine Basket is Empty
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Add medicines from the store to compare the total bill across Tata 1mg, PharmEasy, Netmeds, and Apollo 24|7, or upload a prescription photo.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBackToStore}
            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <span>Browse Medicine Store</span>
          </button>
          <button
            type="button"
            onClick={onOpenScanner}
            className="min-h-[42px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-teal-700" />
            <span>Scan Prescription Photo</span>
          </button>
        </div>
      </section>
    );
  }

  // Compute totals across all 4 platforms taking quantity into account
  const totalMrp = basket.reduce(
    (sum, m) => sum + m.mrp * getQty(m.id),
    0
  );
  const totalSmartSplit = basket.reduce(
    (sum, m) => sum + m.lowestPrice * getQty(m.id),
    0
  );
  const totalJanAushadhi = basket.reduce(
    (sum, m) => sum + m.janAushadhiGenericPrice * getQty(m.id),
    0
  );
  const totalSubstitute = basket.reduce(
    (sum, m) => sum + m.substitutePrice * getQty(m.id),
    0
  );

  const platformSummary: Array<{
    platformId: '1mg' | 'pharmeasy' | 'netmeds' | 'apollo';
    platformName: string;
    deliveryTag: string;
    totalPrice: number;
    savings: number;
    primaryLink: string;
  }> = (
    [
      {
        platformId: '1mg',
        platformName: 'Tata 1mg',
        deliveryTag: 'Next-day delivery',
      },
      {
        platformId: 'pharmeasy',
        platformName: 'PharmEasy',
        deliveryTag: '24–48 hr delivery',
      },
      {
        platformId: 'netmeds',
        platformName: 'Netmeds',
        deliveryTag: 'Pan-India delivery',
      },
      {
        platformId: 'apollo',
        platformName: 'Apollo 24|7',
        deliveryTag: 'Express 2-hr delivery',
      },
    ] as const
  ).map((store) => {
    const totalPrice = basket.reduce((sum, med) => {
      const q = med.pharmacyQuotes.find((x) => x.platformId === store.platformId);
      const unitPrice = q ? q.discountedPrice : med.lowestPrice;
      return sum + unitPrice * getQty(med.id);
    }, 0);

    const basketNames = basket
      .map((m) => `${m.name} (x${getQty(m.id)})`)
      .join(', ');
    const totalQty = basket.reduce((sum, m) => sum + getQty(m.id), 0);

    const firstMedQuery = basket[0]?.name
      ? basket[0].name
          .replace(/\([^)]*\)/g, '')
          .replace(
            /^(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|oint(?:ment)?|drops?|gel|cream)\.?\s+/i,
            ''
          )
          .replace(/\b(?:pack of|strip of|\d+\s*tablets?|\d+\s*capsules?|\d+['’]?s)\b/gi, '')
          .replace(/[^a-zA-Z0-9\s-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : 'Medicine';
    const encQuery = encodeURIComponent(firstMedQuery || 'Medicine');
    const apolloSlug = (firstMedQuery || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const directStoreUrl =
      store.platformId === 'pharmeasy'
        ? `https://pharmeasy.in/search/all?name=${encQuery}`
        : store.platformId === 'netmeds'
        ? `https://www.netmeds.com/products?q=${encQuery}`
        : store.platformId === 'apollo'
        ? apolloSlug
          ? `https://www.apollopharmacy.in/search-medicines/${apolloSlug}`
          : `https://www.apollo247.com/specialties/search?q=${encQuery}`
        : `https://www.1mg.com/search/all?name=${encQuery}`;

    return {
      ...store,
      totalPrice: Number(totalPrice.toFixed(2)),
      savings: Number(Math.max(0, totalMrp - totalPrice).toFixed(2)),
      primaryLink: directStoreUrl,
    };
  });

  const cheapestSingleStore = platformSummary.reduce(
    (min, s) => (s.totalPrice < min.totalPrice ? s : min),
    platformSummary[0]
  );

  // Instant Drug Interaction Safety Check across basket items
  const basketText = basket
    .map((m) => `${m.name} ${m.genericComposition}`.toLowerCase())
    .join(' ');
  const hasBleedingClash =
    (basketText.includes('ecosprin') || basketText.includes('aspirin')) &&
    (basketText.includes('brufen') ||
      basketText.includes('ibuprofen') ||
      basketText.includes('zerodol') ||
      basketText.includes('aceclofenac'));
  const hasClopidogrelClash =
    (basketText.includes('clopilet') || basketText.includes('clopidogrel')) &&
    (basketText.includes('omez') || basketText.includes('omeprazole'));
  const hasBpNsaidClash =
    (basketText.includes('telma') || basketText.includes('telmisartan')) &&
    (basketText.includes('brufen') ||
      basketText.includes('ibuprofen') ||
      basketText.includes('zerodol'));
  const hasThyroidCalciumGap =
    (basketText.includes('thyronorm') || basketText.includes('levothyroxine')) &&
    (basketText.includes('shelcal') || basketText.includes('calcium'));

  const handleOpenInTab = async (
    targetTab: 'schedule' | 'safety' | 'prices'
  ) => {
    if (isGeneratingSchedule) return;
    setIsGeneratingSchedule(true);
    try {
      const res = await fetch('/api/medicines/basket-to-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: basket,
          patientName: patientName || 'Verified Patient',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onApplyBasketAsPrescription(data, targetTab);
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar of Basket Page */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBackToStore}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1.5 cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Medicine Store</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            My Medicine Basket ({basket.length}{' '}
            {basket.length === 1 ? 'Medicine' : 'Medicines'})
          </h1>
          <p className="text-xs text-slate-600">
            Review your selected medicines, adjust quantities, check drug interactions, and compare the full bill across all 4 online pharmacies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            disabled={isGeneratingSchedule}
            onClick={() => handleOpenInTab('schedule')}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isGeneratingSchedule ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CalendarClock className="w-3.5 h-3.5" />
            )}
            <span>View Daily Schedule &amp; Voice Guide</span>
          </button>

          <button
            type="button"
            onClick={onClearBasket}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Basket</span>
          </button>
        </div>
      </section>

      {/* Automatic Drug Interaction Safety Banner */}
      <section
        className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          hasBleedingClash || hasClopidogrelClash
            ? 'bg-red-50/90 border-red-200 text-red-950'
            : hasBpNsaidClash || hasThyroidCalciumGap
              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-start gap-3">
          {hasBleedingClash || hasClopidogrelClash ? (
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          ) : hasBpNsaidClash || hasThyroidCalciumGap ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h2 className="text-sm font-bold">
              {hasBleedingClash
                ? language === 'bn'
                  ? 'সতর্কতা: ইকোস্প্রিন ৭৫ এবং ব্যথার ওষুধ (ব্রুফেন/জিরোডল) একসাথে খাবেন না — পেটে রক্তক্ষরণের ঝুঁকি!'
                  : language === 'hi'
                    ? 'चेतावनी: इकोस्प्रिन 75 और दर्द की दवा (ब्रूफेन/ज़ेरोडोल) एक साथ न लें — पेट में रक्तस्राव का खतरा!'
                    : 'High Risk Interaction: Ecosprin 75 + Painkiller (Brufen/Zerodol) can cause stomach bleeding!'
                : hasClopidogrelClash
                  ? language === 'bn'
                    ? 'সতর্কতা: ক্লোপিলেট ৭৫-এর সাথে ওমেজ ২০ খাবেন না — এটি রক্ত পাতলা করার ক্ষমতা কমিয়ে দেয়।'
                    : language === 'hi'
                      ? 'चेतावनी: क्लोपिलेट 75 के साथ ओमेज़ 20 न लें — यह खून पतला करने के असर को कम करता है।'
                      : 'High Risk Interaction: Omez 20 reduces the effectiveness of Clopilet 75. Use Pan 40 instead.'
                  : hasBpNsaidClash
                    ? 'Caution: Painkillers like Brufen/Zerodol can weaken BP medicines (Telma) and strain kidneys.'
                    : hasThyroidCalciumGap
                      ? 'Timing Advisory: Keep at least a 4-hour gap between Thyronorm (morning) and Shelcal 500 (afternoon).'
                      : 'Safety Check Passed: No conflicting drug interactions found among the medicines in your basket.'}
            </h2>
            <p className="text-xs opacity-90">
              Want to hear full instructions in English, বাংলা, or हिन्दी? Open the detailed Safety Check.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isGeneratingSchedule}
          onClick={() => handleOpenInTab('safety')}
          className="min-h-[38px] px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold shrink-0 self-start sm:self-center cursor-pointer hover:bg-slate-50"
        >
          Open Full Safety Check
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Medicines List with Quantity Controls */}
        <div className="lg:col-span-7 space-y-3">
          {basket.map((med) => {
            const qty = getQty(med.id);
            const lineLowest = med.lowestPrice * qty;
            const lineMrp = med.mrp * qty;

            return (
              <div
                key={med.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <ProductVisualPreview product={med} size="thumb" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {med.categoryLabel}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {med.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {med.genericComposition} · {med.packSize}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(med.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    title="Remove from basket"
                    aria-label={`Remove ${med.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity + Line Price + Direct Store Links */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Strips / Packs:
                    </span>
                    <div className="inline-flex items-center border border-slate-300 rounded-xl bg-slate-50">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(med.id, -1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200/70 rounded-l-xl cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 font-mono text-xs font-bold text-slate-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(med.id, 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200/70 rounded-r-xl cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-teal-800">
                        ₹{lineLowest.toFixed(0)}{' '}
                        <span className="text-[11px] font-sans font-semibold text-slate-500">
                          on {med.lowestPlatformName}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 line-through">
                        MRP ₹{lineMrp.toFixed(0)}
                      </div>
                    </div>

                    <a
                      href={med.lowestDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (onSaveOrderCheckout) {
                          const pId =
                            med.pharmacyQuotes.find(
                              (q) => q.platformName === med.lowestPlatformName
                            )?.platformId || '1mg';
                          onSaveOrderCheckout({
                            platformId: pId,
                            platformName: med.lowestPlatformName,
                            itemsSummary: `${med.name} (x${qty})`,
                            itemIdsCsv: `${med.id}:${qty}`,
                            itemCount: qty,
                            totalMrp: lineMrp,
                            totalPaid: lineLowest,
                            totalSaved: Math.max(0, lineMrp - lineLowest),
                          });
                        }
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <span>Buy</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onBackToStore}
            className="w-full min-h-[44px] py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-teal-700 text-xs font-bold text-teal-800 hover:bg-teal-50/40 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add More Medicines from Store</span>
          </button>
        </div>

        {/* Right 5 Cols: 4-Pharmacy Full Basket Comparison Summary */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-teal-700" />
                <h2 className="text-base font-bold text-slate-900">
                  Full Basket Price Comparison
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                MRP Total: ₹{totalMrp.toFixed(0)}
              </span>
            </div>

            {/* 4 Online Pharmacies Full Bill List */}
            <div className="space-y-2.5">
              {platformSummary.map((store) => {
                const isBest =
                  store.platformId === cheapestSingleStore.platformId;
                return (
                  <div
                    key={store.platformId}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      isBest
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {store.platformName}
                        </span>
                        {isBest && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-700 text-white">
                            Lowest Full Bill
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {store.deliveryTag} · Save ₹{store.savings.toFixed(0)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-base font-bold text-slate-900">
                        ₹{store.totalPrice.toFixed(0)}
                      </span>
                      <a
                        href={store.primaryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (onSaveOrderCheckout) {
                            const itemsSummary = basket
                              .map((m) => `${m.name} (x${getQty(m.id)})`)
                              .join(', ');
                            const itemIdsCsv = basket
                              .map((m) => `${m.id}:${getQty(m.id)}`)
                              .join(',');
                            const itemCount = basket.reduce(
                              (sum, m) => sum + getQty(m.id),
                              0
                            );
                            onSaveOrderCheckout({
                              platformId: store.platformId,
                              platformName: store.platformName,
                              itemsSummary,
                              itemIdsCsv,
                              itemCount,
                              totalMrp,
                              totalPaid: store.totalPrice,
                              totalSaved: store.savings,
                            });
                          }
                        }}
                        className="min-h-[34px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <span>Order</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Smart Split + Generic Benchmarks */}
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  Smart Split Cart (Cheapest per medicine):
                </span>
                <span className="font-mono font-bold text-teal-900">
                  ₹{totalSmartSplit.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  Same-Salt Branded Substitutes Total:
                </span>
                <span className="font-mono font-bold text-teal-900">
                  ₹{totalSubstitute.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-teal-200/80">
                <span className="font-bold text-teal-950">
                  Govt. Jan Aushadhi Generic Total:
                </span>
                <span className="font-mono text-sm font-bold text-emerald-800">
                  ₹{totalJanAushadhi.toFixed(0)}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isGeneratingSchedule}
              onClick={() => handleOpenInTab('prices')}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isGeneratingSchedule ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
              <span>Proceed to Full Multi-Store Checkout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
