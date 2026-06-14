import { createContext, useContext, useState, useEffect } from "react";

/*
  REWARD STRATEGY

  Rewards now keep their real WooCommerce product IDs so the cart,
  checkout session, and order summary can identify each gift correctly.

  Images are loaded dynamically from WordPress/WooCommerce Store API by ID.
  If the API cannot be reached, the cart keeps a safe fallback image.
*/

const REWARD_FALLBACK_IMAGE = "/tarro.png";

const REWARD_PRODUCT_IDS = {
  capsPack: 591,
  bacWater3ml: 667,
  vialCase4Count: 646,
  bacWater30ml: 647,
  slideCase10Count: 643,
};

const REWARD_PRODUCT_ID_LIST = Array.from(
  new Set(Object.values(REWARD_PRODUCT_IDS).filter(Boolean))
);

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
        product_id: REWARD_PRODUCT_IDS.capsPack,
        name: "FREE 5 Caps Pack",
        sku: "FREE-5-CAPS",
        rewardLabel: "$150 Reward",
      },
      {
        giftKey: "tier_150_bac_water_3ml",
        product_id: REWARD_PRODUCT_IDS.bacWater3ml,
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
        product_id: REWARD_PRODUCT_IDS.capsPack,
        name: "FREE 10 Caps Pack",
        sku: "FREE-10-CAPS",
        rewardLabel: "$250 Reward",
      },
      {
        giftKey: "tier_250_4_vial_case",
        product_id: REWARD_PRODUCT_IDS.vialCase4Count,
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
        product_id: REWARD_PRODUCT_IDS.bacWater30ml,
        name: "FREE Bac Water 30ML Tested",
        sku: "FREE-BACW-30ML",
        rewardLabel: "$500 Reward",
      },
      {
        giftKey: "tier_500_slide_case_10_count",
        product_id: REWARD_PRODUCT_IDS.slideCase10Count,
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
  rewardProducts: {},
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

function getWooBaseUrl() {
  return cleanWooUrl(
    import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
      import.meta.env.PUBLIC_WP_SITE_URL ||
      PHASEONE_PUBLIC_SITE_URL
  );
}

function getWooStoreProductEndpoint(productId = 0) {
  const cleanUrl = getWooBaseUrl();

  if (!cleanUrl || !productId) return "";

  return `${cleanUrl}/wp-json/wc/store/v1/products/${productId}`;
}

function getWooStoreProductImage(product = {}) {
  return (
    product?.images?.[0]?.src ||
    product?.images?.[0]?.thumbnail ||
    product?.images?.[0]?.url ||
    product?.image ||
    product?.featuredImage ||
    ""
  );
}

async function fetchRewardProductMap() {
  const entries = await Promise.all(
    REWARD_PRODUCT_ID_LIST.map(async (productId) => {
      const endpoint = getWooStoreProductEndpoint(productId);

      if (!endpoint) return null;

      try {
        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Reward product ${productId} returned ${response.status}`);
        }

        const product = await response.json();
        const image = getWooStoreProductImage(product);

        return [
          String(productId),
          {
            id: productId,
            product_id: productId,
            name: product?.name || "",
            sku: product?.sku || "",
            image: image || REWARD_FALLBACK_IMAGE,
            permalink: product?.permalink || product?.url || "",
          },
        ];
      } catch (error) {
        console.warn("[Phase One] Reward product image could not be loaded:", {
          productId,
          error,
        });

        return [
          String(productId),
          {
            id: productId,
            product_id: productId,
            image: REWARD_FALLBACK_IMAGE,
          },
        ];
      }
    })
  );

  return entries.filter(Boolean).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}

function normalizeCheckoutCoupon(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 32);
}


function setPhaseoneCouponCookie(value = "") {
  if (typeof document === "undefined") return "";

  const cleanCoupon = normalizeCheckoutCoupon(value);

  if (!cleanCoupon) return "";

  const maxAge = 60 * 60 * 24 * 7;
  const encoded = encodeURIComponent(cleanCoupon);
  const baseCookie = `phaseone_tagada_coupon=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;

  // Host cookie for the current domain.
  document.cookie = baseCookie;

  // Shared cookie for phaseonelabz.com, staging.phaseonelabz.com, and checkout.phaseonelabz.com.
  document.cookie = `${baseCookie}; Domain=.phaseonelabz.com`;

  try {
    window.sessionStorage?.setItem("phaseone_tagada_coupon", cleanCoupon);
    window.localStorage?.setItem("phaseone_tagada_coupon", cleanCoupon);
  } catch {
    // Storage may be blocked; cookie is the important handoff.
  }

  return cleanCoupon;
}

function clearPhaseoneCouponCookie() {
  if (typeof document === "undefined") return;

  document.cookie = "phaseone_tagada_coupon=; Path=/; Max-Age=0; SameSite=Lax; Secure";
  document.cookie = "phaseone_tagada_coupon=; Path=/; Domain=.phaseonelabz.com; Max-Age=0; SameSite=Lax; Secure";

  try {
    window.sessionStorage?.removeItem("phaseone_tagada_coupon");
    window.localStorage?.removeItem("phaseone_tagada_coupon");
  } catch {
    // Ignore.
  }
}

function getSavedAuthToken() {
  if (typeof window === "undefined") return "";

  return localStorage.getItem("lab_auth_token") || "";
}

function getCheckoutCouponFromUrl() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);

  return normalizeCheckoutCoupon(
    params.get("coupon") ||
      params.get("coupon_code") ||
      params.get("discount_code") ||
      params.get("phaseone_coupon") ||
      params.get("affiliate_coupon") ||
      params.get("promo") ||
      params.get("ref") ||
      ""
  );
}

function persistCheckoutCouponEverywhere(value = "", options = {}) {
  if (typeof window === "undefined") return "";

  const cleanCoupon = normalizeCheckoutCoupon(value);

  if (!cleanCoupon) return "";

  localStorage.setItem("phaseone_checkout_coupon", cleanCoupon);
  localStorage.setItem("phaseone_affiliate_coupon", cleanCoupon);
  setPhaseoneCouponCookie(cleanCoupon);

  if (options.locked) {
    localStorage.setItem("phaseone_locked_checkout_coupon", cleanCoupon);
    localStorage.setItem("phaseone_coupon_locked_from_url", "1");
  }

  return cleanCoupon;
}

function getStoredCheckoutCoupon() {
  if (typeof window === "undefined") return "";

  return normalizeCheckoutCoupon(
    localStorage.getItem("phaseone_locked_checkout_coupon") ||
      localStorage.getItem("phaseone_checkout_coupon") ||
      localStorage.getItem("phaseone_affiliate_coupon") ||
      ""
  );
}

function getSavedCheckoutCoupon() {
  if (typeof window === "undefined") return "";

  const cleanFromUrl = getCheckoutCouponFromUrl();

  if (cleanFromUrl) {
    return persistCheckoutCouponEverywhere(cleanFromUrl, { locked: true });
  }

  return getStoredCheckoutCoupon();
}

function saveCheckoutCoupon(value = "") {
  if (typeof window === "undefined") return "";

  const cleanCoupon = normalizeCheckoutCoupon(value);

  if (cleanCoupon) {
    localStorage.setItem("phaseone_checkout_coupon", cleanCoupon);
    localStorage.setItem("phaseone_affiliate_coupon", cleanCoupon);
    setPhaseoneCouponCookie(cleanCoupon);
    localStorage.removeItem("phaseone_locked_checkout_coupon");
    localStorage.removeItem("phaseone_coupon_locked_from_url");
  } else {
    localStorage.removeItem("phaseone_checkout_coupon");
    localStorage.removeItem("phaseone_affiliate_coupon");
    localStorage.removeItem("phaseone_locked_checkout_coupon");
    localStorage.removeItem("phaseone_coupon_locked_from_url");
    clearPhaseoneCouponCookie();
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

function decodePossibleGlobalId(value = "") {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^gid:\/\//i.test(raw)) return raw;

  try {
    if (typeof atob !== "undefined") {
      const decoded = atob(raw);

      if (decoded && decoded !== raw) return decoded;
    }
  } catch {
    // Not a base64/global id.
  }

  return raw;
}

function resolveNumericId(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;

    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }

    const raw = String(value).trim();

    if (/^\d+$/.test(raw)) {
      const number = Number(raw);
      if (number > 0) return number;
    }

    const decoded = decodePossibleGlobalId(raw);
    const match = decoded.match(/(?:Product|product|Variation|variation|product_variation|post)[:\/](\d+)$/);

    if (match?.[1]) {
      const number = Number(match[1]);
      if (number > 0) return number;
    }
  }

  return 0;
}

function getProductId(item = {}) {
  return resolveNumericId(
    item.product_id,
    item.productId,
    item.productID,
    item.wc_product_id,
    item.wcProductId,
    item.woo_product_id,
    item.wooProductId,
    item.databaseId,
    item.database_id,
    item.wp_id,
    item.wordpress_id,
    item.parent_id,
    item.parentId,
    item.id
  );
}

function getVariationId(item = {}) {
  return resolveNumericId(
    item.variation_id,
    item.variationId,
    item.selectedVariationId,
    item.selected_variation_id,
    item.variant_id,
    item.variantId,
    item.databaseVariationId,
    item.variationDatabaseId
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

function getActiveRewardTier(paidSubtotal = 0) {
  const unlockedTiers = REWARD_TIERS.filter(
    (tier) => paidSubtotal >= tier.threshold
  );

  return unlockedTiers[unlockedTiers.length - 1] || null;
}

function getUnlockedRewardGifts(paidSubtotal = 0) {
  /*
    IMPORTANT:
    Reward tiers are NOT cumulative.

    Example:
    - $150 subtotal => only $150 gifts
    - $250 subtotal => only $250 gifts, $150 gifts are removed
    - $500 subtotal => only $500 gifts, lower-tier gifts are removed
  */
  const activeTier = getActiveRewardTier(paidSubtotal);

  if (!activeTier) return [];

  return activeTier.gifts.map((gift) => ({
    ...gift,
    tierThreshold: activeTier.threshold,
    activeTierThreshold: activeTier.threshold,
    activeTierTitle: activeTier.title,
    activeTierShortTitle: activeTier.shortTitle,
  }));
}

function buildRewardGiftItem(gift = {}, rewardProductMap = {}) {
  if (!gift.giftKey) return null;

  const rewardProductId = Number(gift.product_id || gift.productId || gift.id || 0);

  if (!rewardProductId) return null;

  const rewardProduct =
    rewardProductMap[String(rewardProductId)] || rewardProductMap[rewardProductId] || {};

  return normalizeCartItem({
    id: rewardProductId,
    product_id: rewardProductId,
    parent_id: rewardProductId,
    variation_id: 0,
    quantity: 1,
    price: 0,
    regular_price: 0,
    sale_price: 0,
    image: rewardProduct.image || gift.image || REWARD_FALLBACK_IMAGE,
    name: gift.name || rewardProduct.name || "FREE Reward",
    sku: gift.sku || rewardProduct.sku || "",
    permalink: rewardProduct.permalink || gift.permalink || "",
    rewardWooName: rewardProduct.name || "",
    giftKey: gift.giftKey,
    rewardLabel: gift.rewardLabel,
    tierThreshold: gift.tierThreshold,
    activeTierThreshold: gift.activeTierThreshold,
    activeTierTitle: gift.activeTierTitle,
    activeTierShortTitle: gift.activeTierShortTitle,
    isRewardGift: true,
    lockedGift: true,
    cartKey: `reward:${gift.giftKey}`,
  });
}

function syncRewardGifts(items = [], rewardProductMap = {}) {
  const normalizedItems = items.map(normalizeCartItem);
  const paidItems = normalizedItems.filter((item) => !isRewardGift(item));
  const paidSubtotal = getPaidSubtotal(paidItems);

  const giftItems = getUnlockedRewardGifts(paidSubtotal)
    .map((gift) => buildRewardGiftItem(gift, rewardProductMap))
    .filter(Boolean);

  return [...paidItems, ...giftItems];
}

function getRewardProgress(items = []) {
  const paidSubtotal = getPaidSubtotal(items);
  const finalTier = REWARD_TIERS[REWARD_TIERS.length - 1];

  const allUnlockedTiers = REWARD_TIERS.filter(
    (tier) => paidSubtotal >= tier.threshold
  );

  const nextTier = REWARD_TIERS.find((tier) => paidSubtotal < tier.threshold);
  const highestTier = getActiveRewardTier(paidSubtotal);
  const activeTier = highestTier;

  // Public-facing unlocked rewards should only represent the current highest tier.
  // This prevents older tier rewards from showing as still valid after the customer moves up.
  const unlockedTiers = activeTier ? [activeTier] : [];

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

  const freeShippingUnlocked = Boolean(activeTier?.freeShipping);

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
    allUnlockedTiers,
    highestTier,
    activeTier,
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
  /*
    IMPORTANT:
    Rewards/free gifts are visual only.
    Checkout payloads must contain ONLY official paid products.

    This also preserves the real WooCommerce numeric IDs by resolving them from
    product_id, databaseId, Woo/WP ID aliases, or GraphQL global IDs.
  */
  const payload = cartItems
    .map(normalizeCartItem)
    .filter((item) => !isRewardGift(item))
    .map((item) => {
      const productId = getProductId(item);
      const variationId = getVariationId(item);

      return {
        product_id: productId,
        id: productId,
        variation_id: variationId,
        quantity: Number(item.quantity || 1),
        variation: normalizeCartVariation(item),
      };
    })
    .filter((item) => item.product_id > 0 && item.quantity > 0);

  console.log("[Phase One] Checkout payload official products only:", payload);

  return payload;
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

  if (coupon) {
    setPhaseoneCouponCookie(coupon);
  }
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

function buildCustomCheckoutUrlFromSession(
  sessionId = "",
  baseUrl = "",
  checkoutCoupon = ""
) {
  if (!sessionId) return null;

  const fallbackBase =
    typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/checkout`
      : "/checkout";

  const url = new URL(baseUrl || fallbackBase);
  const cleanCoupon = normalizeCheckoutCoupon(
    checkoutCoupon || getSavedCheckoutCoupon()
  );

  url.search = "";
  url.hash = "";
  url.searchParams.set("checkout_session", sessionId);
  url.searchParams.set("phaseone_checkout", "1");

  if (cleanCoupon) {
    // Keep the coupon visible only on the Astro custom checkout URL.
    // CheckoutTransferPage will validate it, lock it, and carry it safely to Woo/Tagada.
    url.searchParams.set("coupon", cleanCoupon);
  }

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

  const cleanCheckoutCoupon = normalizeCheckoutCoupon(
    options.checkoutCoupon || getSavedCheckoutCoupon()
  );

  const sessionId = persistCheckoutSession({
    normalizedItems,
    payload,
    encodedPayload,
    legacyItems,
    paidSubtotal,
    cartTotal,
    rewardProgress,
    rewardGifts,
    checkoutCoupon: cleanCheckoutCoupon,
    account: options.account,
    source: options.source || "phaseone_omnisend_abandoned_cart",
  });

  return (
    buildCustomCheckoutUrlFromSession(sessionId, baseUrl, cleanCheckoutCoupon) ||
    baseUrl ||
    PHASEONE_PUBLIC_CHECKOUT_URL
  );
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
  const [rewardProducts, setRewardProducts] = useState({});

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    let active = true;

    async function loadRewardProducts() {
      const productMap = await fetchRewardProductMap();

      if (!active) return;

      setRewardProducts(productMap);
    }

    loadRewardProducts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!Object.keys(rewardProducts).length) return;

    setCartItems((prevItems) =>
      syncRewardGifts(prevItems.map(normalizeCartItem), rewardProducts)
    );
  }, [rewardProducts]);

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

    const trackingSyncedItems = syncRewardGifts(trackingItems, rewardProducts);
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

      return syncRewardGifts(nextItems, rewardProducts);
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (cartKey) => {
    setCartItems((prevItems) => {
      const normalizedPrev = prevItems.map(normalizeCartItem);
      const nextItems = normalizedPrev.filter((item) => item.cartKey !== cartKey);

      return syncRewardGifts(nextItems, rewardProducts);
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

      return syncRewardGifts(nextItems, rewardProducts);
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

      return syncRewardGifts(nextItems, rewardProducts);
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
      syncRewardGifts(cartItems.map(normalizeCartItem), rewardProducts),
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
      syncRewardGifts(cartItems.map(normalizeCartItem), rewardProducts),
      null,
      checkoutUrl,
      { checkoutCoupon, account }
    );

    setCheckoutLoading(true);

    console.log("Sending cart to WordPress checkout:", checkoutUrl);

    window.location.href = checkoutUrl;
  };

  const syncedCartItems = syncRewardGifts(cartItems.map(normalizeCartItem), rewardProducts);
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
        rewardProducts,
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