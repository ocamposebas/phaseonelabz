import { useEffect, useMemo } from "react";
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

  const totalUnits = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      ),
    [cartItems]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const body = document.body;
    const root = document.documentElement;
    const originalOverflow = body.style.overflow;

    if (isCartOpen) {
      body.classList.add("phase-cart-open");
      root.classList.add("phase-cart-open");
      body.style.overflow = "hidden";

      window.dispatchEvent(
        new CustomEvent("phase-cart-state", { detail: { open: true } })
      );
    } else {
      body.classList.remove("phase-cart-open");
      root.classList.remove("phase-cart-open");

      window.dispatchEvent(
        new CustomEvent("phase-cart-state", { detail: { open: false } })
      );
    }

    return () => {
      body.style.overflow = originalOverflow;
      body.classList.remove("phase-cart-open");
      root.classList.remove("phase-cart-open");

      window.dispatchEvent(
        new CustomEvent("phase-cart-state", { detail: { open: false } })
      );
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close cart overlay"
        onClick={() => {
          if (!checkoutLoading) {
            setIsCartOpen(false);
          }
        }}
        className="fixed inset-0 z-[9998] bg-black/60"
      />

      <aside className="phase-cart-drawer fixed bottom-0 right-0 top-0 z-[9999] flex w-full max-w-[430px] flex-col overflow-hidden border-l border-cyan-200/10 bg-[#040814] text-white shadow-[-10px_0_34px_rgba(0,0,0,0.35)]">
        <div className="shrink-0 border-b border-cyan-200/10 px-5 py-5">
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
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-cyan-200/25 hover:text-white disabled:cursor-wait disabled:opacity-50"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="cart-scroll flex-1 overflow-y-auto px-5 py-5">
          {!hasItems ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-cyan-200/10 bg-cyan-300/[0.04] text-cyan-200">
                <ShoppingBag size={24} />
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
                  <article
                    key={itemKey}
                    className={`rounded-2xl border p-3 ${
                      isRewardGift
                        ? "border-cyan-200/18 bg-cyan-300/[0.045]"
                        : "border-cyan-200/10 bg-white/[0.025]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-[84px] w-[70px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#07111f]">
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="max-h-[70px] w-auto object-contain"
                          />
                        ) : isRewardGift ? (
                          <Gift size={22} className="text-cyan-200/75" />
                        ) : (
                          <ShoppingBag size={22} className="text-cyan-200/60" />
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
                            {isRewardGift ? <Gift size={14} /> : <Trash2 size={14} />}
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-full border border-cyan-200/10 bg-[#020617]/70 p-1">
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
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {hasItems && (
          <div className="shrink-0 border-t border-cyan-200/10 bg-[#040814] px-5 py-5">
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
                    className="absolute inset-y-0 left-0 rounded-full bg-cyan-300"
                    style={{
                      width: `${rewardProgress.progressPercent}%`,
                    }}
                  />

                  {rewardProgress.markers?.map((marker) => (
                    <span
                      key={marker.label}
                      className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                        marker.unlocked
                          ? "border-cyan-100 bg-cyan-200"
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
      </aside>

      <style>{`
        .phase-cart-drawer {
          contain: layout paint style;
          overscroll-behavior: contain;
          transform: translateZ(0);
        }

        .cart-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scrollbar-width: thin;
        }

        body.phase-cart-open .phase-saved-tab,
        html.phase-cart-open .phase-saved-tab,
        body.phase-cart-open .phase-modal-overlay,
        html.phase-cart-open .phase-modal-overlay {
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }

        @media (max-width: 520px) {
          .phase-cart-drawer {
            left: 0;
            width: 100%;
            max-width: none;
            border-left: 0;
            box-shadow: none;
          }
        }
      `}</style>
    </>
  );
}
