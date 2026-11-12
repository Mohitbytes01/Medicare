import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  IndianRupee,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  MedicineCategoryId,
  PrescriptionVerificationResult,
  StoreMedicineItem,
  SupportedLanguage,
} from '../types/prescription';
import { ProductVisualPreview } from './ProductVisualPreview';
import { SEOManager } from './SEOManager';

interface MedicineStoreViewProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedCategory: MedicineCategoryId;
  onCategoryChange: (cat: MedicineCategoryId) => void;
  basket: StoreMedicineItem[];
  onToggleBasketItem: (item: StoreMedicineItem) => void;
  onClearBasket: () => void;
  onOpenBasketPage: () => void;
  onOpenPrescriptionScanner: () => void;
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

const CATEGORIES: Array<{ id: MedicineCategoryId; label: string }> = [
  { id: 'all', label: 'All Products & Medicines' },
  { id: 'personal_hygiene', label: 'Diapers, Sanitary Pads & Wipes' },
  { id: 'antiseptic_skin', label: 'Dettol, Medicated Soaps & First Aid' },
  { id: 'diabetes', label: 'Diabetes (Sugar)' },
  { id: 'cardiac', label: 'BP & Heart' },
  { id: 'acidity', label: 'Acidity & Gas' },
  { id: 'fever_pain', label: 'Fever & Pain' },
  { id: 'vitamins', label: 'Vitamins & Calcium' },
  { id: 'thyroid', label: 'Thyroid Care' },
  { id: 'antibiotics', label: 'Antibiotics' },
];

