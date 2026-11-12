import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  MessageSquare,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { PrescriptionVerificationResult } from '../types/prescription';

interface PharmacyAggregatorViewProps {
  result: PrescriptionVerificationResult;
}

type PlatformId = '1mg' | 'pharmeasy' | 'netmeds' | 'apollo';

function cleanMedicineQueryName(rawName: string): string {
  const cleaned = rawName
    .replace(/\([^)]*\)/g, '')
    .replace(
      /^(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|oint(?:ment)?|drops?|gel|cream)\.?\s+/i,
      ''
    )
    .replace(/\b(?:pack of|strip of|\d+\s*tablets?|\d+\s*capsules?|\d+['’]?s)\b/gi, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || rawName.trim();
}

const PLATFORMS: Array<{
  id: PlatformId;
  name: 'Tata 1mg' | 'PharmEasy' | 'Netmeds' | 'Apollo 24|7';
  deliveryNote: string;
  homeUrl: string;
  prescriptionUploadUrl: string;
  buildSingleMedUrl: (medName: string) => string;
}> = [
  {
    id: '1mg',
    name: 'Tata 1mg',
    deliveryNote: 'Standard 1-day home delivery',
    homeUrl: 'https://www.1mg.com',
    prescriptionUploadUrl: 'https://www.1mg.com',
    buildSingleMedUrl: (name) =>
      `https://www.1mg.com/search/all?name=${encodeURIComponent(cleanMedicineQueryName(name))}`,
  },
  {
    id: 'pharmeasy',
    name: 'PharmEasy',
    deliveryNote: 'Standard 24–48 hr delivery',
    homeUrl: 'https://pharmeasy.in',
    prescriptionUploadUrl: 'https://pharmeasy.in/online-medicine-order',
    buildSingleMedUrl: (name) =>
      `https://pharmeasy.in/search/all?name=${encodeURIComponent(cleanMedicineQueryName(name))}`,
  },
  {
    id: 'netmeds',
    name: 'Netmeds',
    deliveryNote: 'Pan-India courier delivery',
    homeUrl: 'https://www.netmeds.com',
    prescriptionUploadUrl: 'https://www.netmeds.com',
    buildSingleMedUrl: (name) =>
      `https://www.netmeds.com/products?q=${encodeURIComponent(cleanMedicineQueryName(name))}`,
  },
  {
    id: 'apollo',
    name: 'Apollo 24|7',
    deliveryNote: 'Express 2-hour local pharmacy delivery',
    homeUrl: 'https://www.apollopharmacy.in',
    prescriptionUploadUrl: 'https://www.apollopharmacy.in/upload-prescription',
    buildSingleMedUrl: (name) => {
      const clean = cleanMedicineQueryName(name);
      const slug = clean
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return slug
        ? `https://www.apollopharmacy.in/search-medicines/${slug}`
        : `https://www.apollo247.com/specialties/search?q=${encodeURIComponent(clean)}`;
    },
  },
];

export const PharmacyAggregatorView: React.FC<PharmacyAggregatorViewProps> = ({
  result,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    result.medicines.forEach((m) => {
      init[m.id] = 1;
    });
    return init;
  });

  const getQty = (medId: string) => quantities[medId] ?? 1;

  const updateQty = (medId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[medId] ?? 1;
      const next = Math.max(1, Math.min(10, current + delta));
      return { ...prev, [medId]: next };
    });
  };

  // Compute total bill for all medicines per pharmacy source (accounting for strip quantities)
  const totalMrp = Number(
    result.medicines
      .reduce(
        (sum, med) =>
          sum + (med.pharmacyQuotes[0]?.mrp || 0) * getQty(med.id),
        0
      )
      .toFixed(2)
  );

  const totalJanAushadhi = Number(
    result.medicines
      .reduce(
        (sum, med) =>
          sum + (med.janAushadhiGenericPrice || 0) * getQty(med.id),
        0
      )
      .toFixed(2)
  );

  const storeTotals = PLATFORMS.map((platform) => {
    let totalBill = 0;
    const items: Array<{
      medId: string;
      medName: string;
      cleanQuery: string;
      genericComposition: string;
      packSize: string;
      quantity: number;
      mrp: number;
      unitPrice: number;
      lineTotal: number;
      discountPercent: number;
      deepLink: string;
    }> = [];

    result.medicines.forEach((med) => {
      const quote =
        med.pharmacyQuotes.find((q) => q.platformId === platform.id) ||
        med.pharmacyQuotes[0];
      const qty = getQty(med.id);
      const unitPrice = quote ? quote.discountedPrice : 0;
      const unitMrp = quote ? quote.mrp : 0;
      const lineTotal = Number((unitPrice * qty).toFixed(2));
      totalBill += lineTotal;

      items.push({
        medId: med.id,
        medName: med.name,
        cleanQuery: cleanMedicineQueryName(med.name),
        genericComposition: med.genericComposition,
        packSize: quote?.packSize || '1 Strip',
        quantity: qty,
        mrp: Number((unitMrp * qty).toFixed(2)),
        unitPrice,
        lineTotal,
        discountPercent: quote?.discountPercent || 0,
        deepLink: platform.buildSingleMedUrl(med.name),
      });
    });

    const cleanTotal = Number(totalBill.toFixed(2));
    const totalSaved = Number(Math.max(0, totalMrp - cleanTotal).toFixed(2));
    const savedPercent =
      totalMrp > 0 ? Math.round((totalSaved / totalMrp) * 100) : 0;

    // Direct live pharmacy store URL for ordering
    const primaryCheckoutUrl =
      items.length > 0
        ? platform.buildSingleMedUrl(items[0].cleanQuery)
        : platform.homeUrl;

    return {
      ...platform,
      totalBill: cleanTotal,
      totalSaved,
      savedPercent,
      items,
      primaryCheckoutUrl,
    };
  });

  // Find lowest overall bill
  const lowestBillAmount = Math.min(...storeTotals.map((s) => s.totalBill));
  const bestStore =
    storeTotals.find((s) => s.totalBill === lowestBillAmount) || storeTotals[0];

  const [selectedStoreId, setSelectedStoreId] = useState<PlatformId>(
    bestStore.id
  );
  const [bulkAddedStoreId, setBulkAddedStoreId] = useState<PlatformId | null>(
    null
  );
  const [copiedBundle, setCopiedBundle] = useState(false);

  const activeStore =
    storeTotals.find((s) => s.id === selectedStoreId) || bestStore;

  const isAllAddedForActiveStore = bulkAddedStoreId === activeStore.id;

  const copyStoreMedicineList = (storeId: PlatformId) => {
    const targetStore =
      storeTotals.find((s) => s.id === storeId) || activeStore;
    const summaryText = [
      `VeriMed Prescription Shopping List (${targetStore.name})`,
      ...targetStore.items.map(
        (item, idx) =>
          `${idx + 1}. ${item.cleanQuery} (${item.quantity}x ${item.packSize}) - ₹${item.lineTotal.toFixed(2)}`
      ),
      `Estimated Total on ${targetStore.name}: ₹${targetStore.totalBill.toFixed(2)} (Save ₹${targetStore.totalSaved.toFixed(2)})`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(summaryText)
        .then(() => {
          setCopiedBundle(true);
          setTimeout(() => setCopiedBundle(false), 4000);
        })
        .catch(() => {});
    }
  };

  const handleSelectBundleStore = (storeId: PlatformId) => {
    setSelectedStoreId(storeId);
    setBulkAddedStoreId(storeId);
    copyStoreMedicineList(storeId);

    const cartSection = document.getElementById('one-click-bulk-cart');
    if (cartSection) {
      cartSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleDownloadShoppingList = () => {
    const lines = [
      `VERIMED HEALTH — PRESCRIPTION SHOPPING LIST`,
      `=================================================`,
      `Selected Pharmacy: ${activeStore.name} (${activeStore.homeUrl})`,
      `Patient Name:      ${result.patientName}`,
      `Prescribed By:     ${result.doctorName}`,
      `Date:              ${result.prescriptionDate}`,
      `-------------------------------------------------`,
      `MEDICINES TO ORDER (${activeStore.items.length} Items):`,
      ...activeStore.items.map(
        (item, idx) =>
          `${idx + 1}. ${item.medName} — ${item.quantity}x (${item.packSize}) @ ₹${item.unitPrice.toFixed(2)} = ₹${item.lineTotal.toFixed(2)}\n   Order Link: ${item.deepLink}`
      ),
      `-------------------------------------------------`,
      `Printed Shop MRP Total: ₹${totalMrp.toFixed(2)}`,
      `Total Discount Saved:  -₹${activeStore.totalSaved.toFixed(2)}`,
      `ESTIMATED BILL TOTAL:   ₹${activeStore.totalBill.toFixed(2)}`,
      `=================================================`,
    ];
    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VeriMed_${activeStore.name.replace(/\s+/g, '_')}_List.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMedicines = result.medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genericComposition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Section 1: Total Bill Comparison + Direct External Pharmacy Checkout */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <p className="text-xs font-semibold text-teal-700">
              One-Stop Full Bill Comparison ({result.medicines.length} Medicines)
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Total Prescription Bill From Each Online Pharmacy
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Compare the <strong className="text-slate-900">complete bill total</strong> across Tata 1mg, PharmEasy, Netmeds, and Apollo 24|7 and open the{' '}
              <strong className="text-slate-900">official pharmacy website in a new tab</strong> to order your medicines.
            </p>
          </div>

          {/* Best Single-Store Recommendation + Direct External Redirect Link */}
          <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200 shrink-0 flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <div className="text-xs font-semibold text-teal-800">
                Lowest Full Bill ({bestStore.name})
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-teal-900">
                  ₹{bestStore.totalBill.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-slate-400 line-through">
                  ₹{totalMrp.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-700">
                Save ₹{bestStore.totalSaved.toFixed(2)} ({bestStore.savedPercent}% off MRP)
              </div>
            </div>

            <a
              href={bestStore.primaryCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleSelectBundleStore(bestStore.id)}
              className="min-h-[42px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>Order on {bestStore.name}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        </div>

        {/* 4 Pharmacy Total Bill Comparison Rows */}
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {storeTotals.map((store) => {
            const isCheapestOverall = store.id === bestStore.id;
            const isSelected = store.id === activeStore.id;
            const diffFromBest = Number(
              (store.totalBill - bestStore.totalBill).toFixed(2)
            );

            return (
              <div
                key={store.id}
                onClick={() => setSelectedStoreId(store.id)}
                className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-teal-50/60'
                    : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      {store.name}
                    </span>
                    {isCheapestOverall && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                        <span>Cheapest Total Bill</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    All {result.medicines.length} medicines included · {store.deliveryNote}
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-slate-500">
                      Total Bill on {store.name}
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                      ₹{store.totalBill.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-400 line-through">
                        ₹{totalMrp.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs font-mono tabular-nums">
                      <span className="font-semibold text-emerald-700">
                        Save ₹{store.totalSaved.toFixed(2)} ({store.savedPercent}% off)
                      </span>
                      {!isCheapestOverall && diffFromBest > 0 && (
                        <span className="text-slate-400 ml-1.5">
                          · +₹{diffFromBest.toFixed(2)} vs {bestStore.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={store.primaryCheckoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectBundleStore(store.id);
                    }}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                      isCheapestOverall
                        ? 'bg-teal-700 hover:bg-teal-800 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                    <span>Buy on {store.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Govt Jan Aushadhi Reference Line */}
        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Printed Shop MRP Total for all {result.medicines.length} medicines:{' '}
            <strong className="font-mono text-slate-800">₹{totalMrp.toFixed(2)}</strong>
          </span>
          <span>
            Govt. Jan Aushadhi Generic Salt Total:{' '}
            <strong className="font-mono text-slate-800">
              ₹{totalJanAushadhi.toFixed(2)}
            </strong>
          </span>
        </div>
      </section>

      {/* Section 2: Side-by-Side Medicine Price Matrix + Total Bill Row */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Side-by-Side Bill Breakdown Across All 4 Sources
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Click any price cell to open that medicine directly on the pharmacy website
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine..."
              className="w-full min-h-[38px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                <th className="py-3 px-3">Medicine Name &amp; Strip</th>
                <th className="py-3 px-3 text-right">Printed MRP</th>
                {storeTotals.map((store) => (
                  <th
                    key={store.id}
                    className={`py-3 px-3 text-right whitespace-nowrap ${
                      store.id === bestStore.id
                        ? 'bg-teal-50/80 text-teal-900 font-bold'
                        : ''
                    }`}
                  >
                    <div>{store.name}</div>
                    {store.id === bestStore.id && (
                      <div className="text-[10px] font-semibold text-teal-700">
                        Lowest Total Bill
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredMedicines.map((med, idx) => {
                const qty = getQty(med.id);
                const mrp = (med.pharmacyQuotes[0]?.mrp || 0) * qty;
                const packSize = med.pharmacyQuotes[0]?.packSize || '1 Strip';

                return (
                  <tr key={med.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">
                        {idx + 1}. {med.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {med.genericComposition} · {qty}x ({packSize})
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs text-slate-400 line-through whitespace-nowrap">
                      ₹{mrp.toFixed(2)}
                    </td>

                    {storeTotals.map((store) => {
                      const q = med.pharmacyQuotes.find(
                        (quote) => quote.platformId === store.id
                      );
                      const price = (q ? q.discountedPrice : mrp) * qty;
                      const medUrl = store.buildSingleMedUrl(med.name);
                      return (
                        <td
                          key={store.id}
                          className={`py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                            store.id === bestStore.id
                              ? 'bg-teal-50/40 font-bold text-slate-900'
                              : 'text-slate-700'
                          }`}
                        >
                          <a
                            href={medUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-end gap-1 hover:text-teal-700 hover:underline"
                            title={`Open ${med.name} on ${store.name}`}
                          >
                            <span>₹{price.toFixed(2)}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* Total Bill Footer Row with Direct External Link per Column */}
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-sm">
                <td className="py-4 px-3 text-slate-900">
                  <div>Total Bill ({result.medicines.length} Medicines)</div>
                  <div className="text-xs font-normal text-slate-500">
                    Opens the pharmacy site in a new tab &amp; copies your list
                  </div>
                </td>

                <td className="py-4 px-3 text-right font-mono tabular-nums text-xs text-slate-400 line-through whitespace-nowrap">
                  ₹{totalMrp.toFixed(2)}
                </td>

                {storeTotals.map((store) => {
                  const isCheapest = store.id === bestStore.id;
                  return (
                    <td
                      key={store.id}
                      className={`py-4 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                        isCheapest
                          ? 'bg-teal-100/70 text-teal-950'
                          : 'text-slate-900'
                      }`}
                    >
                      <div className="text-base">
                        ₹{store.totalBill.toFixed(2)}
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700 mb-2">
                        Save ₹{store.totalSaved.toFixed(2)}
                      </div>
                      <a
                        href={store.primaryCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSelectBundleStore(store.id)}
                        className={`min-h-[34px] px-2.5 py-1 rounded-lg font-sans text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                          isCheapest
                            ? 'bg-teal-700 hover:bg-teal-800 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <span>Order on {store.name}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Section 3: External Pharmacy Bundle & Direct Store Links */}
      <section
        id="one-click-bulk-cart"
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <ShoppingBag className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Order Your Full Prescription on {activeStore.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Open <strong className="text-slate-900">{activeStore.name}</strong> directly in a new tab to add each medicine to your real shopping cart, or upload your prescription photo on {activeStore.name}.
              </p>
            </div>
          </div>

          {/* Store Quick Switcher */}
          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0"
            role="group"
            aria-label="Select pharmacy for checkout"
          >
            {storeTotals.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => setSelectedStoreId(store.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeStore.id === store.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {store.name} (₹{store.totalBill.toFixed(0)})
              </button>
            ))}
          </div>
        </div>

        {/* Clipboard Confirmation Banner */}
        {(isAllAddedForActiveStore || copiedBundle) && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ClipboardCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div className="text-xs text-teal-950 space-y-0.5">
                <p className="font-bold text-sm">
                  Medicine list copied to your clipboard for {activeStore.name}!
                </p>
                <p className="text-teal-800">
                  We opened the first medicine ({activeStore.items[0]?.cleanQuery}) on {activeStore.name}. Click the direct buttons below to open and add any remaining medicines to your {activeStore.name} cart.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bundle Item List with Quantity Controls + Direct External "Add on [Store]" Button */}
        <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
          {activeStore.items.map((item, index) => (
            <div
              key={item.medId}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {index + 1}. {item.medName}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                    <span>{item.genericComposition}</span>
                    <span>·</span>
                    <span>{item.packSize}</span>
                    <span>·</span>
                    <span className="font-mono text-emerald-700 font-semibold">
                      {item.discountPercent}% off MRP
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pl-6 sm:pl-0">
                {/* Strip Quantity Control */}
                <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50">
                  <button
                    type="button"
                    onClick={() => updateQty(item.medId, -1)}
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
                    aria-label={`Decrease strips for ${item.medName}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2.5 text-xs font-mono font-bold text-slate-900">
                    {item.quantity} {item.quantity === 1 ? 'Strip' : 'Strips'}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.medId, 1)}
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
                    aria-label={`Increase strips for ${item.medName}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right font-mono tabular-nums min-w-[80px]">
                  <div className="text-sm font-bold text-slate-900">
                    ₹{item.lineTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400 line-through">
                    ₹{item.mrp.toFixed(2)}
                  </div>
                </div>

                <a
                  href={item.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <span>Buy on {activeStore.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Summary & External Pharmacy Actions */}
        <div className="pt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-teal-700" />
              <span>
                Estimated Total on <strong className="text-slate-900">{activeStore.name}</strong> · {activeStore.deliveryNote}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                ₹{activeStore.totalBill.toFixed(2)}
              </span>
              <span className="text-xs font-mono text-slate-400 line-through">
                ₹{totalMrp.toFixed(2)}
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-700">
                (Save ₹{activeStore.totalSaved.toFixed(2)})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Redirect to Selected Pharmacy Store */}
            <a
              href={activeStore.primaryCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => copyStoreMedicineList(activeStore.id)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shadow-xs"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>
                Open {activeStore.name} &amp; Order (₹{activeStore.totalBill.toFixed(2)})
              </span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>

            {/* Prescription Upload Page on Selected Pharmacy */}
            <a
              href={activeStore.prescriptionUploadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => copyStoreMedicineList(activeStore.id)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span>Upload Rx on {activeStore.name}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>

            {/* Copy Medicine List */}
            <button
              type="button"
              onClick={() => copyStoreMedicineList(activeStore.id)}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedBundle ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Copied List</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy List</span>
                </>
              )}
            </button>

            {/* Download Shopping List */}
            <button
              type="button"
              onClick={handleDownloadShoppingList}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download List</span>
            </button>

            {/* Share on WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `[VeriMed Prescription Order List - ${activeStore.name}]\n` +
                  activeStore.items
                    .map(
                      (i, idx) =>
                        `${idx + 1}. ${i.medName} (${i.quantity}x ${i.packSize}) - ₹${i.lineTotal.toFixed(2)}`
                    )
                    .join('\n') +
                  `\nTotal on ${activeStore.name}: ₹${activeStore.totalBill.toFixed(2)} (Saved ₹${activeStore.totalSaved.toFixed(2)})`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
              <span>WhatsApp List</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
