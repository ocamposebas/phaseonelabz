import "./CartDrawer.styles.css";
import { useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Gift,
  ShieldCheck,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  getProductPurchaseLimit,
  isReconWaterProduct,
  useCart,
} from "./CartContext";

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

function ShippingProtectionToggle({
  selected,
  amount,
  insuredValue,
  disabled,
  onChange,
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label="Add shipping protection"
      onClick={() => onChange(!selected)}
      disabled={disabled}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-wait disabled:opacity-60 ${
        selected
          ? "border-cyan-200/30 bg-cyan-300/[0.07]"
          : "border-white/10 bg-white/[0.02] hover:border-cyan-200/20"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
            selected
              ? "border-cyan-200 bg-cyan-300 text-slate-950"
              : "border-white/20 bg-[#020617] text-transparent"
          }`}
        >
          <Check size={12} strokeWidth={3} />
        </span>

        <ShieldCheck size={15} className="shrink-0 text-cyan-200" />

        <span className="min-w-0 flex-1">
          <strong className="block text-[11px] text-white">
            Shipping Protection
          </strong>
          <small className="block truncate text-[9px] text-slate-500">
            Covers up to {formatPrice(insuredValue)} against loss or damage
          </small>
        </span>

        <strong className="shrink-0 text-[11px] text-cyan-100">
          +{formatPrice(amount)}
        </strong>
      </span>
    </button>
  );
}

function RewardSummary({ progress, gifts }) {
  if (!progress) return null;

  return (
    <section className="rounded-xl border border-cyan-200/12 bg-cyan-200/[0.035] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Gift size={14} className="shrink-0 text-cyan-200" />
          <span className="truncate text-[10px] font-semibold text-slate-300">
            {progress.isMaxed
              ? "Free gift unlocked"
              : `${formatPrice(progress.remaining)} away from ${
                  progress.nextTier?.shortTitle || "your next gift"
                }`}
          </span>
        </span>

        {!progress.isMaxed && progress.nextTier ? (
          <span className="shrink-0 text-[9px] font-semibold text-slate-500">
            {formatPrice(progress.eligibleTotal)} /{" "}
            {formatPrice(progress.nextTier.threshold)}
          </span>
        ) : null}
      </div>

      {!progress.isMaxed ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-cyan-300 transition-[width] duration-300"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
      ) : null}

      {gifts?.length > 0 ? (
        <div className="mt-2 space-y-1.5" aria-label="Unlocked gifts">
          {gifts.map((gift) => (
            <div
              key={gift.ruleId || gift.id}
              className="flex min-w-0 items-center gap-2 border-t border-white/[0.06] pt-2"
            >
              {gift.image ? (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#07111f]">
                  <img
                    src={gift.image}
                    alt=""
                    loading="lazy"
                    className="max-h-7 max-w-7 object-contain"
                  />
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-white">
                {gift.name || gift.productName}
                {Number(gift.quantity || 1) > 1 ? ` × ${gift.quantity}` : ""}
              </span>
              <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200">
                Free
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function CartDrawer() {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    cartNotice,
    clearCartNotice,
    updateQuantity,
    removeFromCart,
    bundleUnlocked,
    bundleDiscountAmount,
    bundleDiscountPercent,
    bundleRequiredQuantity,
    rewardProgress,
    rewardGifts,
    checkout,
    checkoutLoading,
    shippingProtectionSelected,
    setShippingProtectionSelected,
    shippingProtectionAmount,
    shippingProtectionInsuredValue,
    checkoutTotal,
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

  const bundleEligibleUnits = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          isReconWaterProduct(item)
            ? total
            : total + Number(item.quantity || 0),
        0,
      ),
    [cartItems],
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

      <aside className="phase-cart-drawer fixed bottom-0 right-0 top-0 z-[9999] flex w-full max-w-[430px] flex-col overflow-hidden border-l border-white/10 bg-[#050914] text-white shadow-[-10px_0_34px_rgba(0,0,0,0.35)]">
        <div className="shrink-0 border-b border-cyan-200/10 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/60">
                Cart
              </p>

              <h2 className="mt-0.5 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                Your order
              </h2>

              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
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
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-cyan-200/25 hover:text-white disabled:cursor-wait disabled:opacity-50 sm:h-10 sm:w-10"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="cart-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {cartNotice && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-amber-100">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm leading-5">{cartNotice}</p>
              <button
                type="button"
                onClick={clearCartNotice}
                aria-label="Dismiss stock notice"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-amber-100/60 transition hover:bg-white/10 hover:text-amber-50"
              >
                <X size={13} />
              </button>
            </div>
          )}

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
            <div className="flex min-h-full flex-col gap-2.5">
              <div className="rounded-xl border border-cyan-200/12 bg-cyan-300/[0.04] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/65">
                      Quantity savings
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-cyan-50 sm:text-[11px]">
                      {bundleEligibleUnits >= 10
                        ? "Best tier active · 30% off"
                        : bundleEligibleUnits >= 5
                          ? `10% active · ${10 - bundleEligibleUnits} more for 30%`
                          : `${5 - bundleEligibleUnits} more to unlock 10% off`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-cyan-200/15 bg-[#020617]/55 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    {Math.min(bundleEligibleUnits, 10)}/10
                  </span>
                </div>

                <div className="relative mt-2 h-1 rounded-full bg-white/[0.07]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-cyan-300 transition-[width] duration-300"
                    style={{ width: `${Math.min((bundleEligibleUnits / 10) * 100, 100)}%` }}
                  />
                  <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/70 bg-[#07111f]" />
                </div>

                <div className="mt-1.5 flex justify-between text-[7px] font-black uppercase tracking-[0.1em] text-slate-600">
                  <span>5 items · 10%</span>
                  <span>Recon excluded</span>
                  <span>10 items · 30%</span>
                </div>
              </div>

              {cartItems.map((item) => {
                const itemKey = item.cartKey;
                const itemImage = getDisplayImage(item);
                const itemOptions = getDisplayOptions(item);
                const isRewardGift = Boolean(item.isRewardGift);
                const purchaseLimit = getProductPurchaseLimit(item);
                const lineTotal =
                  Number(item.price || 0) * Number(item.quantity || 1);

                return (
                  <article
                    key={itemKey}
                    className={`rounded-xl border p-2.5 ${
                      isRewardGift
                        ? "border-cyan-200/18 bg-transparent"
                        : "border-white/10 bg-transparent"
                    }`}
                  >
                    <div className="flex gap-2.5">
                      <div className="flex h-[72px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#07111f]">
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="max-h-[60px] w-auto object-contain"
                          />
                        ) : isRewardGift ? (
                          <Gift size={22} className="text-cyan-200/75" />
                        ) : (
                          <ShoppingBag size={22} className="text-cyan-200/60" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {isRewardGift && (
                              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-cyan-200/12 bg-cyan-300/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100">
                                <Gift size={10} />
                                Free Reward
                              </div>
                            )}

                            <h3 className="line-clamp-1 text-[14px] font-semibold leading-snug tracking-[-0.02em] text-white">
                              {item.name}
                            </h3>

                            {itemOptions && !isRewardGift && (
                              <p className="mt-0.5 line-clamp-1 text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-200/70">
                                {itemOptions}
                              </p>
                            )}

                            <p className="mt-0.5 text-xs text-slate-400">
                              {isRewardGift
                                ? "Automatically added"
                                : `${formatPrice(item.price)} each`}
                            </p>

                            {purchaseLimit && !isRewardGift && (
                              <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-amber-200/75">
                                Max {purchaseLimit} available
                              </p>
                            )}
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
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${
                              isRewardGift
                                ? "text-cyan-200/35"
                                : "text-slate-500 hover:bg-red-400/10 hover:text-red-300"
                            }`}
                          >
                            {isRewardGift ? <Gift size={14} /> : <Trash2 size={14} />}
                          </button>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-lg border border-cyan-200/10 bg-[#020617]/70 p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!isRewardGift) {
                                  updateQuantity(itemKey, -1);
                                }
                              }}
                              disabled={checkoutLoading || isRewardGift}
                              aria-label="Decrease quantity"
                              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
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
                              disabled={
                                checkoutLoading ||
                                isRewardGift ||
                                (purchaseLimit &&
                                  Number(item.quantity || 0) >= purchaseLimit)
                              }
                              aria-label="Increase quantity"
                              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
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

              <div className="mt-auto space-y-2.5 pt-2">
                {bundleUnlocked && bundleDiscountAmount > 0 ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[10px]">
                    <span className="font-semibold text-emerald-200">
                      {bundleRequiredQuantity}-product bundle ·{" "}
                      {bundleDiscountPercent}% off
                    </span>
                    <strong className="text-emerald-200">
                      -{formatPrice(bundleDiscountAmount)}
                    </strong>
                  </div>
                ) : null}

                <ShippingProtectionToggle
                  selected={shippingProtectionSelected}
                  amount={shippingProtectionAmount}
                  insuredValue={shippingProtectionInsuredValue}
                  disabled={checkoutLoading}
                  onChange={setShippingProtectionSelected}
                />

                <RewardSummary
                  progress={rewardProgress}
                  gifts={rewardGifts}
                />
              </div>
            </div>
          )}
        </div>

        {hasItems && (
          <div className="phase-cart-checkout shrink-0 border-t border-white/10 bg-[#050914] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="min-w-[104px] shrink-0">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Estimated total
                </p>
                <p className="text-2xl font-semibold tracking-[-0.05em] text-white">
                  {formatPrice(checkoutTotal)}
                </p>
                <p className="text-[8px] text-slate-600">Plus tax &amp; shipping</p>
              </div>

              <button
                type="button"
                onClick={checkout}
                disabled={checkoutLoading}
                className="min-h-12 min-w-0 flex-1 rounded-xl bg-cyan-300 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white disabled:cursor-wait disabled:opacity-80"
              >
                {checkoutLoading ? "Preparing..." : "Checkout"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
