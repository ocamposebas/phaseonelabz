import { createContext, useContext, useState, useEffect } from "react";

/*
  REWARD STRATEGY

  Temporary reward product:
  - Bac Water 3ML
  - WooCommerce ID: 667

  For now ALL rewards use product_id 667 so checkout does not fail.
  Later we replace each reward with its real WooCommerce product ID.
*/

const TEMP_REWARD_PRODUCT = {
  product_id: 667,
  image: "/tarro.png",
};

// Public URL used only for Omnisend abandoned-cart recovery links.
// IMPORTANT:
// Do NOT send Omnisend recovery traffic to /checkout because WooCommerce/Tagada can capture that route.
// Use a clean frontend/Astro route that renders the Phase One custom checkout first.
const PHASEONE_PUBLIC_SITE_URL = "https://phaseonelabz.com";
const PHASEONE_PUBLIC_CHECKOUT_URL = `${PHASEONE_PUBLIC_SITE_URL}/checkout/`;

export const REWARD_TIERS = [
  {
    threshold: 150,
    title: "$150 Goal",
    shortTitle: "$150",
    message: "5 Caps Pack + Bac Water 3ML unlocked",
    gifts: [
      {
        giftKey: "tier_150_caps_5_pack",
        name: "FREE 5 Caps Pack",
        sku: "FREE-5-CAPS",
        rewardLabel: "$150 Reward",
      },
      {
        giftKey: "tier_150_bac_water_3ml",
        name: "FREE Bac Water 3ML",
        sku: "FREE-BACW-3ML",
        rewardLabel: "$150 Reward",
      },
    ],
  },
  {
    threshold: 250,
    title: "$250 Goal",
    shortTitle: "$250",
    message: "Free shipping + 10 Caps + 4-Vial Storage Case unlocked",
    freeShipping: true,
    gifts: [
      {
        giftKey: "tier_250_caps_10_pack",
        name: "FREE 10 Caps Pack",
        sku: "FREE-10-CAPS",
        rewardLabel: "$250 Reward",
      },
      {
        giftKey: "tier_250_4_vial_case",
        name: "FREE 4-Vial Storage Case 3ML — Random Color",
        sku: "FREE-4-VIAL-CASE",
        rewardLabel: "$250 Reward",
      },
    ],
  },
  {
    threshold: 500,
    title: "$500 Goal",
    shortTitle: "$500",
    message: "Free shipping + Bac Water 30ML + 10-Count Slide Case unlocked",
    freeShipping: true,
    gifts: [
      {
        giftKey: "tier_500_bac_water_30ml",
        name: "FREE Bac Water 30ML Tested",
        sku: "FREE-BACW-30ML",
        rewardLabel: "$500 Reward",
      },
      {
        giftKey: "tier_500_slide_case_10_count",
        name: "FREE 3ML Vial Storage Slide Case — 10 Count / Random Color",
        sku: "FREE-SLIDE-CASE-10",
        rewardLabel: "$500 Reward",
      },
    ],
  },
];

const emptyCartContext = {
  cartItems: [],
  isCartOpen: false,
  setIsCartOpen: () => {},
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  setQuantity: () => {},
  clearCart: () => {},
  checkout: () => {},
  checkoutLoading: false,
  cartTotal: 0,
  cartCount: 0,
  paidSubtotal: 0,
  rewardProgress: null,
  rewardGifts: [],
  getCartItemKey: () => "",
  buildCheckoutUrl: () => null,
  checkoutCoupon: "",
  setCheckoutCoupon: () => {},
  applyCheckoutCoupon: () => {},
  removeCheckoutCoupon: () => {},
  account: null,
};

const CartContext = createContext(emptyCartContext);

function safeJsonParse(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function cleanWooUrl(value = "") {
  return String(value || "").replace(/\/$/, "");
}

function normalizeCheckoutCoupon(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 32);
}

function getSavedAuthToken() {
  if (typeof window === "undefined") return "";

  return localStorage.getItem("lab_auth_token") || "";
}

