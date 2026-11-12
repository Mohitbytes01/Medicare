import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Loader2,
  LogIn,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  AuthUser,
  SavedOrderSummaryRecord,
  StoreMedicineItem,
} from '../types/prescription';
import {
  auth,
  deleteSavedOrderFromFirestore,
  listSavedOrdersFromFirestore,
} from '../firebase';

interface OrderHistoryViewProps {
  currentUser: AuthUser | null;
  onRequireSignIn: () => void;
  onReorderItemsToBasket: (
    itemIdsCsv: string,
    fallbackItemsSummary: string
  ) => void;
  onQuickAddEssentialBySearch: (productQuery: string) => void;
  onNavigateToBasket: () => void;
  onNavigateToStore: () => void;
}

const COMMON_MONTHLY_ESSENTIALS: Array<{
  name: string;
  packSize: string;
  category: string;
  approxPrice: number;
}> = [
  {
    name: 'Whisper Ultra Clean Sanitary Pads (XL+)',
    packSize: 'Pack of 44 Pads',
    category: 'Feminine Hygiene',
    approxPrice: 414,
  },
  {
    name: 'Friends Easy Adult Diapers (Large)',
    packSize: 'Pack of 10 Pants',
    category: 'Elderly Care',
    approxPrice: 468,
  },
  {
    name: 'MamyPoko Pants Extra Absorb Baby Diapers (M)',
    packSize: 'Pack of 56 Pants',
    category: 'Baby Care',
    approxPrice: 659,
  },
  {
    name: 'Himalaya Gentle Baby Wipes (Aloe & Lotus)',
    packSize: 'Twin Pack (144 Wipes)',
    category: 'Wet Wipes',
    approxPrice: 237,
  },
  {
    name: 'Dettol Antiseptic Liquid Disinfectant',
    packSize: '550 ml Bottle',
    category: 'Antiseptic & First Aid',
    approxPrice: 205,
  },
  {
    name: 'Tetmosol Medicated Soap (Monosulfiram 5%)',
    packSize: '100 g Bar',
    category: 'Medicated Soap',
    approxPrice: 84,
  },
  {
    name: 'Shelcal 500 Tablet (Calcium + Vitamin D3)',
    packSize: '1 Strip of 15 Tablets',
    category: 'Daily Vitamins',
    approxPrice: 121,
  },
  {
    name: 'Dolo 650 Tablet',
    packSize: '1 Strip of 15 Tablets',
    category: 'Fever & Pain',
    approxPrice: 28,
  },
];

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  currentUser,
  onRequireSignIn,
  onReorderItemsToBasket,
  onQuickAddEssentialBySearch,
  onNavigateToBasket,
  onNavigateToStore,
}) => {
  const [orders, setOrders] = useState<SavedOrderSummaryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderToast, setReorderToast] = useState<string | null>(null);

  const fetchOrders = async () => {
    const uid = auth.currentUser?.uid || currentUser?.id;
    if (!uid || !auth.currentUser) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listSavedOrdersFromFirestore(uid);
      setOrders(list);
    } catch {
      // handled by handleFirestoreError or gracefully ignored if offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentUser?.id]);

  const handleDeleteOrder = async (orderId: string) => {
    const uid = auth.currentUser?.uid || currentUser?.id;
    if (!uid || !auth.currentUser) return;
    setDeletingId(orderId);
    try {
      await deleteSavedOrderFromFirestore(uid, orderId);
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleReorderClick = (ord: SavedOrderSummaryRecord) => {
    onReorderItemsToBasket(ord.itemIdsCsv, ord.itemsSummary);
    setReorderToast(
      `Restored ${ord.itemCount} pack(s) from Order ${ord.orderId} into your active Basket!`
    );
  };

  const totalSavedAllTime = orders.reduce((sum, o) => sum + o.totalSaved, 0);
  const totalSpentAllTime = orders.reduce((sum, o) => sum + o.totalPaid, 0);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700">
            <History className="w-3.5 h-3.5" />
            <span>Cloud-Synced Basket Checkouts &amp; 1-Tap Reordering</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Order Again &amp; Monthly Reorders
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            View your past basket checkout summaries saved in Firestore and reorder recurring medicines, diapers, sanitary pads, and daily essentials in one tap.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {currentUser && (
            <button
              type="button"
              onClick={fetchOrders}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateToBasket}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Go to My Basket</span>
          </button>
        </div>
      </section>

      {reorderToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-emerald-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{reorderToast}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateToBasket}
              className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-bold cursor-pointer"
            >
              View Basket Now
            </button>
            <button
              type="button"
              onClick={() => setReorderToast(null)}
              className="text-emerald-800 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Authenticated vs Unauthenticated State */}
      {!currentUser ? (
        <section className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-base font-bold text-slate-900">
              Sign In to Sync &amp; View Your Past Basket Checkouts
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              When you sign in with Google, every basket checkout summary you place on Tata 1mg, PharmEasy, Netmeds, or Apollo 24|7 is securely saved to your private Firestore account for 1-tap monthly reordering.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onRequireSignIn}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Order Again</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToStore}
              className="min-h-[42px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold cursor-pointer"
            >
              Browse Medicine Store
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Summary Stats Row */}
          {orders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Past Basket Checkouts
                </div>
                <div className="font-mono text-2xl font-bold text-slate-900">
                  {orders.length}
                </div>
                <div className="text-[11px] text-slate-500">
                  Stored securely in your Firestore account
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Checkout Value
                </div>
                <div className="font-mono text-2xl font-bold text-slate-900">
                  ₹{totalSpentAllTime.toFixed(0)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Across Tata 1mg, PharmEasy, Netmeds &amp; Apollo
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Total Saved on VeriMed
                </div>
                <div className="font-mono text-2xl font-bold text-emerald-800">
                  ₹{totalSavedAllTime.toFixed(0)}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium">
                  Compared to retail MRP
                </div>
              </div>
            </div>
          )}

          {/* Saved Order Summaries List */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-teal-700" />
                <h2 className="text-base font-bold text-slate-900">
                  Saved Basket Checkout Summaries ({orders.length})
                </h2>
              </div>
              {loading && (
                <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                  <span>Syncing from Firestore...</span>
                </span>
              )}
            </div>

            {orders.length === 0 && !loading ? (
              <div className="py-10 text-center space-y-3">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="space-y-1 max-w-md mx-auto">
                  <p className="text-sm font-bold text-slate-800">
                    No basket checkout summaries saved yet
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Add medicines or daily essentials to your Basket and click any pharmacy &ldquo;Order&rdquo; button. Your checkout summary will automatically be saved here for easy monthly reordering.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToStore}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Shop Medicines &amp; Healthcare Essentials</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => {
                  const firstProductQuery =
                    ord.itemsSummary
                      .split(',')[0]
                      ?.replace(/\([^)]*\)/g, '')
                      .replace(
                        /^(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|oint(?:ment)?|drops?|gel|cream)\.?\s+/i,
                        ''
                      )
                      .replace(/\b(?:pack of|strip of|\d+\s*tablets?|\d+\s*capsules?|\d+['’]?s)\b/gi, '')
                      .replace(/[^a-zA-Z0-9\s-]/g, ' ')
                      .trim() || 'Healthcare Product';
                  const encOrderQuery = encodeURIComponent(firstProductQuery);
                  const orderApolloSlug = firstProductQuery
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                  const directReorderUrl =
                    ord.platformId === 'pharmeasy'
                      ? `https://pharmeasy.in/search/all?name=${encOrderQuery}`
                      : ord.platformId === 'netmeds'
                      ? `https://www.netmeds.com/products?q=${encOrderQuery}`
                      : ord.platformId === 'apollo'
                      ? orderApolloSlug
                        ? `https://www.apollopharmacy.in/search-medicines/${orderApolloSlug}`
                        : `https://www.apollo247.com/specialties/search?q=${encOrderQuery}`
                      : `https://www.1mg.com/search/all?name=${encOrderQuery}`;

                  return (
                    <article
                      key={ord.orderId}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-teal-700/40 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg">
                            {ord.platformName}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-slate-600">
                            {ord.itemCount} Pack(s)
                          </span>
                          <span className="text-[11px] text-slate-400">•</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(ord.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{ord.orderId}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900 leading-snug">
                          {ord.itemsSummary}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="font-mono font-bold text-slate-900">
                            Checkout Total: ₹{ord.totalPaid.toFixed(0)}
                          </span>
                          <span className="font-mono text-slate-400 line-through">
                            MRP ₹{ord.totalMrp.toFixed(0)}
                          </span>
                          {ord.totalSaved > 0 && (
                            <span className="font-mono font-semibold text-emerald-700">
                              Saved ₹{ord.totalSaved.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReorderClick(ord)}
                          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reorder to Basket</span>
                        </button>

                        <a
                          href={directReorderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[38px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <span>Buy on {ord.platformName}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          disabled={deletingId === ord.orderId}
                          onClick={() => handleDeleteOrder(ord.orderId)}
                          className="min-h-[38px] px-2.5 py-2 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-700 text-xs inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Order Summary"
                        >
                          {deletingId === ord.orderId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Quick Reorder Common Monthly Healthcare Essentials */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">
              Quick Reorder Common Healthcare Essentials
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            One-tap add to Basket for monthly household restocking
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COMMON_MONTHLY_ESSENTIALS.map((item) => (
            <div
              key={item.name}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  {item.category}
                </span>
                <h3 className="text-xs font-bold text-slate-900 leading-snug">
                  {item.name}
                </h3>
                <p className="text-[11px] text-slate-500">{item.packSize}</p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                <span className="font-mono text-xs font-bold text-slate-900">
                  ~₹{item.approxPrice}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onQuickAddEssentialBySearch(item.name);
                    setReorderToast(`Added "${item.name}" to your Basket!`);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add to Basket</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
