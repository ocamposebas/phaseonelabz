import { createContext, useContext, useEffect, useRef, useState } from "react";

// Public URL used only for Omnisend abandoned-cart recovery links.
// IMPORTANT:
// Do NOT send Omnisend recovery traffic directly to the WooCommerce checkout route.
// Use a clean frontend/Astro route that renders the Phase One custom checkout first.
const PHASEONE_PUBLIC_SITE_URL = "https://phaseonelabz.com";
const PHASEONE_PUBLIC_CHECKOUT_URL = `${PHASEONE_PUBLIC_SITE_URL}/checkout/`;


const SHIPPING_PROTECTION_STORAGE_KEY = "phaseone_shipping_protection";
const SHIPPING_PROTECTION_COOKIE_KEY = "phaseone_shipping_protection";
const SHIPPING_PROTECTION_AMOUNT_COOKIE_KEY =
  "phaseone_shipping_protection_amount";
const SHIPPING_PROTECTION_VALUE_COOKIE_KEY =
  "phaseone_shipping_protection_value";
const CART_STORAGE_KEY = "lab_cart";
const CART_STORAGE_TTL_MS = 30 * 60 * 1000;
const PENDING_CHECKOUT_STORAGE_KEY = "phaseone_pending_checkout";
const CHECKOUT_SESSION_STORAGE_PREFIX = "phaseone_checkout_session_";

// One customer-facing domestic rate, regardless of whether the final label is
// USPS or FedEx. ShipStation/ParcelGuard remains the only insurance provider.
const SHIPPING_PROTECTION_RATE_PER_100 = 1.09;
const SHIPPING_PROTECTION_COOKIE_MAX_AGE = 60 * 60 * 24;

// Recon Water is intentionally identified by its stable WooCommerce slug, not
// by a numeric ID. Numeric IDs can differ between environments.
const RECON_WATER_IDENTIFIERS = new Set([
  "h-recon-water",
  "recon-water-30ml",
]);
const RECON_WATER_PROMO_THRESHOLD = 100;
const RECON_WATER_PROMO_PRICE = 15;
const RECON_WATER_PURCHASE_LIMIT = 2;
const BUNDLE_DISCOUNT_TIERS = [
  { requiredQuantity: 10, discountRate: 0.3, discountPercent: 30 },
  { requiredQuantity: 5, discountRate: 0.1, discountPercent: 10 },
];

function getBundleDiscountTier(quantity = 0) {
  const safeQuantity = Math.max(0, Number(quantity) || 0);
  return (
    BUNDLE_DISCOUNT_TIERS.find(
      (tier) => safeQuantity >= tier.requiredQuantity,
    ) || null
  );
}

function roundMoney(value = 0) {
  return Number((Number(value || 0) + Number.EPSILON).toFixed(2));
}

export function calculateShippingProtectionAmount(subtotal = 0) {
  const insuredValue = Math.max(0, Number(subtotal || 0));

  if (!insuredValue) return 0;

  return roundMoney(
    Math.ceil(insuredValue / 100) * SHIPPING_PROTECTION_RATE_PER_100,
  );
}

