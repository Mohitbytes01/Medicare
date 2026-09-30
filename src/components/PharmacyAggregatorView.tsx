import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  PackageCheck,
  Search,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import { PrescriptionVerificationResult } from '../types/prescription';

interface PharmacyAggregatorViewProps {
  result: PrescriptionVerificationResult;
}

type PlatformId = '1mg' | 'pharmeasy' | 'netmeds' | 'apollo';

const PLATFORMS: Array<{
  id: PlatformId;
  name: 'Tata 1mg' | 'PharmEasy' | 'Netmeds' | 'Apollo 24|7';
  deliveryNote: string;
  homeUrl: string;
  buildBulkOrderUrl: (medicineNames: string[]) => string;
}> = [
  {
    id: '1mg',
    name: 'Tata 1mg',
    deliveryNote: 'Standard 1-day home delivery',
    homeUrl: 'https://www.1mg.com',
    buildBulkOrderUrl: (names) =>
      `https://www.1mg.com/search/all?name=${encodeURIComponent(names.join(', '))}`,
  },
  {
    id: 'pharmeasy',
    name: 'PharmEasy',
    deliveryNote: 'Standard 24–48 hr delivery',
    homeUrl: 'https://pharmeasy.in',
    buildBulkOrderUrl: (names) =>
      `https://pharmeasy.in/search/all?name=${encodeURIComponent(names.join(', '))}`,
  },
  {
    id: 'netmeds',
    name: 'Netmeds',
    deliveryNote: 'Pan-India courier delivery',
    homeUrl: 'https://www.netmeds.com',
    buildBulkOrderUrl: (names) =>
      `https://www.netmeds.com/catalogsearch/result/${encodeURIComponent(names.join(' '))}/all`,
  },
  {
    id: 'apollo',
    name: 'Apollo 24|7',
    deliveryNote: 'Express 2-hour local pharmacy delivery',
    homeUrl: 'https://www.apollopharmacy.in',
    buildBulkOrderUrl: (names) =>
      `https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(names.join(' '))}`,
  },
];