export const MedicineStoreView: React.FC<MedicineStoreViewProps> = ({
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  onCategoryChange,
  basket,
  onToggleBasketItem,
  onClearBasket,
  onOpenBasketPage,
  onOpenPrescriptionScanner,
  onApplyBasketAsPrescription,
  onSaveOrderCheckout,
  language,
  patientName,
}) => {
  const [medicines, setMedicines] = useState<StoreMedicineItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBuildingBasketAudit, setIsBuildingBasketAudit] =
    useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedCategory !== 'all') params.set('category', selectedCategory);

      fetch(`/api/medicines/search?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : { medicines: [] }))
        .then((data) => {
          if (active && Array.isArray(data.medicines)) {
            setMedicines(data.medicines);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory]);

  const isInBasket = (id: string) => basket.some((item) => item.id === id);

  // Compute live basket totals & instant interaction check
  const basketMrpTotal = basket.reduce((sum, m) => sum + m.mrp, 0);
  const basketLowestTotal = basket.reduce((sum, m) => sum + m.lowestPrice, 0);
  const basketJanAushadhiTotal = basket.reduce(
    (sum, m) => sum + m.janAushadhiGenericPrice,
    0
  );
  const basketSavings = Math.max(0, basketMrpTotal - basketLowestTotal);

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

  const handleOpenBasketInTab = async (
    targetTab: 'schedule' | 'safety' | 'prices'
  ) => {
    if (basket.length === 0 || isBuildingBasketAudit) return;
    setIsBuildingBasketAudit(true);
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
      setIsBuildingBasketAudit(false);
    }
  };

  return (
    <div className="space-y-6">
      <SEOManager
        activeTab="store"
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        medicines={medicines}
      />
      {/* Storefront Hero Banner: Direct Search + Prescription Upload Option */}
      <section className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-teal-700">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                India&apos;s Multi-Pharmacy Medicine &amp; Essentials Store
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
              Compare Live Prices Across Tata 1mg, PharmEasy, Netmeds &amp; Apollo
            </h1>
          </div>

          <button
            type="button"
            onClick={onOpenPrescriptionScanner}
            className="hidden sm:inline-flex min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold items-center gap-1.5 transition-colors shrink-0 self-start sm:self-center cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Scan Doctor&apos;s Prescription</span>
          </button>
        </div>

        {/* Prominent Medicine Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search medicines, pads, diapers, Dettol, soaps, Dolo 650..."
            className="w-full min-h-[42px] sm:min-h-[46px] pl-10 pr-9 py-2 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={`min-h-[32px] sm:min-h-[36px] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Comparison Basket & Live Drug-Interaction Check */}
      {basket.length > 0 && (
        <section className="bg-white border-2 border-teal-700 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    My Medicine Comparison Basket ({basket.length}{' '}
                    {basket.length === 1 ? 'Medicine' : 'Medicines'})
                  </h2>
                  <button
                    type="button"
                    onClick={onClearBasket}
                    className="text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1 underline cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Basket</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Compare the combined bill for all selected medicines or check if they are safe to take together.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="text-right">
                <div className="text-[11px] font-semibold text-slate-500">
                  Lowest Combined Bill
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-lg font-bold text-teal-800">
                    ₹{basketLowestTotal.toFixed(0)}
                  </span>
                  <span className="font-mono text-xs text-slate-400 line-through">
                    MRP ₹{basketMrpTotal.toFixed(0)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    (Save ₹{basketSavings.toFixed(0)})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Jan Aushadhi Generic Total: ₹{basketJanAushadhiTotal.toFixed(0)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenBasketPage}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Open Basket Page</span>
                </button>

                <button
                  type="button"
                  disabled={isBuildingBasketAudit}
                  onClick={() => handleOpenBasketInTab('safety')}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-teal-700" />
                  <span>Full Safety &amp; Schedule</span>
                </button>
              </div>
            </div>
          </div>

          {/* Selected Medicine Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {basket.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
              >
                <span>{item.name}</span>
                <span className="font-mono text-teal-800 font-bold">
                  ₹{item.lowestPrice.toFixed(0)}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleBasketItem(item)}
                  className="text-slate-400 hover:text-red-600 cursor-pointer"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          {/* Live Drug-Interaction Check Banner inside Basket */}
          {basket.length >= 2 && (
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                hasBleedingClash || hasClopidogrelClash
                  ? 'bg-red-50 border-red-200 text-red-950'
                  : hasBpNsaidClash || hasThyroidCalciumGap
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {hasBleedingClash || hasClopidogrelClash ? (
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : hasBpNsaidClash || hasThyroidCalciumGap ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-bold">
                    {hasBleedingClash
                      ? language === 'bn'
                        ? 'সতর্কতা: ইকোস্প্রিন ৭৫ এবং ব্যথার ওষুধ (ব্রুফেন/জিরোডল) একসাথে খাবেন না — পেটে রক্তক্ষরণের ঝুঁকি!'
                        : language === 'hi'
                          ? 'चेतावनी: इकोस्प्रिन 75 और दर्द की दवा (ब्रूफेन/ज़ेरोडोल) एक साथ न लें — पेट में रक्तस्राव का खतरा!'
                          : 'High Risk Warning: Ecosprin 75 + Painkiller (Brufen/Zerodol) can cause stomach bleeding!'
                      : hasClopidogrelClash
                        ? language === 'bn'
                          ? 'সতর্কতা: ক্লোপিলেট ৭৫-এর সাথে ওমেজ ২০ খাবেন না — এটি রক্ত পাতলা করার ক্ষমতা কমিয়ে দেয়।'
                          : language === 'hi'
                            ? 'चेतावनी: क्लोपिलेट 75 के साथ ओमेज़ 20 न लें — यह खून पतला करने के असर को कम करता है।'
                            : 'High Risk Warning: Omez 20 reduces the effectiveness of Clopilet 75. Use Pan 40 instead.'
                        : hasBpNsaidClash
                          ? 'Caution: Painkillers like Brufen/Zerodol can weaken BP medicines (Telma).'
                          : hasThyroidCalciumGap
                            ? 'Timing Tip: Keep at least a 4-hour gap between Thyronorm and Shelcal 500.'
                            : 'Safety Check Passed: These medicines in your basket have no major conflicts.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenBasketInTab('safety')}
                className="font-bold underline shrink-0 self-end sm:self-center cursor-pointer"
              >
                View Details &amp; Audio
              </button>
            </div>
          )}
        </section>
      )}

      {/* Medicine Cards Grid */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2">
          <Loader2 className="w-6 h-6 text-teal-700 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">
            Comparing live prices across Tata 1mg, PharmEasy, Netmeds &amp; Apollo 24|7...
          </p>
        </div>
      ) : medicines.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-bold text-slate-900">
            No medicines matched your filter.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchQueryChange('');
              onCategoryChange('all');
            }}
            className="min-h-[38px] px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold cursor-pointer"
          >
            Show All Popular Medicines
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {medicines.map((med) => {
            const added = isInBasket(med.id);
            const discountOffMrp = Math.round(
              Math.max(0, ((med.mrp - med.lowestPrice) / Math.max(1, med.mrp)) * 100)
            );

            return (
              <article
                key={med.id}
                className={`bg-white rounded-2xl border p-2.5 sm:p-4 flex flex-col justify-between gap-2.5 sm:gap-3 transition-all min-w-0 ${
                  added
                    ? 'border-teal-700 ring-1 ring-teal-700/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top: Interactive Product Studio Photo + Medicine Name + Salt Composition */}
                <div className="space-y-2 min-w-0">
                  <ProductVisualPreview
                    product={med}
                    size="card"
                    discountPercent={discountOffMrp}
                  />

                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {med.name}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                      {med.packSize} · {med.manufacturer}
                    </p>
                  </div>

                  <div className="hidden sm:block p-2 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                    <div className="text-[11px] font-semibold text-slate-800 truncate">
                      Salt: <span className="font-normal text-slate-600">{med.genericComposition}</span>
                    </div>
                    <div className="text-[11px] text-teal-800 font-medium truncate">
                      {med.purpose}
                    </div>
                  </div>

                  {/* Cheapest Store Highlight */}
                  <div className="flex items-baseline justify-between gap-1 pt-0.5">
                    <div className="min-w-0">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700 truncate">
                        Best: {med.lowestPlatformName}
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-mono text-sm sm:text-lg font-bold text-slate-900">
                          ₹{med.lowestPrice.toFixed(0)}
                        </span>
                        <span className="font-mono text-[10px] sm:text-xs text-slate-400 line-through">
                          ₹{med.mrp.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {discountOffMrp > 0 && (
                      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold shrink-0">
                        {discountOffMrp}% OFF
                      </span>
                    )}
                  </div>

                  {/* All 4 Stores Side-by-Side Comparison (Compact on Mobile, Full on Desktop) */}
                  <div className="grid grid-cols-2 gap-1 pt-0.5">
                    {med.pharmacyQuotes.map((q) => (
                      <a
                        key={q.platformId}
                        href={q.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-1.5 sm:px-2 py-1 rounded-lg border text-[10px] sm:text-xs flex items-center justify-between gap-1 transition-colors min-w-0 ${
                          q.isLowestPrice
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{q.platformName.replace(' 24|7', '').replace('Tata ', '')}</span>
                        <span className="font-mono font-semibold shrink-0">
                          ₹{q.discountedPrice.toFixed(0)}
                        </span>
                      </a>
                    ))}
                  </div>

                  {/* Cheaper Same-Salt Substitute & Govt. Jan Aushadhi Generic */}
                  <div className="px-2 py-1.5 rounded-lg bg-teal-50/60 border border-teal-200/80 flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
                    <span className="font-medium text-teal-950 truncate">
                      Generic: ₹{med.janAushadhiGenericPrice.toFixed(0)}
                    </span>
                    <span className="shrink-0 font-bold text-teal-800">
                      -{med.maxSavingsPercent}%
                    </span>
                  </div>
                </div>

                {/* Card Footer: Add to Basket + Direct Buy Cheapest */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleBasketItem(med)}
                    className={`min-h-[34px] sm:min-h-[38px] px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      added
                        ? 'bg-teal-50 border border-teal-700 text-teal-800'
                        : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="w-3 h-3 text-teal-700 shrink-0" />
                        <span className="truncate">Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 shrink-0" />
                        <span className="truncate">Basket</span>
                      </>
                    )}
                  </button>

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
                          itemsSummary: `${med.name} (x1)`,
                          itemIdsCsv: `${med.id}:1`,
                          itemCount: 1,
                          totalMrp: med.mrp,
                          totalPaid: med.lowestPrice,
                          totalSaved: Math.max(0, med.mrp - med.lowestPrice),
                        });
                      }
                    }}
                    className="min-h-[34px] sm:min-h-[38px] px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="truncate">Buy ₹{med.lowestPrice.toFixed(0)}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 hidden sm:inline" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Semantic SEO Footer: Popular Medicine Searches & Frequently Asked Questions */}
      <footer
        aria-label="Online Medicine Price Comparison Information & Popular Searches"
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 mt-8"
      >
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-slate-900">
            Popular Medicine &amp; Healthcare Searches in India
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              'Dolo 650',
              'Telma 40',
              'Glycomet-GP 2',
              'Pan-D',
              'Shelcal 500',
              'Whisper Ultra Clean',
              'Stayfree Secure',
              'Friends Adult Diapers',
              'MamyPoko Pants',
              'Himalaya Baby Wipes',
              'Dettol Liquid',
              'Tetmosol Soap',
              'Ketostar Soap',
              'Thyronorm 50mcg',
              'Augmentin 625',
              'Electral ORS',
            ].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  onCategoryChange('all');
                  onSearchQueryChange(term);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200/80 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
              >
                {term} Price
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-600 leading-relaxed">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900">
              Compare 4 Top Indian Online Pharmacies
            </h3>
            <p>
              VeriMed checks real-time discounted rates across Tata 1mg, PharmEasy, Netmeds, and Apollo 24|7 alongside PMBJP Government Jan Aushadhi generic benchmarks so families never overpay for daily medicines.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-900">
              AI Prescription Reader in English, বাংলা &amp; हिन्दी
            </h3>
            <p>
              Upload a photo of your doctor&apos;s handwritten slip to automatically generate your morning, afternoon, and night dosage schedule with spoken voice instructions in Bengali, Hindi, and English.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-900">
              Automatic Drug-Interaction Safety Check
            </h3>
            <p>
              Add multiple medicines to your basket or scan a prescription to detect high-risk drug interactions (such as blood thinners combined with NSAID painkillers) before you buy.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