function getSavedCheckoutCoupon() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const fromUrl =
    params.get("coupon") ||
    params.get("affiliate_coupon") ||
    params.get("ref") ||
    params.get("coupon_code") ||
    "";

  const cleanFromUrl = normalizeCheckoutCoupon(fromUrl);

  if (cleanFromUrl) {
    localStorage.setItem("phaseone_checkout_coupon", cleanFromUrl);
    return cleanFromUrl;
  }

  return normalizeCheckoutCoupon(
    localStorage.getItem("phaseone_checkout_coupon") ||
      localStorage.getItem("phaseone_affiliate_coupon") ||
      ""
  );
}

function saveCheckoutCoupon(value = "") {
  if (typeof window === "undefined") return "";

  const cleanCoupon = normalizeCheckoutCoupon(value);

  if (cleanCoupon) {
    localStorage.setItem("phaseone_checkout_coupon", cleanCoupon);
  } else {
    localStorage.removeItem("phaseone_checkout_coupon");
  }

  return cleanCoupon;
}

function sortObject(value = {}) {
  return Object.keys(value || {})
    .sort()
    .reduce((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});
}

function normalizeCartVariation(item = {}) {
  return (
    item.variation ||
    item.variation_attributes ||
    item.selectedAttributes ||
    item.selectedOptions ||
    {}
  );
}

function getProductId(item = {}) {
  return Number(item.product_id || item.parent_id || item.id || 0);
}

function getVariationId(item = {}) {
  return Number(
    item.variation_id ||
      item.variationId ||
      item.selectedVariationId ||
      0
  );
}

function isRewardGift(item = {}) {
  return Boolean(
    item.isRewardGift || String(item.cartKey || "").startsWith("reward:")
  );
}

export function getCartItemKey(item = {}) {
  if (item.isRewardGift && item.giftKey) {
    return `reward:${item.giftKey}`;
  }

  const productId = getProductId(item);
  const variationId = getVariationId(item);
  const variation = sortObject(normalizeCartVariation(item));

  return JSON.stringify({
    product_id: productId,
    variation_id: variationId,
    variation,
  });
}

function getCartItemImage(item = {}) {
  return (
    item.image ||
    item.images?.[0]?.src ||
    item.images?.[0]?.url ||
    item.featuredImage ||
    "/tarro.png"
  );
}

function getCartItemPrice(item = {}) {
  if (isRewardGift(item)) return 0;

  return Number(item.price || item.sale_price || item.regular_price || 0);
}

function normalizeCartItem(item = {}) {
  const cartKey = item.cartKey || getCartItemKey(item);

  return {
    ...item,
    cartKey,
    product_id: getProductId(item),
    parent_id: item.parent_id || getProductId(item),
    variation_id: getVariationId(item),
    quantity: Number(item.quantity || 1),
    image: getCartItemImage(item),
    price: getCartItemPrice(item),
  };
}

function getPaidSubtotal(items = []) {
  return items.reduce((total, item) => {
    if (isRewardGift(item)) return total;

    return total + getCartItemPrice(item) * Number(item.quantity || 1);
  }, 0);
}

function getUnlockedRewardGifts(paidSubtotal = 0) {
  const gifts = [];

  REWARD_TIERS.forEach((tier) => {
    if (paidSubtotal >= tier.threshold) {
      tier.gifts.forEach((gift) => {
        gifts.push({
          ...gift,
          tierThreshold: tier.threshold,
        });
      });
    }
  });

  return gifts;
}

function buildRewardGiftItem(gift = {}) {
  if (!gift.giftKey) return null;

  return normalizeCartItem({
    id: TEMP_REWARD_PRODUCT.product_id,
    product_id: TEMP_REWARD_PRODUCT.product_id,
    parent_id: TEMP_REWARD_PRODUCT.product_id,
    variation_id: 0,
    quantity: 1,
    price: 0,
    regular_price: 0,
    sale_price: 0,
    image: TEMP_REWARD_PRODUCT.image,
    name: gift.name,
    sku: gift.sku,
    giftKey: gift.giftKey,
    rewardLabel: gift.rewardLabel,
    tierThreshold: gift.tierThreshold,
    isRewardGift: true,
    lockedGift: true,
    cartKey: `reward:${gift.giftKey}`,
  });
}