export const PharmacyAggregatorView: React.FC<PharmacyAggregatorViewProps> = ({
  result,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Compute total bill for all medicines per pharmacy source
  const totalMrp = Number(
    result.medicines
      .reduce((sum, med) => sum + (med.pharmacyQuotes[0]?.mrp || 0), 0)
      .toFixed(2)
  );

  const totalJanAushadhi = Number(
    result.medicines
      .reduce((sum, med) => sum + (med.janAushadhiGenericPrice || 0), 0)
      .toFixed(2)
  );

  const storeTotals = PLATFORMS.map((platform) => {
    let totalBill = 0;
    const items: Array<{
      medId: string;
      medName: string;
      genericComposition: string;
      packSize: string;
      mrp: number;
      price: number;
      discountPercent: number;
      deepLink: string;
    }> = [];

    result.medicines.forEach((med) => {
      const quote =
        med.pharmacyQuotes.find((q) => q.platformId === platform.id) ||
        med.pharmacyQuotes[0];
      const price = quote ? quote.discountedPrice : 0;
      const mrp = quote ? quote.mrp : 0;
      totalBill += price;
      items.push({
        medId: med.id,
        medName: med.name,
        genericComposition: med.genericComposition,
        packSize: quote?.packSize || '1 Strip',
        mrp,
        price,
        discountPercent: quote?.discountPercent || 0,
        deepLink: quote?.deepLink || platform.homeUrl,
      });
    });

    const cleanTotal = Number(totalBill.toFixed(2));
    const totalSaved = Number(Math.max(0, totalMrp - cleanTotal).toFixed(2));
    const savedPercent =
      totalMrp > 0 ? Math.round((totalSaved / totalMrp) * 100) : 0;

    return {
      ...platform,
      totalBill: cleanTotal,
      totalSaved,
      savedPercent,
      items,
      bulkOrderUrl: platform.buildBulkOrderUrl(
        result.medicines.map((m) => m.name)
      ),
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
  const [orderConfirmedStoreId, setOrderConfirmedStoreId] =
    useState<PlatformId | null>(null);
  const [copiedBundle, setCopiedBundle] = useState(false);

  const activeStore =
    storeTotals.find((s) => s.id === selectedStoreId) || bestStore;

  const isAllAddedForActiveStore = bulkAddedStoreId === activeStore.id;
  const isOrderConfirmedForActiveStore =
    orderConfirmedStoreId === activeStore.id;

  const handleAddAllMedicinesAtOnce = (storeId: PlatformId) => {
    setSelectedStoreId(storeId);
    setBulkAddedStoreId(storeId);
    setOrderConfirmedStoreId(null);

    // Also copy the complete prescription medicine list to clipboard for 1-paste convenience
    const targetStore =
      storeTotals.find((s) => s.id === storeId) || activeStore;
    const summaryText = [
      `Full Prescription Order (${targetStore.name})`,
      ...targetStore.items.map(
        (item, idx) =>
          `${idx + 1}. ${item.medName} (${item.packSize}) - ₹${item.price.toFixed(2)}`
      ),
      `Total Bill: ₹${targetStore.totalBill.toFixed(2)} (Saved ₹${targetStore.totalSaved.toFixed(2)})`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(summaryText)
        .then(() => {
          setCopiedBundle(true);
          setTimeout(() => setCopiedBundle(false), 3500);
        })
        .catch(() => {});
    }

    const cartSection = document.getElementById('one-click-bulk-cart');
    if (cartSection) {
      cartSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const filteredMedicines = result.medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genericComposition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Section 1: Total Bill Comparison + 1-Button "Add All Medicines at Once" */}
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
              Compare the <strong className="text-slate-900">complete bill total</strong> across all 4 sources and use{' '}
              <strong className="text-slate-900">one button to add all {result.medicines.length} medicines at once</strong> from a single store.
            </p>
          </div>

          {/* Best Single-Store Recommendation + 1-Button Add All */}
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

            <button
              type="button"
              onClick={() => handleAddAllMedicinesAtOnce(bestStore.id)}
              className="min-h-[42px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>
                {bulkAddedStoreId === bestStore.id
                  ? `All ${result.medicines.length} Medicines Added ✓`
                  : `Add All ${result.medicines.length} Medicines at Once`}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Pharmacy Total Bill Comparison Rows */}
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {storeTotals.map((store) => {
            const isCheapestOverall = store.id === bestStore.id;
            const isSelected = store.id === activeStore.id;
            const isBulkAdded = bulkAddedStoreId === store.id;
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

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddAllMedicinesAtOnce(store.id);
                    }}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                      isBulkAdded
                        ? 'bg-emerald-700 text-white'
                        : isCheapestOverall
                          ? 'bg-teal-700 hover:bg-teal-800 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isBulkAdded ? (
                      <>
                        <Check className="w-4 h-4 shrink-0" />
                        <span>All {result.medicines.length} Added ({store.name})</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 shrink-0" />
                        <span>Add All {result.medicines.length} Medicines</span>
                      </>
                    )}
                  </button>
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
              Compare every medicine price and see the final total bill at the bottom of each column
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
                const mrp = med.pharmacyQuotes[0]?.mrp || 0;
                const packSize = med.pharmacyQuotes[0]?.packSize || '1 Strip';

                return (
                  <tr key={med.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">
                        {idx + 1}. {med.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {med.genericComposition} · {packSize}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs text-slate-400 line-through whitespace-nowrap">
                      ₹{mrp.toFixed(2)}
                    </td>

                    {storeTotals.map((store) => {
                      const q = med.pharmacyQuotes.find(
                        (quote) => quote.platformId === store.id
                      );
                      const price = q ? q.discountedPrice : mrp;
                      return (
                        <td
                          key={store.id}
                          className={`py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                            store.id === bestStore.id
                              ? 'bg-teal-50/40 font-bold text-slate-900'
                              : 'text-slate-700'
                          }`}
                        >
                          ₹{price.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* Total Bill Footer Row with 1-Click Add All per Column */}
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-sm">
                <td className="py-4 px-3 text-slate-900">
                  <div>Total Bill ({result.medicines.length} Medicines)</div>
                  <div className="text-xs font-normal text-slate-500">
                    Add all medicines in 1 click from your preferred source
                  </div>
                </td>

                <td className="py-4 px-3 text-right font-mono tabular-nums text-xs text-slate-400 line-through whitespace-nowrap">
                  ₹{totalMrp.toFixed(2)}
                </td>

                {storeTotals.map((store) => {
                  const isCheapest = store.id === bestStore.id;
                  const isBulkAdded = bulkAddedStoreId === store.id;
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
                      <button
                        type="button"
                        onClick={() => handleAddAllMedicinesAtOnce(store.id)}
                        className={`min-h-[34px] px-2.5 py-1 rounded-lg font-sans text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                          isBulkAdded
                            ? 'bg-emerald-700 text-white'
                            : isCheapest
                              ? 'bg-teal-700 hover:bg-teal-800 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <ShoppingCart className="w-3 h-3 shrink-0" />
                        <span>{isBulkAdded ? 'All Added ✓' : 'Add All'}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Section 3: Unified One-Button Full Prescription Bundle Cart */}
      <section
        id="one-click-bulk-cart"
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <ShoppingBag className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                One-Click Full Prescription Bundle on {activeStore.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                All <strong className="text-slate-900">{result.medicines.length} prescribed medicines</strong> are bundled together below so you can add and order everything at once instead of clicking items one by one.
              </p>
            </div>
          </div>

          {/* Single Master Button that Adds All Medicines at Once */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isAllAddedForActiveStore ? (
              <button
                type="button"
                onClick={() => handleAddAllMedicinesAtOnce(activeStore.id)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>
                  Add All {result.medicines.length} Medicines at Once (₹
                  {activeStore.totalBill.toFixed(2)})
                </span>
              </button>
            ) : (
              <a
                href={activeStore.bulkOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOrderConfirmedStoreId(activeStore.id)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <PackageCheck className="w-4 h-4 shrink-0" />
                <span>
                  Checkout All {result.medicines.length} Medicines on {activeStore.name} (₹
                  {activeStore.totalBill.toFixed(2)})
                </span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            )}
          </div>
        </div>

        {/* Status Banner when User Clicks "Add All Medicines at Once" */}
        {isAllAddedForActiveStore && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 space-y-0.5">
                <p className="font-bold text-sm">
                  All {result.medicines.length} medicines added to your {activeStore.name} bundle (Total Bill: ₹{activeStore.totalBill.toFixed(2)})
                </p>
                <p className="text-emerald-800">
                  {copiedBundle ? (
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Full medicine list also copied to your clipboard for instant checkout!
                    </span>
                  ) : (
                    <span>
                      You save ₹{activeStore.totalSaved.toFixed(2)} ({activeStore.savedPercent}% off MRP) by ordering your entire prescription together from {activeStore.name}.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {isOrderConfirmedForActiveStore && (
              <span className="text-xs font-bold text-emerald-800 font-mono shrink-0">
                Bundle Ready on {activeStore.name} ✓
              </span>
            )}
          </div>
        )}

        {/* Bundle Item List (No repetitive individual buttons needed—everything is included in the 1-click bundle) */}
        <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
          {activeStore.items.map((item, index) => (
            <div
              key={item.medId}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isAllAddedForActiveStore
                      ? 'text-emerald-600'
                      : 'text-teal-700'
                  }`}
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {index + 1}. {item.medName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.genericComposition} · {item.packSize} ·{' '}
                    <span className="font-medium text-slate-700">
                      {isAllAddedForActiveStore
                        ? `Added in ${activeStore.name} bundle`
                        : `Included in ${activeStore.name} full bill`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 pl-6 sm:pl-0">
                <div className="text-right font-mono tabular-nums">
                  <span className="text-sm font-bold text-slate-900">
                    ₹{item.price.toFixed(2)}
                  </span>{' '}
                  <span className="text-xs text-slate-400 line-through">
                    ₹{item.mrp.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Summary & Single Action Bar */}
        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-500">
              Combined Bill for All {result.medicines.length} Medicines on{' '}
              <strong className="text-slate-900">{activeStore.name}</strong>
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleAddAllMedicinesAtOnce(activeStore.id)}
              className={`min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                isAllAddedForActiveStore
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-teal-700 hover:bg-teal-800 text-white'
              }`}
            >
              {isAllAddedForActiveStore ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    All {result.medicines.length} Medicines Added (₹
                    {activeStore.totalBill.toFixed(2)})
                  </span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span>
                    Add All {result.medicines.length} Medicines at Once (₹
                    {activeStore.totalBill.toFixed(2)})
                  </span>
                </>
              )}
            </button>

            <a
              href={activeStore.bulkOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setBulkAddedStoreId(activeStore.id);
                setOrderConfirmedStoreId(activeStore.id);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Open {activeStore.name}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
