import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  IndianRupee,
  Loader2,
  RefreshCw,
  Save,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

interface AffiliateCommissionEntry {
  id: string;
  timestamp: string;
  productName: string;
  platformId: '1mg' | 'pharmeasy' | 'netmeds' | 'apollo';
  platformName: string;
  quantity: number;
  orderValue: number;
  commissionRatePercent: number;
  commissionEarned: number;
  partnerId: string;
  destinationUrl: string;
}

interface AffiliateConfig {
  partnerId: string;
  cuelinksCid: string;
  upiPayoutId: string;
  rates: {
    '1mg': number;
    pharmeasy: number;
    netmeds: number;
    apollo: number;
  };
}

export const AffiliateEarningsView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const [partnerId, setPartnerId] = useState<string>('verimed_partner_in');
  const [cuelinksCid, setCuelinksCid] = useState<string>('');
  const [amazonAssociateTag, setAmazonAssociateTag] = useState<string>('');
  const [routeOtcToAmazon, setRouteOtcToAmazon] = useState<boolean>(false);
  const [customRedirectPrefix, setCustomRedirectPrefix] = useState<string>('');
  const [upiPayoutId, setUpiPayoutId] = useState<string>('');
  const [rates, setRates] = useState<AffiliateConfig['rates']>({
    '1mg': 8.0,
    pharmeasy: 9.0,
    netmeds: 10.0,
    apollo: 7.5,
  });

  const [summary, setSummary] = useState<{
    totalOrders: number;
    totalOrderValue: number;
    totalCommissionEarned: number;
  }>({
    totalOrders: 0,
    totalOrderValue: 0,
    totalCommissionEarned: 0,
  });

  const [recentOrders, setRecentOrders] = useState<AffiliateCommissionEntry[]>([]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliate/summary');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setPartnerId(data.config.partnerId || 'verimed_partner_in');
          setCuelinksCid(data.config.cuelinksCid || '');
          setAmazonAssociateTag(data.config.amazonAssociateTag || '');
          setRouteOtcToAmazon(Boolean(data.config.routeOtcToAmazon));
          setCustomRedirectPrefix(data.config.customRedirectPrefix || '');
          setUpiPayoutId(data.config.upiPayoutId || '');
          if (data.config.rates) {
            setRates(data.config.rates);
          }
        }
        if (data.summary) {
          setSummary(data.summary);
        }
        if (Array.isArray(data.recentOrders)) {
          setRecentOrders(data.recentOrders);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedToast(null);
    try {
      const res = await fetch('/api/affiliate/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId,
          cuelinksCid,
          amazonAssociateTag,
          routeOtcToAmazon,
          customRedirectPrefix,
          upiPayoutId,
          rates,
        }),
      });
      if (res.ok) {
        setSavedToast(
          'Commission rates and Affiliate Partner IDs saved. Every product order on VeriMed now credits your partner account.'
        );
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Universal Affiliate Commission Engine (All Products)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Partner Commission &amp; Order Earnings
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Every order placed from your website—across prescription medicines, diapers, sanitary pads, wet wipes, Dettol, and medicated soaps—automatically tracks and credits your partner commission.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLedger}
          className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-2 shrink-0 self-start sm:self-center cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Earnings</span>
        </button>
      </section>

      {savedToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs font-semibold text-emerald-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{savedToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedToast(null)}
            className="text-emerald-800 underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top 3 Revenue & Order KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-teal-700 rounded-2xl p-5 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-teal-800">
            Total Commission Earned
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
            ₹{summary.totalCommissionEarned.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            Earned across {summary.totalOrders} tracked product orders
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Order Value (GMV)
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
            ₹{summary.totalOrderValue.toFixed(0)}
          </div>
          <div className="text-[11px] text-slate-500">
            Combined value of medicines &amp; essentials ordered
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Orders Referred from Website
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
            {summary.totalOrders}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold">
            100% of store &amp; basket links active
          </div>
        </div>
      </div>

      {/* Commission Configuration & Store Rates Form */}
      <form
        onSubmit={handleSaveConfig}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">
              Affiliate Partner IDs &amp; Store Commission Rates (%)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Applied automatically to all 39+ catalog products &amp; searched medicines
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Your Partner Affiliate Tag (`aff_id`)
            </label>
            <input
              type="text"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              placeholder="verimed_partner_in"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Cuelinks / Universal Publisher CID (Optional)
            </label>
            <input
              type="text"
              value={cuelinksCid}
              onChange={(e) => setCuelinksCid(e.target.value)}
              placeholder="e.g. 149283 (for direct INR bank payouts)"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              UPI ID for Commission Payouts
            </label>
            <input
              type="text"
              value={upiPayoutId}
              onChange={(e) => setUpiPayoutId(e.target.value)}
              placeholder="yourname@okicici"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>

        {/* Instant Approval Alternatives (0-Hour Wait while Cuelinks is Pending) */}
        <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-teal-950">
              Instant-Approval Options (0-Hour Wait While Cuelinks Approves)
            </span>
            <span className="text-[11px] font-semibold text-teal-800">
              Active immediately — no 48hr wait required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Amazon India Associate Tag (`affiliate-program.amazon.in`)
              </label>
              <input
                type="text"
                value={amazonAssociateTag}
                onChange={(e) => setAmazonAssociateTag(e.target.value)}
                placeholder="e.g. mohit01-21 (Instant Store ID)"
                className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                EarnKaro / Admitad Instant Redirect Prefix (Optional)
              </label>
              <input
                type="text"
                value={customRedirectPrefix}
                onChange={(e) => setCustomRedirectPrefix(e.target.value)}
                placeholder="e.g. https://ekaro.in/enkr2026/?dl="
                className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>

            <label className="min-h-[40px] px-3.5 py-2 rounded-xl border border-teal-300 bg-white flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-xs font-bold text-slate-800">
                Route OTC Essentials (Pads/Diapers/Dettol) to Amazon India
              </span>
              <input
                type="checkbox"
                checked={routeOtcToAmazon}
                onChange={(e) => setRouteOtcToAmazon(e.target.checked)}
                className="w-4 h-4 accent-teal-700 cursor-pointer shrink-0"
              />
            </label>
          </div>
        </div>

        {/* Store Commission % Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {(
            [
              { id: '1mg', label: 'Tata 1mg Commission (%)' },
              { id: 'pharmeasy', label: 'PharmEasy Commission (%)' },
              { id: 'netmeds', label: 'Netmeds Commission (%)' },
              { id: 'apollo', label: 'Apollo 24|7 Commission (%)' },
            ] as const
          ).map((store) => (
            <div
              key={store.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
            >
              <label className="block text-[11px] font-bold text-slate-700">
                {store.label}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={rates[store.id]}
                  onChange={(e) =>
                    setRates((prev) => ({
                      ...prev,
                      [store.id]: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-mono text-sm font-bold text-teal-800"
                />
                <span className="font-mono text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Commission Settings</span>
          </button>
        </div>
      </form>

      {/* Live Order & Commission Ledger Table */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">
              Live Product Orders &amp; Commission Ledger ({recentOrders.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Updates automatically whenever a user clicks Buy / Order on any product
          </span>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              No product orders recorded yet in this session.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click &ldquo;Buy&rdquo; on any medicine, diaper, sanitary pad, Dettol, or medicated soap in the Medicine Store or Basket to see your live commission appear here immediately.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 pr-3">Product / Order</th>
                  <th className="py-2.5 px-3">Store</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Order Value</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 pl-3 text-right">Commission Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-3">
                      <div className="font-bold text-slate-900 max-w-xs truncate">
                        {ord.productName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(ord.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · ID: {ord.id}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <a
                        href={ord.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-teal-800 hover:underline inline-flex items-center gap-1"
                      >
                        <span>{ord.platformName}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      x{ord.quantity}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      ₹{ord.orderValue.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {ord.commissionRatePercent}%
                    </td>
                    <td className="py-3 pl-3 text-right font-mono font-bold text-emerald-700">
                      +₹{ord.commissionEarned.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