function syncRewardGifts(items = []) {
  const normalizedItems = items.map(normalizeCartItem);
  const paidItems = normalizedItems.filter((item) => !isRewardGift(item));
  const paidSubtotal = getPaidSubtotal(paidItems);

  const giftItems = getUnlockedRewardGifts(paidSubtotal)
    .map(buildRewardGiftItem)
    .filter(Boolean);

  return [...paidItems, ...giftItems];
}

function getRewardProgress(items = []) {
  const paidSubtotal = getPaidSubtotal(items);
  const finalTier = REWARD_TIERS[REWARD_TIERS.length - 1];

  const unlockedTiers = REWARD_TIERS.filter(
    (tier) => paidSubtotal >= tier.threshold
  );

  const nextTier = REWARD_TIERS.find((tier) => paidSubtotal < tier.threshold);
  const highestTier = unlockedTiers[unlockedTiers.length - 1] || null;

  /*
    Correct visual progress:
    The bar is based on the final goal $500.
    Example:
    $20 = 4%
    $150 = 30%
    $250 = 50%
    $500 = 100%
  */
  const progressPercent = Math.min(
    100,
    Math.max(0, (paidSubtotal / finalTier.threshold) * 100)
  );

  const remaining = nextTier
    ? Math.max(0, nextTier.threshold - paidSubtotal)
    : 0;

  const freeShippingUnlocked = unlockedTiers.some((tier) => tier.freeShipping);

  const markers = [
    {
      label: "$0",
      value: 0,
      percent: 0,
      unlocked: true,
    },
    ...REWARD_TIERS.map((tier) => ({
      label: tier.shortTitle,
      value: tier.threshold,
      percent: Math.min(100, (tier.threshold / finalTier.threshold) * 100),
      unlocked: paidSubtotal >= tier.threshold,
    })),
  ];

  return {
    paidSubtotal,
    unlockedTiers,
    highestTier,
    nextTier,
    finalTier,
    progressPercent,
    remaining,
    freeShippingUnlocked,
    isMaxed: !nextTier,
    markers,
  };
}

function buildCheckoutPayload(cartItems = []) {
  return cartItems
    .map((item) => {
      const normalized = normalizeCartItem(item);
      const productId = Number(normalized.product_id);

      return {
        product_id: productId,
        id: productId,
        variation_id: Number(normalized.variation_id || 0),
        quantity: Number(normalized.quantity || 1),
        variation: normalizeCartVariation(normalized),
        is_reward_gift: Boolean(normalized.isRewardGift),
        reward_label: normalized.rewardLabel || "",
      };
    })
    .filter((item) => item.product_id && item.quantity > 0);
}

function findIndexByCartKey(items = [], cartKey) {
  return items.findIndex((item) => {
    const itemKey = item.cartKey || getCartItemKey(item);
    return itemKey === cartKey;
  });
}

function getAbsoluteUrl(value = "") {
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;

  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(value, window.location.origin).toString();
  }

  return value;
}

function getProductionAbsoluteUrl(value = "") {
  const rawValue = String(value || "").trim();

  if (!rawValue) return "";

  try {
    if (/^https?:\/\//i.test(rawValue)) {
      const url = new URL(rawValue);

      if (url.hostname === "staging.phaseonelabz.com") {
        url.hostname = "phaseonelabz.com";
        url.protocol = "https:";
      }

      return url.toString();
    }

    return new URL(rawValue, PHASEONE_PUBLIC_SITE_URL).toString();
  } catch {
    return rawValue;
  }
}

function getOmnisendCheckoutBaseUrl() {
  /*
    This must return the EXACT custom checkout/recovery route.
    Do not auto-append /checkout because /checkout is the WooCommerce/Tagada route.

    Recommended route:
    https://phaseonelabz.com/checkout-review/

    If you want a different route, set:
    PUBLIC_OMNISEND_ABANDONED_CHECKOUT_URL=https://phaseonelabz.com/your-custom-route/
  */
  const configuredUrl =
    import.meta.env.PUBLIC_OMNISEND_ABANDONED_CHECKOUT_URL ||
    PHASEONE_PUBLIC_CHECKOUT_URL;

  const productionUrl = getProductionAbsoluteUrl(configuredUrl);

  return productionUrl.replace(/\/?$/, "/");
}

