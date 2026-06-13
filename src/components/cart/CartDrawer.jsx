import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Trash2, ShoppingBag, Gift, Truck } from "lucide-react";
import { useCart } from "./CartContext";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getDisplayImage(item = {}) {
  return (
    item.image ||
    item.images?.[0]?.src ||
    item.images?.[0]?.url ||
    item.featuredImage ||
    ""
  );
}

function getDisplayOptions(item = {}) {
  if (item.selectedOption) return item.selectedOption;

  const selected =
    item.selectedAttributes ||
    item.selectedOptions ||
    item.variation ||
    item.variation_attributes ||
    {};

  if (!selected || typeof selected !== "object") return "";

  return Object.entries(selected)
    .map(([key, value]) => {
      if (!value) return "";

      const cleanKey = String(key)
        .replace(/^attribute_/, "")
        .replace(/^pa_/, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

      return `${cleanKey}: ${value}`;
    })
    .filter(Boolean)
    .join(" / ");
}

function formatPrice(price) {
  return usdFormatter.format(Number(price || 0));
}

export default function CartDrawer() {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    updateQuantity,
    removeFromCart,
    cartTotal,
    rewardProgress,
    rewardGifts,
    checkout,
    checkoutLoading,
  } = useCart();

  const hasItems = cartItems.length > 0;

  const totalUnits = cartItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close cart overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!checkoutLoading) {
                setIsCartOpen(false);
              }
            }}
            className="fixed inset-0 z-[9998] bg-black/65 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "tween",
              duration: 0.34,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="fixed bottom-0 right-0 top-0 z-[9999] flex w-full max-w-[430px] flex-col overflow-hidden border-l border-cyan-200/10 bg-[#040814]/95 text-white shadow-[-18px_0_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl"
          >
            <div className="border-b border-cyan-200/10 px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/60">
                    Cart
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
                    Your order
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {hasItems
                      ? `${totalUnits} item${totalUnits > 1 ? "s" : ""} selected`
                      : "Your cart is empty"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!checkoutLoading) {
                      setIsCartOpen(false);
                    }
                  }}
                  disabled={checkoutLoading}
                  aria-label="Close cart"
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-cyan-200/25 hover:text-white disabled:cursor-wait disabled:opacity-50"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {!hasItems ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="grid h-20 w-20 place-items-center rounded-full border border-cyan-200/10 bg-cyan-300/[0.04] text-cyan-200">
                    <ShoppingBag size={28} />
                  </div>

                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-white">
                    Nothing here yet
                  </h3>

                  <p className="mt-2 max-w-[260px] text-sm leading-6 text-slate-400">
                    Add products from the catalog to continue.
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-6 rounded-full border border-cyan-200/15 bg-cyan-300/[0.06] px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/15"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const itemKey = item.cartKey;
                    const itemImage = getDisplayImage(item);
                    const itemOptions = getDisplayOptions(item);
                    const isRewardGift = Boolean(item.isRewardGift);
                    const lineTotal =
                      Number(item.price || 0) * Number(item.quantity || 1);

                    return (
                      <motion.article
                        key={itemKey}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={`rounded-2xl border p-3 transition ${
                          isRewardGift
                            ? "border-cyan-200/18 bg-cyan-300/[0.045]"
                            : "border-cyan-200/10 bg-white/[0.025] hover:border-cyan-200/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex h-[92px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(145deg,rgba(6,17,31,1),rgba(8,38,56,0.65),rgba(4,12,24,1))]">
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={item.name}
                                className="max-h-[76px] w-auto object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,0.35)]"
                              />
                            ) : isRewardGift ? (
                              <Gift size={22} className="text-cyan-200/75" />
                            ) : (
                              <ShoppingBag
                                size={22}
                                className="text-cyan-200/60"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                {isRewardGift && (
                                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-cyan-200/12 bg-cyan-300/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100">
                                    <Gift size={10} />
                                    Free Reward
                                  </div>
                                )}

                                <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.02em] text-white">
                                  {item.name}
                                </h3>

                                {itemOptions && !isRewardGift && (
                                  <p className="mt-1 line-clamp-2 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-200/70">
                                    {itemOptions}
                                  </p>
                                )}

                                <p className="mt-1 text-sm text-slate-400">
                                  {isRewardGift
                                    ? "Automatically added"
                                    : `${formatPrice(item.price)} each`}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!isRewardGift) {
                                    removeFromCart(itemKey);
                                  }
                                }}
                                disabled={checkoutLoading || isRewardGift}
                                aria-label={
                                  isRewardGift
                                    ? "Reward products cannot be removed manually"
                                    : "Remove product"
                                }
                                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                  isRewardGift
                                    ? "text-cyan-200/35"
                                    : "text-slate-500 hover:bg-red-400/10 hover:text-red-300"
                                }`}
                              >
                                {isRewardGift ? (
                                  <Gift size={14} />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <div className="inline-flex items-center rounded-full border border-cyan-200/10 bg-[#020617]/60 p-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isRewardGift) {
                                      updateQuantity(itemKey, -1);
                                    }
                                  }}
                                  disabled={checkoutLoading || isRewardGift}
                                  aria-label="Decrease quantity"
                                  className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  <Minus size={12} />
                                </button>

                                <span className="min-w-[30px] text-center text-sm font-semibold text-white">
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isRewardGift) {
                                      updateQuantity(itemKey, 1);
                                    }
                                  }}
                                  disabled={checkoutLoading || isRewardGift}
                                  aria-label="Increase quantity"
                                  className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              <p
                                className={`text-sm font-semibold ${
                                  isRewardGift ? "text-cyan-100" : "text-white"
                                }`}
                              >
                                {isRewardGift ? "FREE" : formatPrice(lineTotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </div>

            {hasItems && (
              <div className="border-t border-cyan-200/10 bg-[#040814]/95 px-5 py-5">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Subtotal
                    </p>

                    <p className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-white">
                      {formatPrice(cartTotal)}
                    </p>
                  </div>

                  <p className="pb-1 text-right text-xs leading-5 text-slate-500">
                    Taxes and shipping at checkout.
                  </p>
                </div>

                {rewardProgress && (
                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <p className="truncate text-[10px] font-semibold text-slate-400">
                        {rewardProgress.isMaxed
                          ? "All rewards unlocked"
                          : `${formatPrice(rewardProgress.remaining)} away from ${
                              rewardProgress.nextTier?.shortTitle || "next"
                            } reward`}
                      </p>

                      {rewardProgress.freeShippingUnlocked && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                          <Truck size={10} />
                          Free ship
                        </span>
                      )}
                    </div>

                    <div className="relative h-1.5 rounded-full bg-white/[0.07]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-cyan-300 transition-all duration-500"
                        style={{
                          width: `${rewardProgress.progressPercent}%`,
                        }}
                      />

                      {rewardProgress.markers?.map((marker) => (
                        <span
                          key={marker.label}
                          className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                            marker.unlocked
                              ? "border-cyan-100 bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.45)]"
                              : "border-cyan-200/25 bg-[#040814]"
                          }`}
                          style={{
                            left: `${marker.percent}%`,
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative mt-1 h-3 text-[7px] font-black uppercase tracking-[0.08em] text-slate-600">
                      {rewardProgress.markers?.map((marker) => (
                        <span
                          key={marker.label}
                          className="absolute -translate-x-1/2"
                          style={{
                            left: `${marker.percent}%`,
                          }}
                        >
                          {marker.label}
                        </span>
                      ))}
                    </div>

                    {rewardGifts?.length > 0 && (
                      <p className="mt-1.5 truncate text-[9px] font-medium text-cyan-100/70">
                        {rewardGifts.length} free reward
                        {rewardGifts.length > 1 ? "s" : ""} added.
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={checkout}
                  disabled={checkoutLoading}
                  className="relative w-full overflow-hidden rounded-2xl bg-cyan-300 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white disabled:cursor-wait disabled:opacity-80"
                >
                  {checkoutLoading && (
                    <span className="absolute inset-0 animate-pulse bg-white/20" />
                  )}

                  <span className="relative z-10">
                    {checkoutLoading ? "Preparing checkout..." : "Checkout"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  disabled={checkoutLoading}
                  className="mt-3 w-full py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:text-cyan-200 disabled:cursor-wait disabled:opacity-50"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