function getSavedShippingProtectionSelection() {
  if (typeof window === "undefined") return false;

  try {
    return localStorage.getItem(SHIPPING_PROTECTION_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSharedCookie(name, value, maxAge = SHIPPING_PROTECTION_COOKIE_MAX_AGE) {
  if (typeof document === "undefined") return;

  const encoded = encodeURIComponent(String(value ?? ""));
  const baseCookie = `${name}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;

  document.cookie = baseCookie;
  document.cookie = `${baseCookie}; Domain=.phaseonelabz.com`;
}

function clearSharedCookie(name) {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  document.cookie = `${name}=; Path=/; Domain=.phaseonelabz.com; Max-Age=0; SameSite=Lax; Secure`;
}

function persistShippingProtectionSelection({
  selected = false,
  amount = 0,
  insuredValue = 0,
} = {}) {
  if (typeof window === "undefined") return;

  try {
    if (selected) {
      localStorage.setItem(SHIPPING_PROTECTION_STORAGE_KEY, "1");
      writeSharedCookie(SHIPPING_PROTECTION_COOKIE_KEY, "1");
      writeSharedCookie(
        SHIPPING_PROTECTION_AMOUNT_COOKIE_KEY,
        roundMoney(amount).toFixed(2),
      );
      writeSharedCookie(
        SHIPPING_PROTECTION_VALUE_COOKIE_KEY,
        roundMoney(insuredValue).toFixed(2),
      );
    } else {
      localStorage.removeItem(SHIPPING_PROTECTION_STORAGE_KEY);
      clearSharedCookie(SHIPPING_PROTECTION_COOKIE_KEY);
      clearSharedCookie(SHIPPING_PROTECTION_AMOUNT_COOKIE_KEY);
      clearSharedCookie(SHIPPING_PROTECTION_VALUE_COOKIE_KEY);
    }
  } catch {
    // Cookies are still attempted even when localStorage is blocked.
  }
}

// Kept empty temporarily so older UI imports do not break during deployment.
export const REWARD_TIERS = [];

const emptyCartContext = {
  cartItems: [],
  cartNotice: "",
  clearCartNotice: () => {},
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
  bundleUnlocked: false,
  bundleDiscountAmount: 0,
  bundleDiscountPercent: 0,
  bundleRequiredQuantity: 0,
  rewardProgress: null,
  rewardGifts: [],
  rewardProducts: {},
  getCartItemKey: () => "",
  buildCheckoutUrl: () => null,
  checkoutCoupon: "",
  setCheckoutCoupon: () => {},
  shippingProtectionSelected: false,
  setShippingProtectionSelected: () => {},
  shippingProtectionAmount: 0,
  shippingProtectionInsuredValue: 0,
  checkoutTotal: 0,
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

/*
  COUPON STORAGE
  Coupons/referral codes should not live forever in localStorage.
  The cookie already expires after 7 days, so localStorage now follows
  the same rule. Old saved coupons without an expiration are treated as stale
  and are removed automatically the next time the cart loads.
*/
const CHECKOUT_COUPON_STORAGE_DAYS = 7;
const CHECKOUT_COUPON_TTL_MS =
  CHECKOUT_COUPON_STORAGE_DAYS * 24 * 60 * 60 * 1000;

const CHECKOUT_COUPON_STORAGE_KEYS = [
  "phaseone_checkout_coupon",
  "phaseone_affiliate_coupon",
  "phaseone_locked_checkout_coupon",
  "phaseone_coupon_locked_from_url",
];

function getCouponExpiryKey(key = "") {
  return `${key}_expires_at`;
}

function removeExpiringStorageItem(key = "") {
  if (typeof window === "undefined" || !key) return;

  try {
    localStorage.removeItem(key);
    localStorage.removeItem(getCouponExpiryKey(key));
  } catch {
    // Ignore blocked storage.
  }
}

function setExpiringStorageItem(
  key = "",
  value = "",
  ttlMs = CHECKOUT_COUPON_TTL_MS,
) {
  if (typeof window === "undefined" || !key) return "";

  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    removeExpiringStorageItem(key);
    return "";
  }

  try {
    const expiresAt = Date.now() + ttlMs;

    localStorage.setItem(key, cleanValue);
    localStorage.setItem(getCouponExpiryKey(key), String(expiresAt));
  } catch {
    // Ignore blocked storage.
  }

  return cleanValue;
}

function getExpiringStorageItem(key = "") {
  if (typeof window === "undefined" || !key) return "";

  try {
    const value = String(localStorage.getItem(key) || "").trim();

    if (!value) {
      removeExpiringStorageItem(key);
      return "";
    }

    const expiresAt = Number(
      localStorage.getItem(getCouponExpiryKey(key)) || 0,
    );

    /*
      Important:
      Previous versions saved coupons forever and did not create an expiry key.
      If a coupon exists but has no expiry, treat it as old/stale and remove it.
    */
    if (!expiresAt || Date.now() > expiresAt) {
      removeExpiringStorageItem(key);
      return "";
    }

    return value;
  } catch {
    return "";
  }
}

function clearStoredCheckoutCouponData() {
  if (typeof window === "undefined") return;

  CHECKOUT_COUPON_STORAGE_KEYS.forEach(removeExpiringStorageItem);
}

function setPhaseoneCouponCookie(value = "") {
  if (typeof document === "undefined") return "";

  const cleanCoupon = normalizeCheckoutCoupon(value);

  if (!cleanCoupon) return "";

  const maxAge = 60 * 60 * 24 * CHECKOUT_COUPON_STORAGE_DAYS;
  const encoded = encodeURIComponent(cleanCoupon);
  const baseCookie = `phaseone_checkout_coupon=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;

  // Host cookie for the current domain.
  document.cookie = baseCookie;

  // Shared cookie for phaseonelabz.com, staging.phaseonelabz.com, and checkout.phaseonelabz.com.
  document.cookie = `${baseCookie}; Domain=.phaseonelabz.com`;

  try {
    window.sessionStorage?.setItem("phaseone_checkout_coupon", cleanCoupon);
    setExpiringStorageItem("phaseone_checkout_coupon", cleanCoupon);
  } catch {
    // Storage may be blocked; cookie is the important handoff.
  }

  return cleanCoupon;
}

function clearPhaseoneCouponCookie() {
  if (typeof document === "undefined") return;

  document.cookie =
    "phaseone_checkout_coupon=; Path=/; Max-Age=0; SameSite=Lax; Secure";
  document.cookie =
    "phaseone_checkout_coupon=; Path=/; Domain=.phaseonelabz.com; Max-Age=0; SameSite=Lax; Secure";

  try {
    window.sessionStorage?.removeItem("phaseone_checkout_coupon");
    removeExpiringStorageItem("phaseone_checkout_coupon");
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
      "",
  );
}

function persistCheckoutCouponEverywhere(value = "", options = {}) {
  if (typeof window === "undefined") return "";

  const cleanCoupon = normalizeCheckoutCoupon(value);

  if (!cleanCoupon) return "";

  setExpiringStorageItem("phaseone_checkout_coupon", cleanCoupon);
  setExpiringStorageItem("phaseone_affiliate_coupon", cleanCoupon);
  setPhaseoneCouponCookie(cleanCoupon);

  if (options.locked) {
    setExpiringStorageItem("phaseone_locked_checkout_coupon", cleanCoupon);
    setExpiringStorageItem("phaseone_coupon_locked_from_url", "1");
  }

  return cleanCoupon;
}

function getStoredCheckoutCoupon() {
  if (typeof window === "undefined") return "";

  const lockedFlag =
    getExpiringStorageItem("phaseone_coupon_locked_from_url") === "1";
  const lockedCoupon = normalizeCheckoutCoupon(
    getExpiringStorageItem("phaseone_locked_checkout_coupon"),
  );

  if (lockedFlag && lockedCoupon) return lockedCoupon;

  return normalizeCheckoutCoupon(
    getExpiringStorageItem("phaseone_checkout_coupon") ||
      getExpiringStorageItem("phaseone_affiliate_coupon") ||
      "",
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

function getAffiliateVisitorId() {
  if (typeof window === "undefined") return "";

  const key = "phaseone_affiliate_visitor_id";
  const existing = localStorage.getItem(key);

  if (existing) return existing;

  const visitorId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `visitor_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(key, visitorId);

  try {
    const maxAge = 60 * 60 * 24 * 90;
    const encoded = encodeURIComponent(visitorId);
    const baseCookie = `phaseone_affiliate_visitor_id=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;

    document.cookie = baseCookie;
    document.cookie = `${baseCookie}; Domain=.phaseonelabz.com`;
  } catch {
    // Cookie can fail in local/non-secure environments. localStorage is enough for frontend tracking.
  }

  return visitorId;
}

function rememberAffiliateAttribution(coupon = "") {
  if (typeof window === "undefined") return "";

  const cleanCoupon = normalizeCheckoutCoupon(coupon);

  if (!cleanCoupon) return "";

  const now = new Date().toISOString();

  localStorage.setItem("phaseone_affiliate_last_touch_coupon", cleanCoupon);
  localStorage.setItem("phaseone_affiliate_last_touch_at", now);

  if (!localStorage.getItem("phaseone_affiliate_first_touch_coupon")) {
    localStorage.setItem("phaseone_affiliate_first_touch_coupon", cleanCoupon);
    localStorage.setItem("phaseone_affiliate_first_touch_at", now);
  }

  return cleanCoupon;
}

function shouldSkipAffiliateClickTracking(coupon = "") {
  if (typeof window === "undefined") return true;

  const cleanCoupon = normalizeCheckoutCoupon(coupon);

  if (!cleanCoupon) return true;

  // Prevent refresh/spam from inflating clicks too hard.
  // Server-side should still dedupe unique visitors by visitorId.
  const today = new Date().toISOString().slice(0, 10);
  const sentKey = `phaseone_affiliate_click_sent_${cleanCoupon}_${today}`;

  return localStorage.getItem(sentKey) === "1";
}

function markAffiliateClickTracked(coupon = "") {
  if (typeof window === "undefined") return;

  const cleanCoupon = normalizeCheckoutCoupon(coupon);

  if (!cleanCoupon) return;

  const today = new Date().toISOString().slice(0, 10);
  const sentKey = `phaseone_affiliate_click_sent_${cleanCoupon}_${today}`;

  localStorage.setItem(sentKey, "1");
}

async function trackAffiliateCouponEvent(event = "click", coupon = "") {
  if (typeof window === "undefined") return;

  const cleanCoupon = normalizeCheckoutCoupon(coupon);

  if (!cleanCoupon) return;

  rememberAffiliateAttribution(cleanCoupon);

  if (event === "click" && shouldSkipAffiliateClickTracking(cleanCoupon)) {
    return;
  }

  const payload = {
    event,
    coupon: cleanCoupon,
    visitorId: getAffiliateVisitorId(),
    pageUrl: window.location.href,
    path: window.location.pathname || "",
    query: window.location.search || "",
    referrer: document.referrer || "",
    userAgent: navigator.userAgent || "",
    occurredAt: new Date().toISOString(),
    source: "phaseone_frontend_coupon_url",
  };

  try {
    const response = await fetch("/api/affiliate/track.json", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok && event === "click") {
      markAffiliateClickTracked(cleanCoupon);
    }
  } catch (error) {
    console.warn("[Phase One] Affiliate event could not be tracked:", error);
  }
}

function saveCheckoutCoupon(value = "") {
  if (typeof window === "undefined") return "";

  const cleanCoupon = normalizeCheckoutCoupon(value);

  if (cleanCoupon) {
    setExpiringStorageItem("phaseone_checkout_coupon", cleanCoupon);
    setExpiringStorageItem("phaseone_affiliate_coupon", cleanCoupon);
    setPhaseoneCouponCookie(cleanCoupon);
    removeExpiringStorageItem("phaseone_locked_checkout_coupon");
    removeExpiringStorageItem("phaseone_coupon_locked_from_url");
  } else {
    clearStoredCheckoutCouponData();
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
    const match = decoded.match(
      /(?:Product|product|Variation|variation|product_variation|post)[:\/](\d+)$/,
    );

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
    item.id,
  );
}

export function getProductPurchaseLimit(item = {}) {
  const limits = [];

  if (item.sold_individually === true || item.soldIndividually === true) {
    limits.push(1);
  }

  const explicitLimit = Number(
    item.purchase_limit ??
      item.purchaseLimit ??
      item.max_purchase_quantity ??
      item.maxPurchaseQuantity ??
      item.max_quantity ??
      item.maxQuantity ??
      0,
  );

  if (Number.isFinite(explicitLimit) && explicitLimit > 0) {
    limits.push(Math.floor(explicitLimit));
  }

  const storeApiMaximum = Number(
    item.add_to_cart?.maximum ??
      item.addToCart?.maximum ??
      item.add_to_cart_maximum ??
      item.addToCartMaximum ??
      0,
  );

  if (Number.isFinite(storeApiMaximum) && storeApiMaximum > 0) {
    limits.push(Math.floor(storeApiMaximum));
  }

  const backordersAllowed = Boolean(
    item.backorders_allowed === true ||
      item.backordersAllowed === true ||
      item.is_on_backorder === true ||
      item.isOnBackorder === true ||
      item.backorders === "yes" ||
      item.backorders === "notify",
  );
  const stockQuantity = Number(
    item.stock_quantity ??
      item.stockQuantity ??
      item.inventory_quantity ??
      item.inventoryQuantity ??
      item.available_quantity ??
      item.availableQuantity ??
      item.low_stock_remaining ??
      item.lowStockRemaining ??
      NaN,
  );

  if (
    !backordersAllowed &&
    Number.isFinite(stockQuantity) &&
    stockQuantity > 0
  ) {
    limits.push(Math.floor(stockQuantity));
  }

  if (isReconWaterProduct(item)) {
    limits.push(RECON_WATER_PURCHASE_LIMIT);
  }

  return limits.length ? Math.max(1, Math.min(...limits)) : null;
}

function normalizeProductIdentifier(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isReconWaterProduct(item = {}) {
  const identifiers = [
    item.slug,
    item.product_slug,
    item.productSlug,
    item.sku,
    item.name,
    item.title,
  ].map(normalizeProductIdentifier);

  return identifiers.some((identifier) =>
    RECON_WATER_IDENTIFIERS.has(identifier),
  );
}

function clampCartItemQuantity(item = {}, quantity = 1) {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const purchaseLimit = getProductPurchaseLimit(item);

  return purchaseLimit ? Math.min(safeQuantity, purchaseLimit) : safeQuantity;
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
    item.variationDatabaseId,
  );
}

function isLegacyPromotionalItem(item = {}) {
  return Boolean(
    item.isRewardGift || String(item.cartKey || "").startsWith("reward:"),
  );
}

export function getCartItemKey(item = {}) {
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
  return Number(item.price || item.sale_price || item.regular_price || 0);
}

function normalizeCartItem(item = {}) {
  const cartKey = item.cartKey || getCartItemKey(item);
  const basePrice = Number(
    item.phaseone_base_price ??
      item.regular_cart_price ??
      item.price ??
      item.sale_price ??
      item.regular_price ??
      0,
  );

  return {
    ...item,
    cartKey,
    product_id: getProductId(item),
    parent_id: item.parent_id || getProductId(item),
    variation_id: getVariationId(item),
    quantity: clampCartItemQuantity(item, item.quantity),
    image: getCartItemImage(item),
    price: basePrice,
    phaseone_base_price: basePrice,
  };
}

function getLiveInventoryEndpoint(item = {}) {
  const wooUrl = cleanWooUrl(
    import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
      import.meta.env.PUBLIC_WP_SITE_URL ||
      "",
  );
  const inventoryId = getVariationId(item) || getProductId(item);

  if (!wooUrl || !inventoryId) return "";

  return `${wooUrl}/wp-json/wc/store/v1/products/${inventoryId}`;
}

async function getLiveInventorySnapshot(item = {}) {
  if (typeof window === "undefined") {
    return {
      checked: false,
      available: true,
      item,
      purchaseLimit: getProductPurchaseLimit(item),
    };
  }

  const endpoint = getLiveInventoryEndpoint(item);

  if (!endpoint) {
    return {
      checked: false,
      available: true,
      item,
      purchaseLimit: getProductPurchaseLimit(item),
    };
  }

  try {
    const response = await fetch(`${endpoint}?phaseone_stock=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) throw new Error(`Inventory request failed: ${response.status}`);

    const liveProduct = await response.json();
    const liveMaximum = Number(liveProduct?.add_to_cart?.maximum);
    const enrichedItem = {
      ...item,
      add_to_cart: liveProduct?.add_to_cart ?? item.add_to_cart,
      stock_quantity:
        liveProduct?.stock_quantity ??
        liveProduct?.low_stock_remaining ??
        (Number.isFinite(liveMaximum) && liveMaximum > 0
          ? liveMaximum
          : item.stock_quantity),
      low_stock_remaining:
        liveProduct?.low_stock_remaining ?? item.low_stock_remaining,
      is_in_stock: liveProduct?.is_in_stock,
      is_purchasable: liveProduct?.is_purchasable,
      is_on_backorder: liveProduct?.is_on_backorder,
    };
    const available =
      liveProduct?.is_in_stock !== false &&
      liveProduct?.is_purchasable !== false;

    return {
      checked: true,
      available,
      item: enrichedItem,
      purchaseLimit: available ? getProductPurchaseLimit(enrichedItem) : 0,
    };
  } catch (error) {
    console.warn("[Phase One] Live inventory could not be refreshed:", error);

    // The local limit still protects the interaction. The server performs the
    // final authoritative validation when the order is created.
    return {
      checked: false,
      available: true,
      item,
      purchaseLimit: getProductPurchaseLimit(item),
    };
  }
}

function getPaidSubtotal(items = []) {
  return items.reduce(
    (total, item) =>
      total + getCartItemPrice(item) * Number(item.quantity || 1),
    0,
  );
}

function normalizeCartItems(items = []) {
  const normalizedItems = items
    .map(normalizeCartItem)
    .filter((item) => !isLegacyPromotionalItem(item));

  const qualifyingSubtotal = normalizedItems.reduce((total, item) => {
    if (isReconWaterProduct(item)) return total;

    return (
      total +
      Number(item.phaseone_base_price || 0) * Number(item.quantity || 1)
    );
  }, 0);

  const promoActive = qualifyingSubtotal >= RECON_WATER_PROMO_THRESHOLD;

  const itemsWithProductPromotions = normalizedItems.map((item) => {
    if (!isReconWaterProduct(item)) return item;

    const basePrice = Number(item.phaseone_base_price || 0);
    const discountedPrice = Math.min(basePrice, RECON_WATER_PROMO_PRICE);

    return {
      ...item,
      price: promoActive ? discountedPrice : basePrice,
      phaseone_recon_water_promo_active: promoActive,
      phaseone_recon_water_promo_price: promoActive
        ? discountedPrice
        : basePrice,
      phaseone_recon_water_qualifying_subtotal: roundMoney(qualifyingSubtotal),
    };
  });

  const bundleQuantity = itemsWithProductPromotions.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
  const bundleTier = getBundleDiscountTier(bundleQuantity);
  const bundleUnlocked = Boolean(bundleTier);

  return itemsWithProductPromotions.map((item) => {
    const priceAfterProductPromotions = Number(item.price || 0);

    return {
      ...item,
      // The Recon Water promotion fixes its unit price at $15. The bundle
      // discount may apply to other products, but must not lower it further.
      price: bundleTier && !isReconWaterProduct(item)
        ? roundMoney(
            priceAfterProductPromotions * (1 - bundleTier.discountRate),
          )
        : priceAfterProductPromotions,
      phaseone_price_before_bundle: priceAfterProductPromotions,
      phaseone_bundle_active: bundleUnlocked,
      phaseone_bundle_discount_percent: bundleTier?.discountPercent || 0,
      phaseone_bundle_required_quantity: bundleTier?.requiredQuantity || 0,
    };
  });
}

function clearStoredCheckoutSessions() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);

    Object.keys(localStorage)
      .filter((key) => key.startsWith(CHECKOUT_SESSION_STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
}

function removeStoredCart({ clearCheckoutSessions = false } = {}) {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {}

  if (clearCheckoutSessions) {
    clearStoredCheckoutSessions();
  }
}

function redirectExpiredCheckoutToCatalog() {
  if (typeof window === "undefined") return;

  const pathname = String(window.location.pathname || "").replace(/\/$/, "");

  if (pathname === "/checkout") {
    window.location.replace("/shop");
  }
}

function readStoredCart() {
  if (typeof window === "undefined") {
    return { items: [], expiresAt: 0 };
  }

  try {
    const parsed = safeJsonParse(localStorage.getItem(CART_STORAGE_KEY), null);

    if (Array.isArray(parsed)) {
      removeStoredCart({ clearCheckoutSessions: true });
      return { items: [], expiresAt: 0 };
    }

    const expiresAt = Number(parsed?.expiresAt || 0);

    if (!Array.isArray(parsed?.items) || expiresAt <= Date.now()) {
      if (parsed) {
        removeStoredCart({ clearCheckoutSessions: true });
      }

      return { items: [], expiresAt: 0 };
    }

    return {
      items: normalizeCartItems(parsed.items),
      expiresAt,
    };
  } catch {
    removeStoredCart({ clearCheckoutSessions: true });
    return { items: [], expiresAt: 0 };
  }
}

function persistCart(items = [], expiresAt = 0) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: normalizeCartItems(items),
        expiresAt,
      }),
    );
  } catch {}
}

function buildCheckoutPayload(cartItems = []) {
  /*
    This preserves the real WooCommerce numeric IDs by resolving them from
    product_id, databaseId, Woo/WP ID aliases, or GraphQL global IDs.
  */
  const payload = normalizeCartItems(cartItems)
    .map((item) => {
      const productId = getProductId(item);
      const variationId = getVariationId(item);

      return {
        product_id: productId,
        id: productId,
        variation_id: variationId,
        quantity: clampCartItemQuantity(item, item.quantity),
        variation: normalizeCartVariation(item),
      };
    })
    .filter((item) => item.product_id > 0 && item.quantity > 0);

  console.log("[Phase One] Checkout payload:", payload);

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
    Do not auto-append /checkout because that route can bypass recovery state.

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
    item.permalink || item.product_url || item.url || item.link || "/shop",
  );
}

function formatOmnisendLineItem(item = {}) {
  const productId = Number(
    item.variation_id || item.product_id || item.id || 0,
  );
  const parentProductId = Number(
    item.product_id || item.parent_id || item.id || 0,
  );
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
  return normalizeCartItems(items).reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );
}

function getMetaPixelContentId(item = {}) {
  const variationId = getVariationId(item);
  const productId = getProductId(item);

  return String(
    variationId ||
      productId ||
      item.sku ||
      item.slug ||
      item.name ||
      item.title ||
      "",
  );
}

function getMetaPixelItemName(item = {}) {
  return String(item.name || item.title || "Phase One Labz Product").trim();
}

function trackP1Event(eventName, payload = {}) {
  if (typeof window === "undefined") return;

  const methodNames = {
    AddToCart: "addToCart",
    InitiateCheckout: "initiateCheckout",
  };
  const method = methodNames[eventName];

  if (!method || typeof window.P1?.[method] !== "function") {
    console.warn("[Phase One] P1 pixel API is not ready:", eventName, payload);
    return;
  }

  window.P1[method](payload);

  console.log("[Phase One] P1 pixel event sent:", eventName, payload);
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
  checkoutCoupon = "",
  account = null,
  shippingProtectionSelected = false,
  shippingProtectionAmount = 0,
  shippingProtectionInsuredValue = 0,
  cartExpiresAt = 0,
  source = "phaseone_cart_drawer_custom_checkout",
} = {}) {
  if (typeof window === "undefined") return "";

  const sessionId = createCheckoutSessionId();
  const coupon = normalizeCheckoutCoupon(
    checkoutCoupon || getSavedCheckoutCoupon(),
  );

  if (coupon) {
    setPhaseoneCouponCookie(coupon);
  }
  const customerEmail = getOmnisendContactEmail(account);
  const customerName = String(
    account?.name || account?.display_name || "",
  ).trim();
  const checkoutExpiresAt =
    Number(cartExpiresAt) > Date.now()
      ? Number(cartExpiresAt)
      : Date.now() + CART_STORAGE_TTL_MS;
  const bundleUnlocked = normalizedItems.some(
    (item) => item.phaseone_bundle_active,
  );
  const bundleDiscountPercent = Math.max(
    0,
    ...normalizedItems.map((item) =>
      Number(item.phaseone_bundle_discount_percent || 0),
    ),
  );
  const bundleRequiredQuantity = bundleDiscountPercent >= 30 ? 10 : bundleDiscountPercent ? 5 : 0;
  const subtotalBeforeBundle = normalizedItems.reduce(
    (total, item) =>
      total +
      Number(item.phaseone_price_before_bundle ?? item.price ?? 0) *
        Number(item.quantity || 1),
    0,
  );
  const bundleDiscountAmount = bundleUnlocked
    ? roundMoney(subtotalBeforeBundle - Number(cartTotal || 0))
    : 0;

  const session = {
    session_id: sessionId,
    created_at: new Date().toISOString(),
    cart_expires_at: new Date(checkoutExpiresAt).toISOString(),
    cartExpiresAt: checkoutExpiresAt,
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
    bundle_unlocked: bundleUnlocked,
    bundleUnlocked,
    bundle_discount_amount: bundleDiscountAmount,
    bundleDiscountAmount,
    bundle_discount_percent: bundleDiscountPercent,
    bundleDiscountPercent,
    bundle_required_quantity: bundleRequiredQuantity,
    bundleRequiredQuantity,
    subtotal_before_bundle: roundMoney(subtotalBeforeBundle),
    subtotalBeforeBundle: roundMoney(subtotalBeforeBundle),

    shipping_protection_selected: Boolean(shippingProtectionSelected),
    shippingProtectionSelected: Boolean(shippingProtectionSelected),
    shipping_protection_provider: shippingProtectionSelected
      ? "parcelguard"
      : "none",
    shippingProtectionProvider: shippingProtectionSelected
      ? "parcelguard"
      : "none",
    shipping_protection_amount: shippingProtectionSelected
      ? roundMoney(shippingProtectionAmount)
      : 0,
    shippingProtectionAmount: shippingProtectionSelected
      ? roundMoney(shippingProtectionAmount)
      : 0,
    shipping_protection_insured_value: shippingProtectionSelected
      ? roundMoney(shippingProtectionInsuredValue || paidSubtotal)
      : 0,
    shippingProtectionInsuredValue: shippingProtectionSelected
      ? roundMoney(shippingProtectionInsuredValue || paidSubtotal)
      : 0,

    checkout_coupon: coupon,
    checkoutCoupon: coupon,
    customer_email: customerEmail,
    billing_email: customerEmail,
    customer_name: customerName,
    billing_first_name: customerName,
  };

  persistShippingProtectionSelection({
    selected: Boolean(shippingProtectionSelected),
    amount: shippingProtectionAmount,
    insuredValue: shippingProtectionInsuredValue || paidSubtotal,
  });

  localStorage.setItem("phaseone_pending_checkout", JSON.stringify(session));
  localStorage.setItem(
    `phaseone_checkout_session_${sessionId}`,
    JSON.stringify(session),
  );

  return sessionId;
}

function buildCustomCheckoutUrlFromSession(
  sessionId = "",
  baseUrl = "",
  checkoutCoupon = "",
  shippingProtection = {},
) {
  if (!sessionId) return null;

  const fallbackBase =
    typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/checkout`
      : "/checkout";

  const url = new URL(baseUrl || fallbackBase);
  const cleanCoupon = normalizeCheckoutCoupon(
    checkoutCoupon || getSavedCheckoutCoupon(),
  );

  url.search = "";
  url.hash = "";
  url.searchParams.set("checkout_session", sessionId);
  url.searchParams.set("phaseone_checkout", "1");

  if (cleanCoupon) {
    // Keep the coupon visible only on the Astro custom checkout URL.
    // CheckoutTransferPage validates it, locks it, and carries it to WooCommerce.
    url.searchParams.set("coupon", cleanCoupon);
  }

  if (shippingProtection.selected) {
    url.searchParams.set("shipping_protection", "1");
    url.searchParams.set(
      "shipping_protection_amount",
      roundMoney(shippingProtection.amount).toFixed(2),
    );
    url.searchParams.set(
      "shipping_protection_value",
      roundMoney(shippingProtection.insuredValue).toFixed(2),
    );
  }

  return url.toString();
}

function createCheckoutRecoveryUrl(items = [], options = {}, baseUrl = "") {
  if (typeof window === "undefined") {
    return baseUrl || PHASEONE_PUBLIC_CHECKOUT_URL;
  }

  const normalizedItems = normalizeCartItems(items);
  const payload = buildCheckoutPayload(normalizedItems);
  const encodedPayload = encodeCheckoutPayload(payload);

  if (!payload.length || !encodedPayload) {
    return baseUrl || PHASEONE_PUBLIC_CHECKOUT_URL;
  }

  const legacyItems = buildLegacyCheckoutItems(payload);
  const paidSubtotal = getPaidSubtotal(normalizedItems);
  const cartTotal = normalizedItems.reduce(
    (total, item) =>
      total + getCartItemPrice(item) * Number(item.quantity || 1),
    0,
  );
  const cleanCheckoutCoupon = normalizeCheckoutCoupon(
    options.checkoutCoupon || getSavedCheckoutCoupon(),
  );
  const shippingProtectionSelected =
    options.shippingProtectionSelected ?? getSavedShippingProtectionSelection();
  const shippingProtectionInsuredValue = roundMoney(
    options.shippingProtectionInsuredValue ?? paidSubtotal,
  );
  const shippingProtectionAmount = shippingProtectionSelected
    ? roundMoney(
        options.shippingProtectionAmount ??
          calculateShippingProtectionAmount(shippingProtectionInsuredValue),
      )
    : 0;

  const sessionId = persistCheckoutSession({
    normalizedItems,
    payload,
    encodedPayload,
    legacyItems,
    paidSubtotal,
    cartTotal,
    checkoutCoupon: cleanCheckoutCoupon,
    account: options.account,
    shippingProtectionSelected,
    shippingProtectionAmount,
    shippingProtectionInsuredValue,
    cartExpiresAt: options.cartExpiresAt,
    source: options.source || "phaseone_omnisend_abandoned_cart",
  });

  return (
    buildCustomCheckoutUrlFromSession(
      sessionId,
      baseUrl,
      cleanCheckoutCoupon,
      {
        selected: shippingProtectionSelected,
        amount: shippingProtectionAmount,
        insuredValue: shippingProtectionInsuredValue,
      },
    ) ||
    baseUrl ||
    PHASEONE_PUBLIC_CHECKOUT_URL
  );
}

function buildOmnisendCheckoutUrl(items = [], options = {}) {
  /*
    Omnisend recovery must open the SAME custom checkout flow as the normal cart:
    /checkout?checkout_session=<id>&phaseone_checkout=1

    Do not send lab_checkout_payload, lab_checkout, phaseone_cart_sync, or direct
    WooCommerce params in the email URL. Those params can make WordPress skip the
    custom checkout page.
  */

  return createCheckoutRecoveryUrl(
    items,
    {
      ...options,
      source: "phaseone_omnisend_abandoned_cart",
    },
    PHASEONE_PUBLIC_CHECKOUT_URL,
  );
}

function pushOmnisendEvent(
  eventName,
  items = [],
  addedItem = null,
  checkoutUrl = "",
  options = {},
) {
  if (typeof window === "undefined") return;

  window.omnisend = window.omnisend || [];

  const paidItems = normalizeCartItems(items);

  if (!paidItems.length) return;

  const cartID = getOmnisendCartId();
  const email = getOmnisendContactEmail(options.account);
  const lineItems = paidItems.map(formatOmnisendLineItem);
  const cartUrl =
    checkoutUrl ||
    buildOmnisendCheckoutUrl(paidItems, options) ||
    PHASEONE_PUBLIC_CHECKOUT_URL;

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
  const cartExpiryRef = useRef(0);
  const isInitialCartPersistenceRef = useRef(true);
  const [cartItems, setCartItems] = useState(() => {
    const storedCart = readStoredCart();
    cartExpiryRef.current = storedCart.expiresAt;

    return storedCart.items;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutCoupon, setCheckoutCouponState] = useState(() =>
    getSavedCheckoutCoupon(),
  );
  const [account, setAccount] = useState(null);
  const [shippingProtectionSelected, setShippingProtectionSelectedState] =
    useState(() => getSavedShippingProtectionSelection());

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!cartItems.length) {
      cartExpiryRef.current = 0;
      removeStoredCart();
      return;
    }

    const keepStoredExpiration =
      isInitialCartPersistenceRef.current && cartExpiryRef.current > Date.now();

    isInitialCartPersistenceRef.current = false;

    if (keepStoredExpiration) return;

    const expiresAt = Date.now() + CART_STORAGE_TTL_MS;
    cartExpiryRef.current = expiresAt;
    persistCart(cartItems, expiresAt);
  }, [cartItems]);

  useEffect(() => {
    if (typeof window === "undefined" || !cartItems.length) return undefined;

    const remainingMs = cartExpiryRef.current - Date.now();

    if (remainingMs <= 0) {
      removeStoredCart({ clearCheckoutSessions: true });
      setCartItems([]);
      setShippingProtectionSelectedState(false);
      persistShippingProtectionSelection({ selected: false });
      redirectExpiredCheckoutToCatalog();
      return undefined;
    }

    const expirationTimer = window.setTimeout(() => {
      removeStoredCart({ clearCheckoutSessions: true });
      setCartItems([]);
      setShippingProtectionSelectedState(false);
      persistShippingProtectionSelection({ selected: false });
      redirectExpiredCheckoutToCatalog();
    }, remainingMs);

    return () => window.clearTimeout(expirationTimer);
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
      const couponFromUrl = getCheckoutCouponFromUrl();
      const savedCoupon = getSavedCheckoutCoupon();

      if (savedCoupon) {
        setCheckoutCouponState(savedCoupon);
      }

      if (couponFromUrl) {
        trackAffiliateCouponEvent("click", couponFromUrl);
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

  const clearCartNotice = () => setCartNotice("");

  const addToCart = async (product) => {
    const requestedQuantity = Math.max(1, Number(product?.quantity || 1));
    const initialProduct = normalizeCartItem({
      ...product,
      quantity: requestedQuantity,
    });
    const liveInventory = await getLiveInventorySnapshot(initialProduct);
    const normalizedProduct = normalizeCartItem({
      ...liveInventory.item,
      quantity: requestedQuantity,
    });

    if (!liveInventory.available || liveInventory.purchaseLimit === 0) {
      const message = "This product is currently out of stock.";
      setCartNotice(message);
      setIsCartOpen(true);
      return { addedQuantity: 0, purchaseLimit: 0, message };
    }

    const incomingKey = normalizedProduct.cartKey;

    const currentItems = normalizeCartItems(cartItems);

    const existingTrackingIndex = findIndexByCartKey(currentItems, incomingKey);
    const existingQuantity =
      existingTrackingIndex === -1
        ? 0
        : Number(currentItems[existingTrackingIndex]?.quantity || 0);
    const nextQuantity = clampCartItemQuantity(
      normalizedProduct,
      existingQuantity + requestedQuantity,
    );
    const quantityActuallyAdded = Math.max(0, nextQuantity - existingQuantity);
    const purchaseLimit = getProductPurchaseLimit(normalizedProduct);
    const wasLimited = quantityActuallyAdded < requestedQuantity;
    const message = wasLimited
      ? purchaseLimit
        ? `Only ${purchaseLimit} unit${purchaseLimit === 1 ? " is" : "s are"} available. Your cart was adjusted to the current stock.`
        : "Your cart was adjusted to the available stock."
      : "";

    let trackingItems;

    if (existingTrackingIndex !== -1) {
      trackingItems = currentItems.map((item, index) =>
        index === existingTrackingIndex
          ? {
              ...item,
              quantity: nextQuantity,
            }
          : item,
      );
    } else {
      trackingItems = [...currentItems, normalizedProduct];
    }

    const trackingCheckoutUrl = buildOmnisendCheckoutUrl(trackingItems, {
      checkoutCoupon,
      account,
    });

    if (quantityActuallyAdded > 0) {
      pushOmnisendEvent(
        "added product to cart",
        trackingItems,
        { ...normalizedProduct, quantity: quantityActuallyAdded },
        trackingCheckoutUrl,
        { checkoutCoupon, account },
      );

      trackP1Event("AddToCart", {
        sku: getMetaPixelContentId(normalizedProduct),
        name: getMetaPixelItemName(normalizedProduct),
        price: getCartItemPrice(normalizedProduct),
        quantity: quantityActuallyAdded,
        value: Number(
          (
            getCartItemPrice(normalizedProduct) * quantityActuallyAdded
          ).toFixed(2),
        ),
      });
    }

    setCartItems((prevItems) => {
      const normalizedPrev = normalizeCartItems(prevItems);
      const existingIndex = findIndexByCartKey(normalizedPrev, incomingKey);

      let nextItems;

      if (existingIndex !== -1) {
        nextItems = normalizedPrev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                ...normalizedProduct,
                cartKey: incomingKey,
                quantity: clampCartItemQuantity(
                  { ...item, ...normalizedProduct, cartKey: incomingKey },
                  Number(item.quantity || 1) + requestedQuantity,
                ),
              }
            : item,
        );
      } else {
        nextItems = [
          ...normalizedPrev,
          { ...normalizedProduct, quantity: nextQuantity },
        ];
      }

      return nextItems;
    });

    setCartNotice(message);
    setIsCartOpen(true);
    return {
      addedQuantity: quantityActuallyAdded,
      purchaseLimit,
      message,
    };
  };

  const removeFromCart = (cartKey) => {
    setCartNotice("");
    setCartItems((prevItems) => {
      const normalizedPrev = normalizeCartItems(prevItems);
      const nextItems = normalizedPrev.filter(
        (item) => item.cartKey !== cartKey,
      );

      return nextItems;
    });
  };

  const updateQuantity = async (cartKey, amount) => {
    const requestedChange = Number(amount || 0);
    const currentItem = normalizeCartItems(cartItems).find(
      (item) => item.cartKey === cartKey,
    );

    if (!currentItem) return;

    const liveInventory =
      requestedChange > 0
        ? await getLiveInventorySnapshot(currentItem)
        : {
            available: true,
            item: currentItem,
            purchaseLimit: getProductPurchaseLimit(currentItem),
          };

    if (!liveInventory.available || liveInventory.purchaseLimit === 0) {
      setCartItems((prevItems) =>
        normalizeCartItems(prevItems).filter((item) => item.cartKey !== cartKey),
      );
      setCartNotice("This product is now out of stock and was removed from your cart.");
      return;
    }

    let limited = false;

    setCartItems((prevItems) => {
      const normalizedPrev = normalizeCartItems(prevItems);

      const nextItems = normalizedPrev
        .map((item) => {
          if (item.cartKey !== cartKey) return item;

          const inventoryItem = { ...item, ...liveInventory.item, cartKey };
          const newQty = Number(item.quantity || 1) + requestedChange;
          if (newQty <= 0) return null;

          const clampedQuantity = clampCartItemQuantity(inventoryItem, newQty);
          limited = clampedQuantity < newQty;

          return {
            ...inventoryItem,
            quantity: clampedQuantity,
          };
        })
        .filter(Boolean);

      return nextItems;
    });

    const purchaseLimit = liveInventory.purchaseLimit;
    setCartNotice(
      limited && purchaseLimit
        ? `Only ${purchaseLimit} unit${purchaseLimit === 1 ? " is" : "s are"} available.`
        : "",
    );
  };

  const setQuantity = async (cartKey, quantity) => {
    const nextQuantity = Number(quantity || 1);
    const currentItem = normalizeCartItems(cartItems).find(
      (item) => item.cartKey === cartKey,
    );

    if (!currentItem) return;

    const liveInventory =
      nextQuantity > Number(currentItem.quantity || 0)
        ? await getLiveInventorySnapshot(currentItem)
        : {
            available: true,
            item: currentItem,
            purchaseLimit: getProductPurchaseLimit(currentItem),
          };

    if (!liveInventory.available || liveInventory.purchaseLimit === 0) {
      setCartItems((prevItems) =>
        normalizeCartItems(prevItems).filter((item) => item.cartKey !== cartKey),
      );
      setCartNotice("This product is now out of stock and was removed from your cart.");
      return;
    }

    let limited = false;

    setCartItems((prevItems) => {
      const normalizedPrev = normalizeCartItems(prevItems);

      const nextItems = normalizedPrev
        .map((item) => {
          if (item.cartKey !== cartKey) return item;
          if (nextQuantity <= 0) return null;

          const inventoryItem = { ...item, ...liveInventory.item, cartKey };
          const clampedQuantity = clampCartItemQuantity(
            inventoryItem,
            nextQuantity,
          );
          limited = clampedQuantity < nextQuantity;

          return { ...inventoryItem, quantity: clampedQuantity };
        })
        .filter(Boolean);

      return nextItems;
    });

    const purchaseLimit = liveInventory.purchaseLimit;
    setCartNotice(
      limited && purchaseLimit
        ? `Only ${purchaseLimit} unit${purchaseLimit === 1 ? " is" : "s are"} available.`
        : "",
    );
  };

  const normalizedCartItems = normalizeCartItems(cartItems);
  const paidSubtotal = getPaidSubtotal(normalizedCartItems);
  const bundleUnlocked = normalizedCartItems.some(
    (item) => item.phaseone_bundle_active,
  );
  const bundleDiscountPercent = Math.max(
    0,
    ...normalizedCartItems.map((item) =>
      Number(item.phaseone_bundle_discount_percent || 0),
    ),
  );
  const bundleRequiredQuantity = bundleDiscountPercent >= 30 ? 10 : bundleDiscountPercent ? 5 : 0;
  const subtotalBeforeBundle = normalizedCartItems.reduce(
    (total, item) =>
      total +
      Number(item.phaseone_price_before_bundle ?? item.price ?? 0) *
        Number(item.quantity || 1),
    0,
  );
  const cartTotal = normalizedCartItems.reduce(
    (total, item) =>
      total + getCartItemPrice(item) * Number(item.quantity || 1),
    0,
  );
  const bundleDiscountAmount = bundleUnlocked
    ? roundMoney(subtotalBeforeBundle - cartTotal)
    : 0;
  const shippingProtectionInsuredValue = roundMoney(paidSubtotal);
  const shippingProtectionAmount = calculateShippingProtectionAmount(
    shippingProtectionInsuredValue,
  );
  const checkoutTotal = roundMoney(
    cartTotal + (shippingProtectionSelected ? shippingProtectionAmount : 0),
  );
  const cartCount = normalizedCartItems.reduce(
    (count, item) => count + Number(item.quantity || 1),
    0,
  );

  useEffect(() => {
    persistShippingProtectionSelection({
      selected: shippingProtectionSelected && normalizedCartItems.length > 0,
      amount: shippingProtectionAmount,
      insuredValue: shippingProtectionInsuredValue,
    });
  }, [
    shippingProtectionSelected,
    shippingProtectionAmount,
    shippingProtectionInsuredValue,
    normalizedCartItems.length,
  ]);

  const setShippingProtectionSelected = (value) => {
    const nextValue = Boolean(value) && normalizedCartItems.length > 0;
    setShippingProtectionSelectedState(nextValue);
    return nextValue;
  };

  const clearCart = () => {
    setCartItems([]);
    setShippingProtectionSelectedState(false);
    persistShippingProtectionSelection({ selected: false });

    if (typeof window !== "undefined") {
      removeStoredCart({ clearCheckoutSessions: true });
    }
  };

  const buildCheckoutUrl = () => {
    if (typeof window === "undefined") {
      console.error("Checkout can only be started in the browser.");
      return null;
    }

    return createCheckoutRecoveryUrl(
      normalizeCartItems(cartItems),
      {
        checkoutCoupon,
        account,
        shippingProtectionSelected,
        shippingProtectionAmount,
        shippingProtectionInsuredValue,
        cartExpiresAt: cartExpiryRef.current,
        source: "phaseone_cart_drawer_custom_checkout",
      },
      `${window.location.origin}/checkout`,
    );
  };

  const checkout = async () => {
    if (checkoutLoading) return;

    if (!cartItems || cartItems.length === 0) {
      setIsCartOpen(true);
      return;
    }

    setCheckoutLoading(true);

    const itemsBeforeCheckout = normalizeCartItems(cartItems);
    const inventoryResults = await Promise.all(
      itemsBeforeCheckout.map((item) => getLiveInventorySnapshot(item)),
    );
    const reconciledItems = [];
    let inventoryChanged = false;

    inventoryResults.forEach((result, index) => {
      const currentItem = itemsBeforeCheckout[index];

      if (!result.available || result.purchaseLimit === 0) {
        inventoryChanged = true;
        return;
      }

      const inventoryItem = {
        ...currentItem,
        ...result.item,
        cartKey: currentItem.cartKey,
      };
      const quantity = clampCartItemQuantity(
        inventoryItem,
        currentItem.quantity,
      );

      if (quantity !== Number(currentItem.quantity || 0)) {
        inventoryChanged = true;
      }

      reconciledItems.push({ ...inventoryItem, quantity });
    });

    if (inventoryChanged) {
      setCartItems(normalizeCartItems(reconciledItems));
      setCartNotice(
        "Stock changed while you were shopping. We updated your cart; please review it before checkout.",
      );
      setIsCartOpen(true);
      setCheckoutLoading(false);
      return;
    }

    const checkoutUrl = buildCheckoutUrl();

    if (!checkoutUrl) {
      console.error("Could not build checkout URL.");
      setCheckoutLoading(false);
      return;
    }

    const checkoutItemsForTracking = normalizeCartItems(cartItems);

    pushOmnisendEvent(
      "started checkout",
      checkoutItemsForTracking,
      null,
      checkoutUrl,
      { checkoutCoupon, account },
    );

    trackP1Event("InitiateCheckout", {
      value: checkoutTotal,
      items: checkoutItemsForTracking.map((item) => ({
        sku: getMetaPixelContentId(item),
        name: getMetaPixelItemName(item),
        price: getCartItemPrice(item),
        quantity: Number(item.quantity || 1),
      })),
    });

    console.log("Sending cart to WordPress checkout:", checkoutUrl);

    window.location.href = checkoutUrl;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems: normalizedCartItems,
        cartNotice,
        clearCartNotice,
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
        bundleUnlocked,
        bundleDiscountAmount,
        bundleDiscountPercent,
        bundleRequiredQuantity,
        rewardProgress: null,
        rewardGifts: [],
        rewardProducts: {},
        checkoutCoupon,
        setCheckoutCoupon,
        shippingProtectionSelected,
        setShippingProtectionSelected,
        shippingProtectionAmount,
        shippingProtectionInsuredValue,
        checkoutTotal,
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