function getOmnisendCartId() {
  if (typeof window === "undefined") return `phase_cart_${Date.now()}`;

  const existing = localStorage.getItem("phaseone_omnisend_cart_id");

  if (existing) return existing;

  const cartId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `phase_cart_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  localStorage.setItem("phaseone_omnisend_cart_id", cartId);

  return cartId;
}

function getOmnisendContactEmail(account = null) {
  if (account?.email && String(account.email).includes("@")) {
    return String(account.email).trim();
  }

  if (typeof window === "undefined") return "";

  const directKeys = [
    "phaseone_customer_email",
    "customer_email",
    "billing_email",
    "lab_customer_email",
    "phaseone_email",
  ];

  for (const key of directKeys) {
    const value = localStorage.getItem(key);
    if (value && value.includes("@")) return value.trim();
  }

  const jsonKeys = [
    "phaseone_customer",
    "phaseone_user",
    "phaseone_account",
    "lab_customer",
    "phaseone_auth_user",
    "user",
  ];

  for (const key of jsonKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const data = JSON.parse(raw);
      const email =
        data?.email ||
        data?.customer_email ||
        data?.billing_email ||
        data?.user?.email;

      if (email && String(email).includes("@")) {
        return String(email).trim();
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return "";
}

function getOmnisendProductUrl(item = {}) {
  return getProductionAbsoluteUrl(
    item.permalink || item.product_url || item.url || item.link || "/shop"
  );
}

function formatOmnisendLineItem(item = {}) {
  const productId = Number(item.variation_id || item.product_id || item.id || 0);
  const parentProductId = Number(item.product_id || item.parent_id || item.id || 0);
  const price = Number(item.price || 0);
  const quantity = Number(item.quantity || 1);

  return {
    productID: String(productId || parentProductId),
    variantID: item.variation_id ? String(item.variation_id) : "",
    sku: item.sku || "",
    productTitle: item.name || item.title || "Phase One Labz Product",
    productDescription: item.short_description || item.description || "",
    productImageURL: getProductionAbsoluteUrl(getCartItemImage(item)),
    productPrice: price,
    productURL: getOmnisendProductUrl(item),
    quantity,
  };
}

function getOmnisendCartValue(items = []) {
  return items.reduce((total, item) => {
    if (isRewardGift(item)) return total;

    return total + Number(item.price || 0) * Number(item.quantity || 1);
  }, 0);
}


function createCheckoutSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `phase_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildLegacyCheckoutItems(payload = []) {
  return payload
    .map((item) => {
      const productId = Number(item.product_id);
      const variationId = Number(item.variation_id || 0);
      const idForLegacy = variationId || productId;

      return `${idForLegacy}:${Number(item.quantity || 1)}`;
    })
    .join(",");
}

function persistCheckoutSession({
  normalizedItems = [],
  payload = [],
  encodedPayload = "",
  legacyItems = "",
  paidSubtotal = 0,
  cartTotal = 0,
  rewardProgress = null,
  rewardGifts = [],
  checkoutCoupon = "",
  account = null,
  source = "phaseone_cart_drawer_custom_checkout",
} = {}) {
  if (typeof window === "undefined") return "";

  const sessionId = createCheckoutSessionId();
  const coupon = normalizeCheckoutCoupon(checkoutCoupon || getSavedCheckoutCoupon());
  const customerEmail = getOmnisendContactEmail(account);
  const customerName = String(
    account?.name || account?.display_name || ""
  ).trim();

  const session = {
    session_id: sessionId,
    created_at: new Date().toISOString(),
    source,

    cart_items: normalizedItems,
    cartItems: normalizedItems,
    items: normalizedItems,

    checkout_items: payload,
    checkoutItems: payload,
    lab_checkout_payload: encodedPayload,
    encoded_payload: encodedPayload,
    lab_checkout: legacyItems,

    cart_total: cartTotal,
    cartTotal,
    paid_subtotal: paidSubtotal,
    paidSubtotal,

    reward_progress: rewardProgress,
    rewardProgress,
    reward_gifts: rewardGifts,
    rewardGifts,

    checkout_coupon: coupon,
    checkoutCoupon: coupon,
    customer_email: customerEmail,
    billing_email: customerEmail,
    customer_name: customerName,
    billing_first_name: customerName,
  };

  localStorage.setItem("phaseone_pending_checkout", JSON.stringify(session));
  localStorage.setItem(
    `phaseone_checkout_session_${sessionId}`,
    JSON.stringify(session)
  );

  return sessionId;
}

function buildCustomCheckoutUrlFromSession(sessionId = "", baseUrl = "") {
  if (!sessionId) return null;

  const fallbackBase =
    typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/checkout`
      : "/checkout";

  const url = new URL(baseUrl || fallbackBase);

  url.search = "";
  url.hash = "";
  url.searchParams.set("checkout_session", sessionId);
  url.searchParams.set("phaseone_checkout", "1");

  return url.toString();
}

function createCheckoutRecoveryUrl(items = [], options = {}, baseUrl = "") {
  if (typeof window === "undefined") {
    return baseUrl || PHASEONE_PUBLIC_CHECKOUT_URL;
  }

  const normalizedItems = syncRewardGifts(items.map(normalizeCartItem));
  const payload = buildCheckoutPayload(normalizedItems);
  const encodedPayload = encodeCheckoutPayload(payload);

  if (!payload.length || !encodedPayload) {
    return baseUrl || PHASEONE_PUBLIC_CHECKOUT_URL;
  }

  const legacyItems = buildLegacyCheckoutItems(payload);
  const paidSubtotal = getPaidSubtotal(normalizedItems);
  const cartTotal = normalizedItems.reduce(
    (total, item) => total + getCartItemPrice(item) * Number(item.quantity || 1),
    0
  );
  const rewardProgress = getRewardProgress(normalizedItems);
  const rewardGifts = normalizedItems.filter(isRewardGift);

  const sessionId = persistCheckoutSession({
    normalizedItems,
    payload,
    encodedPayload,
    legacyItems,
    paidSubtotal,
    cartTotal,
    rewardProgress,
    rewardGifts,
    checkoutCoupon: options.checkoutCoupon,
    account: options.account,
    source: options.source || "phaseone_omnisend_abandoned_cart",
  });

  return buildCustomCheckoutUrlFromSession(sessionId, baseUrl) || baseUrl || PHASEONE_PUBLIC_CHECKOUT_URL;
}

function buildOmnisendCheckoutUrl(items = [], options = {}) {
  /*
    Omnisend recovery must open the SAME custom checkout flow as the normal cart:
    /checkout?checkout_session=<id>&phaseone_checkout=1

    Do not send lab_checkout_payload, lab_checkout, phaseone_cart_sync, or Woo/Tagada
    params in the email URL. Those params can make WordPress/Tagada skip the
    custom checkout page.
  */

  return createCheckoutRecoveryUrl(
    items,
    {
      ...options,
      source: "phaseone_omnisend_abandoned_cart",
    },
    PHASEONE_PUBLIC_CHECKOUT_URL
  );
}

function pushOmnisendEvent(
  eventName,
  items = [],
  addedItem = null,
  checkoutUrl = "",
  options = {}
) {
  if (typeof window === "undefined") return;

  window.omnisend = window.omnisend || [];

  const paidItems = items
    .map(normalizeCartItem)
    .filter((item) => !isRewardGift(item));

  if (!paidItems.length) return;

  const cartID = getOmnisendCartId();
  const email = getOmnisendContactEmail(options.account);
  const lineItems = paidItems.map(formatOmnisendLineItem);
  const cartUrl =
    checkoutUrl || buildOmnisendCheckoutUrl(paidItems, options) || PHASEONE_PUBLIC_CHECKOUT_URL;

  const payload = {
    origin: "api",
    eventID:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `phase_event_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    eventVersion: "",
    properties: {
      abandonedCheckoutURL: cartUrl,
      cartID,
      value: getOmnisendCartValue(paidItems),
      currency: "USD",
      addedItem: addedItem ? formatOmnisendLineItem(addedItem) : lineItems[0],
      lineItems,
    },
  };

  if (email) {
    payload.contact = {
      email,
    };
  }

  window.omnisend.push(["track", eventName, payload]);

  console.log("[Phase One] Omnisend event sent:", eventName, payload);
}

function encodeCheckoutPayload(payload) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch (error) {
    console.error("Could not encode checkout payload:", error);
    return "";
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("lab_cart");
      const parsed = safeJsonParse(savedCart, []);

      return Array.isArray(parsed)
        ? syncRewardGifts(parsed.map(normalizeCartItem))
        : [];
    }

    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutCoupon, setCheckoutCouponState] = useState(() =>
    getSavedCheckoutCoupon()
  );
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("lab_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    const WOO_URL = import.meta.env.PUBLIC_WOOCOMMERCE_URL;

    if (!WOO_URL || typeof document === "undefined") return;

    const cleanUrl = cleanWooUrl(WOO_URL);

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = cleanUrl;

    const dnsPrefetch = document.createElement("link");
    dnsPrefetch.rel = "dns-prefetch";
    dnsPrefetch.href = cleanUrl;

    document.head.appendChild(preconnect);
    document.head.appendChild(dnsPrefetch);

    return () => {
      preconnect.remove();
      dnsPrefetch.remove();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncCouponFromUrl = () => {
      const savedCoupon = getSavedCheckoutCoupon();

      if (savedCoupon) {
        setCheckoutCouponState(savedCoupon);
      }
    };

    syncCouponFromUrl();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadAccount = async () => {
      try {
        const token = getSavedAuthToken();

        const response = await fetch(`/api/account?ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          setAccount(null);
          return;
        }

        const data = await response.json();
        setAccount(data || null);
      } catch {
        setAccount(null);
      }
    };

    loadAccount();

    const handleAuthUpdate = () => loadAccount();

    window.addEventListener("focus", handleAuthUpdate);
    window.addEventListener("lab-auth-updated", handleAuthUpdate);

    return () => {
      window.removeEventListener("focus", handleAuthUpdate);
      window.removeEventListener("lab-auth-updated", handleAuthUpdate);
    };
  }, []);

  const setCheckoutCoupon = (value = "") => {
    const cleanCoupon = normalizeCheckoutCoupon(value);
    setCheckoutCouponState(cleanCoupon);
    return cleanCoupon;
  };

  const applyCheckoutCoupon = (value = checkoutCoupon) => {
    const cleanCoupon = saveCheckoutCoupon(value);
    setCheckoutCouponState(cleanCoupon);
    return cleanCoupon;
  };

  const removeCheckoutCoupon = () => {
    saveCheckoutCoupon("");
    setCheckoutCouponState("");
  };

  const addToCart = (product) => {
    const quantityToAdd = Number(product?.quantity || 1);

    const normalizedProduct = normalizeCartItem({
      ...product,
      quantity: quantityToAdd,
    });

    const incomingKey = normalizedProduct.cartKey;

    const currentPaidItems = cartItems
      .map(normalizeCartItem)
      .filter((item) => !isRewardGift(item));

    const existingTrackingIndex = findIndexByCartKey(
      currentPaidItems,
      incomingKey
    );

    let trackingItems;

    if (existingTrackingIndex !== -1) {
      trackingItems = currentPaidItems.map((item, index) =>
        index === existingTrackingIndex
          ? {
              ...item,
              quantity: Number(item.quantity || 1) + quantityToAdd,
            }
          : item
      );
    } else {
      trackingItems = [...currentPaidItems, normalizedProduct];
    }

    const trackingSyncedItems = syncRewardGifts(trackingItems);
    const trackingCheckoutUrl = buildOmnisendCheckoutUrl(trackingSyncedItems, {
      checkoutCoupon,
      account,
    });

    pushOmnisendEvent(
      "added product to cart",
      trackingSyncedItems,
      normalizedProduct,
      trackingCheckoutUrl,
      { checkoutCoupon, account }
    );

    setCartItems((prevItems) => {
      const normalizedPrev = prevItems.map(normalizeCartItem);
      const paidPrev = normalizedPrev.filter((item) => !isRewardGift(item));
      const existingIndex = findIndexByCartKey(paidPrev, incomingKey);

      let nextItems;

      if (existingIndex !== -1) {
        nextItems = paidPrev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: Number(item.quantity || 1) + quantityToAdd,
              }
            : item
        );
      } else {
        nextItems = [...paidPrev, normalizedProduct];
      }

      return syncRewardGifts(nextItems);
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (cartKey) => {
    setCartItems((prevItems) => {
      const normalizedPrev = prevItems.map(normalizeCartItem);
      const nextItems = normalizedPrev.filter((item) => item.cartKey !== cartKey);

      return syncRewardGifts(nextItems);
    });
  };

  const updateQuantity = (cartKey, amount) => {
    setCartItems((prevItems) => {
      const normalizedPrev = prevItems.map(normalizeCartItem);

      const nextItems = normalizedPrev
        .map((item) => {
          if (item.cartKey !== cartKey) return item;
          if (isRewardGift(item)) return item;

          const newQty = Number(item.quantity || 1) + amount;
          if (newQty <= 0) return null;

          return {
            ...item,
            quantity: newQty,
          };
        })
        .filter(Boolean);

      return syncRewardGifts(nextItems);
    });
  };

  const setQuantity = (cartKey, quantity) => {
    const nextQuantity = Number(quantity || 1);

    setCartItems((prevItems) => {
      const normalizedPrev = prevItems.map(normalizeCartItem);

      const nextItems = normalizedPrev
        .map((item) => {
          if (item.cartKey !== cartKey) return item;
          if (isRewardGift(item)) return item;
          if (nextQuantity <= 0) return null;

          return {
            ...item,
            quantity: nextQuantity,
          };
        })
        .filter(Boolean);

      return syncRewardGifts(nextItems);
    });
  };

  const clearCart = () => {
    setCartItems([]);

    if (typeof window !== "undefined") {
      localStorage.removeItem("lab_cart");
    }
  };

  const buildCheckoutUrl = () => {
    if (typeof window === "undefined") {
      console.error("Checkout can only be started in the browser.");
      return null;
    }

    return createCheckoutRecoveryUrl(
      syncRewardGifts(cartItems.map(normalizeCartItem)),
      {
        checkoutCoupon,
        account,
        source: "phaseone_cart_drawer_custom_checkout",
      },
      `${window.location.origin}/checkout`
    );
  };

  const checkout = () => {
    if (checkoutLoading) return;

    if (!cartItems || cartItems.length === 0) {
      setIsCartOpen(true);
      return;
    }

    const checkoutUrl = buildCheckoutUrl();

    if (!checkoutUrl) {
      console.error("Could not build checkout URL.");
      setCheckoutLoading(false);
      return;
    }

    pushOmnisendEvent(
      "started checkout",
      syncRewardGifts(cartItems.map(normalizeCartItem)),
      null,
      checkoutUrl,
      { checkoutCoupon, account }
    );

    setCheckoutLoading(true);

    console.log("Sending cart to WordPress checkout:", checkoutUrl);

    window.location.href = checkoutUrl;
  };

  const syncedCartItems = syncRewardGifts(cartItems.map(normalizeCartItem));
  const paidSubtotal = getPaidSubtotal(syncedCartItems);
  const rewardProgress = getRewardProgress(syncedCartItems);
  const rewardGifts = syncedCartItems.filter(isRewardGift);

  const cartTotal = syncedCartItems.reduce(
    (total, item) =>
      total + getCartItemPrice(item) * Number(item.quantity || 1),
    0
  );

  const cartCount = syncedCartItems.reduce(
    (count, item) => count + Number(item.quantity || 1),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems: syncedCartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        setQuantity,
        clearCart,
        checkout,
        checkoutLoading,
        cartTotal,
        cartCount,
        paidSubtotal,
        rewardProgress,
        rewardGifts,
        checkoutCoupon,
        setCheckoutCoupon,
        applyCheckoutCoupon,
        removeCheckoutCoupon,
        account,
        getCartItemKey,
        buildCheckoutUrl,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  return context || emptyCartContext;
};