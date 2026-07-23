import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  BadgeCheck,
  Gift,
  Lock,
  CreditCard,
  Building2,
  Smartphone,
  Landmark,
  PackageCheck,
  Truck,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useCart } from "../cart/CartContext";

const ACCOUNT_ENDPOINT = "/api/account/me";
const PRISM_CHECKOUT_ENDPOINT = "/api/prism/checkout";
const VALIDATE_COUPON_ENDPOINT =
  "https://staging.phaseonelabz.com/wp-json/phaseone/v1/validate-coupon";
const WOO_URL =
  import.meta.env.PUBLIC_WOOCOMMERCE_URL || "https://staging.phaseonelabz.com";
const PAYMENT_DISCOUNT_RATE = 0.05;
const FREE_SHIPPING_MINIMUM = 100;
const MANUAL_PAYMENT_SHIPPING_COST = 13;
const PAYMENT_DISCOUNT_METHOD_IDS = ["venmo", "zelle", "bank"];
const MANUAL_PAYMENT_METHOD_IDS = ["venmo", "zelle"];

// Manual Venmo/Zelle details.
// Set these in your .env before publishing so the public checkout shows your real payment info.
const VENMO_PAYMENT_URL =
  import.meta.env.PUBLIC_VENMO_PAYMENT_URL ||
  "https://venmo.com/code?user_id=4599396356327117666&created=1782763350.789482&printed=1";
const VENMO_PAYMENT_HANDLE =
  import.meta.env.PUBLIC_VENMO_PAYMENT_HANDLE || "Phase One Labz";
const ZELLE_PAYMENT_RECIPIENT =
  import.meta.env.PUBLIC_ZELLE_PAYMENT_RECIPIENT || "Info@phaseonelabz.com";
const ZELLE_PAYMENT_NAME =
  import.meta.env.PUBLIC_ZELLE_PAYMENT_NAME || "Phase One Labz";

const MANUAL_PAYMENT_DETAILS = {
  venmo: {
    title: "Venmo",
    recipientLabel: "Venmo",
    recipientValue: VENMO_PAYMENT_HANDLE,
    extraRecipientLine:
      "Payment details appear here after the order is created.",
    actionLabel: "Open Venmo",
    actionHref: VENMO_PAYMENT_URL,
  },
  zelle: {
    title: "Zelle",
    recipientLabel: "Zelle",
    recipientValue: ZELLE_PAYMENT_RECIPIENT,
    extraRecipientLine: ZELLE_PAYMENT_NAME,
    actionLabel: "",
    actionHref: "",
  },
};

const PAYMENT_METHODS = [
  {
    id: "card",
    label: "Card & wallets",
    title: "Card",
    description: "Credit or debit card, Apple Pay, Google Pay, Link and other eligible methods.",
    badge: "Secure",
    flow: "secure_checkout",
    gatewayId: "",
    icon: CreditCard,
    cta: "Pay securely",
  },
  {
    id: "venmo",
    label: "Venmo",
    title: "Venmo",
    description: "Place the order now and receive the exact Venmo payment details.",
    badge: "5% OFF",
    flow: "manual_order",
    gatewayId: "",
    icon: Smartphone,
    cta: "Place Venmo order",
  },
  {
    id: "zelle",
    label: "Zelle",
    title: "Zelle",
    description: "Place the order now and receive the exact Zelle payment details.",
    badge: "5% OFF",
    flow: "manual_order",
    gatewayId: "",
    icon: Building2,
    cta: "Place Zelle order",
  },
  {
    id: "bank",
    label: "Bank transfer",
    title: "Bank Transfer / ACH",
    description: "Continue to the secure ACH bank transfer portal.",
    badge: "5% OFF",
    flow: "bank_transfer_yodlee",
    gatewayId: "edd_draft_yodlee_gateway",
    icon: Landmark,
    cta: "Continue to ACH",
  },
];

const US_STATES = [
  ["", "Select..."],
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
];

const FEDEX_SHIPPING_METHODS = [
  {
    id: "fedex",
    title: "FedEx Shipping",
    description: "Estimated 3–5 business days after processing.",
    price: 13,
    method_id: "flat_rate",
  },
];

const POLICY_LINKS = {
  terms: "/terms-and-conditions/",
  refund: "/refund-policy/",
  researchUse: "/research-use-only/",
};

const POLICY_ACKNOWLEDGEMENT_TEXT =
  "I confirm I am 21 or older, I am acquiring these compounds for in-vitro research or laboratory use only, and I agree to the Terms & Conditions, Refund Policy, and Research Use Only policy.";

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function looksLikeHtmlResponse(value = "") {
  const clean = String(value || "")
    .trim()
    .toLowerCase();

  return (
    clean.startsWith("<!doctype html") ||
    clean.startsWith("<html") ||
    clean.includes("<body")
  );
}

function cleanWooUrl(value = "") {
  return String(value || "").replace(/\/$/, "");
}

function getBankTransferEndpoint() {
  const wpUrl =
    import.meta.env.PUBLIC_WP_SITE_URL ||
    import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
    WOO_URL ||
    "";

  const cleanUrl = cleanWooUrl(wpUrl);

  if (!cleanUrl) return "";

  return `${cleanUrl}/wp-json/phase/v1/create-edebit-order`;
}

function getManualPaymentOrderEndpoint() {
  const wpUrl =
    import.meta.env.PUBLIC_WP_SITE_URL ||
    import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
    WOO_URL ||
    "";

  const cleanUrl = cleanWooUrl(wpUrl);

  if (!cleanUrl) return "";

  return `${cleanUrl}/wp-json/phase/v1/manual-payment-order`;
}

function getCleanCheckoutUrl() {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.href);

  url.searchParams.delete("bank_transfer_resume");
  url.searchParams.delete("bank_redirecting");
  url.searchParams.delete("payment_method");
  url.searchParams.delete("phaseone_payment_method");

  return url.toString();
}

function prepareBankTransferBackRoute() {
  if (typeof window === "undefined") return;

  const cleanCheckoutUrl = getCleanCheckoutUrl();

  if (!cleanCheckoutUrl) return;

  localStorage.setItem("phaseone_bank_transfer_return_url", cleanCheckoutUrl);

  const backUrl = new URL(cleanCheckoutUrl);
  backUrl.searchParams.set("bank_transfer_resume", "1");

  window.history.pushState(
    { phaseoneBankTransferReturn: true },
    "",
    backUrl.toString(),
  );
}

function recoverBankTransferBackRoute() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  if (!params.get("bank_transfer_resume")) return;

  const cleanCheckoutUrl =
    localStorage.getItem("phaseone_bank_transfer_return_url") ||
    getCleanCheckoutUrl();

  if (!cleanCheckoutUrl) return;

  window.history.replaceState(
    { phaseoneCheckoutRecovered: true },
    "",
    cleanCheckoutUrl,
  );
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(number);
}

function normalizeCoupon(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 32);
}

function sanitizeCouponInput(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_\s,;]/g, "")
    .slice(0, 120);
}

function normalizeCouponList(value = "") {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  const codes = raw
    .split(/[\s,;]+/g)
    .map((code) => normalizeCoupon(code))
    .filter(Boolean);

  const uniqueCodes = [];

  codes.forEach((code) => {
    if (!uniqueCodes.includes(code)) uniqueCodes.push(code);
  });

  return uniqueCodes.slice(0, 3);
}

function formatCouponList(value = "") {
  return normalizeCouponList(value).join(", ");
}

function setPhaseoneCouponCookie(value = "") {
  if (typeof document === "undefined") return "";

  const cleanCoupon = normalizeCoupon(value);

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

  document.cookie =
    "phaseone_tagada_coupon=; Path=/; Max-Age=0; SameSite=Lax; Secure";
  document.cookie =
    "phaseone_tagada_coupon=; Path=/; Domain=.phaseonelabz.com; Max-Age=0; SameSite=Lax; Secure";

  try {
    window.sessionStorage?.removeItem("phaseone_tagada_coupon");
    window.localStorage?.removeItem("phaseone_tagada_coupon");
  } catch {
    // Ignore.
  }
}

function normalizeEmail(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value = "") {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPaymentDiscountEligible(methodId = "") {
  return PAYMENT_DISCOUNT_METHOD_IDS.includes(String(methodId || ""));
}

function isManualPaymentMethod(methodId = "") {
  return MANUAL_PAYMENT_METHOD_IDS.includes(String(methodId || ""));
}

function getManualPaymentDetails(methodId = "") {
  if (!isManualPaymentMethod(methodId)) return null;
  return MANUAL_PAYMENT_DETAILS[String(methodId || "")] || null;
}

function getPaymentDiscountAmount(methodId = "", amount = 0) {
  if (!isPaymentDiscountEligible(methodId)) return 0;

  const cleanAmount = Math.max(Number(amount || 0), 0);

  return Number((cleanAmount * PAYMENT_DISCOUNT_RATE).toFixed(2));
}

function getPaymentDiscountLabel(method = {}) {
  if (!isPaymentDiscountEligible(method?.id)) return "";

  if (method?.id === "bank") return "ACH 5% discount";

  return `${method?.label || method?.title || "Payment"} 5% discount`;
}

function getAccountToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("lab_auth_token") || "";
}

function getUrlCoupon() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);

  const fromUrl =
    params.get("coupon") ||
    params.get("coupon_code") ||
    params.get("discount_code") ||
    params.get("promo") ||
    params.get("affiliate_coupon") ||
    params.get("phaseone_coupon") ||
    params.get("phaseone_tagada_coupon") ||
    params.get("phaseone_coupon_to_tagada") ||
    params.get("ref") ||
    "";

  return normalizeCoupon(fromUrl);
}

function persistLockedUrlCoupon(value = "") {
  if (typeof window === "undefined") return "";

  const cleanCoupon = normalizeCoupon(value);

  if (!cleanCoupon) return "";

  localStorage.setItem("phaseone_checkout_coupon", cleanCoupon);
  localStorage.setItem("phaseone_affiliate_coupon", cleanCoupon);
  localStorage.setItem("phaseone_locked_checkout_coupon", cleanCoupon);
  localStorage.setItem("phaseone_coupon_locked_from_url", "1");
  setPhaseoneCouponCookie(cleanCoupon);

  return cleanCoupon;
}

function getStoredLockedCoupon() {
  if (typeof window === "undefined") return "";

  const lockedFlag =
    localStorage.getItem("phaseone_coupon_locked_from_url") === "1";
  const lockedCoupon = normalizeCoupon(
    localStorage.getItem("phaseone_locked_checkout_coupon") || "",
  );

  if (lockedFlag && lockedCoupon) return lockedCoupon;

  return "";
}

function getSavedCoupon() {
  if (typeof window === "undefined") return "";

  const cleanFromUrl = getUrlCoupon();

  /*
    Important:
    The coupon can disappear from the visible URL after the customer navigates
    from /?coupon=CODE to /shop or /checkout. We keep that original referral
    code in localStorage and keep it locked until checkout.
  */
  if (cleanFromUrl) {
    return persistLockedUrlCoupon(cleanFromUrl);
  }

  return getStoredLockedCoupon();
}

function saveCoupon(value = "") {
  if (typeof window === "undefined") return "";

  const couponCodes = normalizeCouponList(value);
  const cleanCoupon = couponCodes.join(",");
  const readableCoupon = couponCodes.join(", ");

  if (cleanCoupon) {
    localStorage.setItem("phaseone_checkout_coupon", cleanCoupon);
    localStorage.setItem("phaseone_affiliate_coupon", cleanCoupon);

    // Legacy Tagada/Woo bridge receives the first code for backward compatibility.
    // The full list is also sent later as phaseone_coupons.
    setPhaseoneCouponCookie(couponCodes[0]);
  } else {
    localStorage.removeItem("phaseone_checkout_coupon");
    localStorage.removeItem("phaseone_affiliate_coupon");
    localStorage.removeItem("phaseone_locked_checkout_coupon");
    localStorage.removeItem("phaseone_coupon_locked_from_url");
    clearPhaseoneCouponCookie();
  }

  return readableCoupon;
}

function isRewardGiftItem(item = {}) {
  return Boolean(
    item?.isRewardGift ||
    item?.is_reward_gift ||
    item?.rewardLabel ||
    item?.reward_label ||
    String(item?.cartKey || "").startsWith("reward:"),
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

function getNestedValue(source = {}, path = []) {
  return path.reduce((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return current[key];
  }, source);
}

function toMoneyNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === ".") return fallback;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
}

function getCartItemQuantity(item = {}) {
  const quantity = Number(item.quantity ?? item.qty ?? item.count ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getOfficialProductId(item = {}) {
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
    item.parent?.id,
    item.parent?.databaseId,
    item.product?.id,
    item.product?.databaseId,
    item.product?.product_id,
    item.product?.productId,
    item.product?.wc_product_id,
    item.node?.id,
    item.node?.databaseId,
    item.data?.product_id,
    item.raw?.product_id,
    item.merchandise?.product?.id,
    item.merchandise?.product?.databaseId,
    item.variant?.product_id,
    item.selectedVariant?.product_id,
    item.id,
  );
}

function getOfficialVariationId(item = {}) {
  return resolveNumericId(
    item.variation_id,
    item.variationId,
    item.selectedVariationId,
    item.selected_variation_id,
    item.variant_id,
    item.variantId,
    item.databaseVariationId,
    item.variationDatabaseId,
    item.variation?.id,
    item.variation?.databaseId,
    item.variant?.id,
    item.variant?.databaseId,
    item.selectedVariant?.id,
    item.selectedVariant?.databaseId,
    item.merchandise?.id,
    item.merchandise?.databaseId,
    item.data?.variation_id,
    item.raw?.variation_id,
  );
}

function getCartItemUnitPrice(item = {}) {
  if (isRewardGiftItem(item)) return 0;

  const directCandidates = [
    item.price,
    item.sale_price,
    item.salePrice,
    item.regular_price,
    item.regularPrice,
    item.unit_price,
    item.unitPrice,
    item.product_price,
    item.productPrice,
    item.final_price,
    item.amount,
    getNestedValue(item, ["prices", "price"]),
    getNestedValue(item, ["price_data", "unit_amount"]),
  ];

  for (const candidate of directCandidates) {
    const number = toMoneyNumber(candidate, NaN);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }

  const quantity = getCartItemQuantity(item);
  const lineCandidates = [
    item.line_total,
    item.lineTotal,
    item.total,
    item.subtotal,
    item.row_total,
    item.rowTotal,
    item.order_total,
    item.orderTotal,
    item.final_line_total,
    item.finalLineTotal,
  ];

  for (const candidate of lineCandidates) {
    const number = toMoneyNumber(candidate, NaN);
    if (Number.isFinite(number) && number > 0) {
      return Number((number / quantity).toFixed(2));
    }
  }

  return 0;
}

function getCartItemPrice(item = {}) {
  return getCartItemUnitPrice(item);
}

function getCartItemLineTotal(item = {}) {
  if (isRewardGiftItem(item)) return 0;

  const lineCandidates = [
    item.line_total,
    item.lineTotal,
    item.total,
    item.subtotal,
    item.row_total,
    item.rowTotal,
    item.order_total,
    item.orderTotal,
    item.final_line_total,
    item.finalLineTotal,
  ];

  for (const candidate of lineCandidates) {
    const number = toMoneyNumber(candidate, NaN);
    if (Number.isFinite(number) && number > 0) {
      return Number(number.toFixed(2));
    }
  }

  return Number(
    (getCartItemUnitPrice(item) * getCartItemQuantity(item)).toFixed(2),
  );
}

function calculateCartTotal(items = []) {
  return items.reduce((total, item) => {
    return total + getCartItemLineTotal(item);
  }, 0);
}

function getItemImage(item = {}) {
  return (
    item.image ||
    item.image_url ||
    item.imageUrl ||
    item.thumbnail ||
    item.images?.[0]?.src ||
    item.images?.[0]?.url ||
    item.featuredImage ||
    item.product?.image ||
    item.product?.images?.[0]?.src ||
    "/tarro.png"
  );
}

function getItemName(item = {}) {
  return (
    item.name ||
    item.title ||
    item.product_name ||
    item.productName ||
    item.product?.name ||
    item.product?.title ||
    "Item"
  );
}

function getItemOptions(item = {}) {
  if (item.selectedOption) return item.selectedOption;

  const selected =
    item.selectedAttributes ||
    item.selectedOptions ||
    item.variation ||
    item.variation_attributes ||
    item.attributes ||
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

function getVisibleCartItems(items = []) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function chooseManualThanksItems(orderItems = [], currentCartItems = []) {
  const safeOrderItems = Array.isArray(orderItems)
    ? orderItems.filter(Boolean)
    : [];
  const safeCartItems = getVisibleCartItems(currentCartItems);

  if (!safeOrderItems.length) return safeCartItems;
  if (!safeCartItems.length) return safeOrderItems;

  const orderTotal = safeOrderItems.reduce(
    (sum, item) => sum + getCartItemLineTotal(item),
    0,
  );
  const cartTotalValue = safeCartItems.reduce(
    (sum, item) => sum + getCartItemLineTotal(item),
    0,
  );

  if (safeOrderItems.length < safeCartItems.length) return safeCartItems;
  if (cartTotalValue > 0 && orderTotal <= 0) return safeCartItems;

  return safeOrderItems;
}

function buildCheckoutItems(cartItems = []) {
  /* Used for coupon validation, ACH, and manual Zelle/Venmo orders. Rewards remain visual only. */
  const officialItems = getVisibleCartItems(cartItems)
    .filter((item) => !isRewardGiftItem(item))
    .map((item) => {
      const quantity = getCartItemQuantity(item);
      const unitPrice = getCartItemUnitPrice(item);
      const lineTotal = getCartItemLineTotal(item);

      return {
        product_id: getOfficialProductId(item),
        variation_id: getOfficialVariationId(item),
        quantity,
        price: unitPrice,
        unit_price: unitPrice,
        line_total: lineTotal,
        total: lineTotal,
        regular_price: toMoneyNumber(
          item.regular_price || item.regularPrice || item.price,
          unitPrice,
        ),
        sale_price: toMoneyNumber(
          item.sale_price || item.salePrice || item.price,
          unitPrice,
        ),
        name: getItemName(item),
        title: getItemName(item),
        image: getItemImage(item),
        cart_key: item.cartKey || item.cart_key || item.key || "",
        sku: item.sku || item.product?.sku || "",
        variation:
          item.variation ||
          item.variation_attributes ||
          item.selectedAttributes ||
          item.selectedOptions ||
          {},
      };
    })
    .filter((item) => (item.product_id > 0 || item.name) && item.quantity > 0);

  console.log("PHASE ONE official checkout items:", officialItems);

  return officialItems;
}

function encodeCheckoutPayload(payload) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch {
    return "";
  }
}

function getAccountName(user = {}) {
  const fullName = [
    user.firstName || user.first_name,
    user.lastName || user.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return fullName || user.displayName || user.display_name || user.name || "";
}

function splitName(fullName = "") {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

function pickFirstValue(...values) {
  for (const value of values) {
    const clean = String(value || "").trim();

    if (clean) return clean;
  }

  return "";
}

function buildManualPaymentReference(source = {}) {
  const directReference = pickFirstValue(
    source?.payment_reference,
    source?.paymentReference,
    source?.reference,
  );

  if (directReference && !/[0-9a-f]{8}-[0-9a-f]{4}/i.test(directReference)) {
    return directReference
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 18);
  }

  const rawOrderNumber = pickFirstValue(
    source?.order_number,
    source?.orderNumber,
    source?.number,
    source?.order_id,
    source?.orderId,
    source?.id,
  );

  const cleanOrderNumber = String(rawOrderNumber || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 10);

  if (cleanOrderNumber) {
    return `PO-${cleanOrderNumber}`;
  }

  return "";
}

function getManualOrderStorageSuffix(session = {}) {
  return (
    String(
      session?.checkout_session ||
        session?.session_id ||
        session?.sessionId ||
        getSessionIdFromUrl() ||
        "current",
    )
      .replace(/[^a-zA-Z0-9-]/g, "")
      .slice(0, 40) || "current"
  );
}

function normalizeManualOrderData(data = {}) {
  const order = data?.order || data || {};
  const orderId = Number(
    order?.order_id ||
      order?.orderId ||
      order?.id ||
      data?.order_id ||
      data?.orderId ||
      0,
  );

  if (!orderId) return null;

  const orderNumber = String(
    order?.order_number ||
      order?.orderNumber ||
      order?.number ||
      data?.order_number ||
      data?.orderNumber ||
      orderId,
  );

  const paymentReference = buildManualPaymentReference({
    payment_reference:
      order?.payment_reference ||
      order?.paymentReference ||
      data?.payment_reference ||
      data?.paymentReference,
    order_number: orderNumber,
    order_id: orderId,
  });

  return {
    ...order,
    order_id: orderId,
    order_number: orderNumber,
    payment_reference: paymentReference,
    payment_method:
      order?.payment_method ||
      order?.paymentMethod ||
      data?.payment_method ||
      data?.paymentMethod ||
      "",
    payment_method_title:
      order?.payment_method_title ||
      order?.paymentMethodTitle ||
      data?.payment_method_title ||
      data?.paymentMethodTitle ||
      "",
    total: Number(
      order?.total ??
        order?.order_total ??
        data?.total ??
        data?.order_total ??
        0,
    ),
    expires_at:
      order?.expires_at ||
      order?.expiresAt ||
      data?.expires_at ||
      data?.expiresAt ||
      "",
  };
}

function normalizeCheckoutAddress(source = {}, fallback = {}) {
  const data = source && typeof source === "object" ? source : {};
  const fallbackData = fallback && typeof fallback === "object" ? fallback : {};

  return {
    first_name: pickFirstValue(
      data.first_name,
      data.firstName,
      fallbackData.first_name,
      fallbackData.firstName,
    ),
    last_name: pickFirstValue(
      data.last_name,
      data.lastName,
      fallbackData.last_name,
      fallbackData.lastName,
    ),
    company: pickFirstValue(data.company, fallbackData.company),
    email: pickFirstValue(data.email, fallbackData.email),
    phone: pickFirstValue(data.phone, fallbackData.phone),
    address_1: pickFirstValue(
      data.address_1,
      data.address1,
      data.address,
      fallbackData.address_1,
      fallbackData.address1,
      fallbackData.address,
    ),
    address_2: pickFirstValue(
      data.address_2,
      data.address2,
      fallbackData.address_2,
      fallbackData.address2,
    ),
    city: pickFirstValue(data.city, fallbackData.city),
    state: pickFirstValue(data.state, fallbackData.state),
    postcode: pickFirstValue(
      data.postcode,
      data.zip,
      data.postalCode,
      fallbackData.postcode,
      fallbackData.zip,
      fallbackData.postalCode,
    ),
    country: pickFirstValue(data.country, fallbackData.country, "US"),
  };
}

function getSessionCustomerData(session = {}, accountUser = {}) {
  const customerName = String(
    getAccountName(accountUser || {}) ||
      session?.customer?.name ||
      session?.customer_name ||
      session?.billing?.name ||
      session?.billingAddress?.name ||
      "",
  ).trim();

  const { firstName, lastName } = splitName(customerName);

  const customerEmail = pickFirstValue(
    accountUser?.email,
    accountUser?.user_email,
    session?.customer?.email,
    session?.customer_email,
    session?.billing?.email,
    session?.billingAddress?.email,
    session?.billing_email,
  );

  const customerPhone = pickFirstValue(
    accountUser?.phone,
    accountUser?.billing?.phone,
    session?.customer?.phone,
    session?.customer_phone,
    session?.billing?.phone,
    session?.billingAddress?.phone,
    session?.billing_phone,
  );

  const baseCustomer = {
    first_name: pickFirstValue(
      accountUser?.first_name,
      accountUser?.firstName,
      firstName,
    ),
    last_name: pickFirstValue(
      accountUser?.last_name,
      accountUser?.lastName,
      lastName,
    ),
    email: customerEmail,
    phone: customerPhone,
  };

  const billing = normalizeCheckoutAddress(
    session?.billing ||
      session?.billingAddress ||
      session?.billing_address ||
      {},
    baseCustomer,
  );

  const shipping = normalizeCheckoutAddress(
    session?.shipping ||
      session?.shippingAddress ||
      session?.shipping_address ||
      {},
    billing,
  );

  return {
    customer: {
      firstName: billing.first_name,
      lastName: billing.last_name,
      email: billing.email,
      phone: billing.phone,
    },
    billing,
    shipping,
  };
}

function getBlankCheckoutForm() {
  return {
    email: "",
    country: "US",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    phone: "",
  };
}

function buildCheckoutFormData(
  session = {},
  accountUser = {},
  fallbackEmail = "",
) {
  const data = getSessionCustomerData(session || {}, accountUser || {});
  const billing = data.billing || {};
  const shipping = data.shipping || billing || {};

  return {
    email: normalizeEmail(
      billing.email || data.customer?.email || fallbackEmail,
    ),
    country: shipping.country || billing.country || "US",
    firstName:
      shipping.first_name ||
      billing.first_name ||
      data.customer?.firstName ||
      "",
    lastName:
      shipping.last_name || billing.last_name || data.customer?.lastName || "",
    address1: shipping.address_1 || billing.address_1 || "",
    address2: shipping.address_2 || billing.address_2 || "",
    city: shipping.city || billing.city || "",
    state: shipping.state || billing.state || "",
    postcode: shipping.postcode || billing.postcode || "",
    phone: shipping.phone || billing.phone || data.customer?.phone || "",
  };
}

function mergeOnlyEmptyFields(current = {}, next = {}) {
  const merged = { ...current };

  Object.entries(next || {}).forEach(([key, value]) => {
    if (
      (merged[key] === "" ||
        merged[key] === undefined ||
        merged[key] === null) &&
      value
    ) {
      merged[key] = value;
    }
  });

  return merged;
}

function normalizeCheckoutFormForOrder(form = {}) {
  return {
    first_name: String(form.firstName || "").trim(),
    last_name: String(form.lastName || "").trim(),
    email: normalizeEmail(form.email || ""),
    phone: String(form.phone || "").trim(),
    address_1: String(form.address1 || "").trim(),
    address_2: String(form.address2 || "").trim(),
    city: String(form.city || "").trim(),
    state: String(form.state || "").trim(),
    postcode: String(form.postcode || "").trim(),
    country: String(form.country || "US").trim().toUpperCase(),
  };
}

function formatAddressBlock(address = {}) {
  const clean = normalizeCheckoutAddress(address || {}, {});
  const fullName = [clean.first_name, clean.last_name]
    .filter(Boolean)
    .join(" ");
  const cityLine = [clean.city, clean.state, clean.postcode]
    .filter(Boolean)
    .join(", ");

  return {
    fullName,
    lines: [clean.address_1, clean.address_2, cityLine, clean.country].filter(
      Boolean,
    ),
    phone: clean.phone,
    email: normalizeEmail(clean.email || ""),
  };
}

function getSessionIdFromUrl() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  return (
    params.get("checkout_session") ||
    params.get("session") ||
    params.get("phaseone_session") ||
    ""
  );
}

function readPendingCheckoutSession() {
  if (typeof window === "undefined") return null;

  const sessionId = getSessionIdFromUrl();

  if (sessionId) {
    const direct = safeJsonParse(
      localStorage.getItem(`phaseone_checkout_session_${sessionId}`),
      null,
    );

    if (direct)
      return { ...direct, session_id: direct.session_id || sessionId };
  }

  const pending = safeJsonParse(
    localStorage.getItem("phaseone_pending_checkout"),
    null,
  );

  if (pending) return pending;

  return null;
}

function buildWooCheckoutUrl({
  session,
  cartItems,
  coupon,
  discountToken,
  discountAmount,
  previewTotal,
  accountUser,
  cashbackToApply,
  paymentMethod,
  paymentDiscountAmount,
  paymentDiscountRate,
  policyAcknowledged,
}) {
  const fromSession =
    session?.woo_checkout_url ||
    session?.wooCheckoutUrl ||
    session?.checkout_url ||
    session?.checkoutUrl ||
    "";

  let url = null;

  try {
    if (fromSession) {
      url = new URL(fromSession);
    }
  } catch {
    url = null;
  }

  if (!url) {
    const cleanUrl = cleanWooUrl(WOO_URL);

    if (!cleanUrl) return null;

    const checkoutItems =
      session?.checkout_items ||
      session?.checkoutItems ||
      buildCheckoutItems(cartItems);

    const encodedPayload =
      session?.lab_checkout_payload ||
      session?.encoded_payload ||
      encodeCheckoutPayload(checkoutItems);

    const legacyItems =
      session?.lab_checkout ||
      checkoutItems
        .map((item) => {
          const productId = Number(item.product_id);
          const variationId = Number(item.variation_id || 0);
          const idForLegacy = variationId || productId;

          return `${idForLegacy}:${Number(item.quantity || 1)}`;
        })
        .join(",");

    url = new URL(`${cleanUrl}/checkout/`);
    url.searchParams.set("phaseone_cart_sync", "1");
    url.searchParams.set("lab_checkout_payload", encodedPayload);
    url.searchParams.set("lab_checkout", legacyItems);
  }

  const couponCodes = normalizeCouponList(coupon);
  const cleanCoupon = couponCodes[0] || "";
  const cleanCoupons = couponCodes.join(",");
  const token = session?.auth_token || session?.token || getAccountToken();

  const customerEmail = String(
    accountUser?.email ||
      session?.customer?.email ||
      session?.customer_email ||
      "",
  ).trim();

  const customerName = String(
    getAccountName(accountUser || {}) ||
      session?.customer?.name ||
      session?.customer_name ||
      "",
  ).trim();

  const { firstName, lastName } = splitName(customerName);

  if (cleanCoupon) {
    /*
      Safe handoff for Tagada only.
      This custom parameter is ignored by WooCommerce add_to_cart and the
      WordPress cart-sync snippet forwards it only after products are synced.
    */
    setPhaseoneCouponCookie(cleanCoupon);
    url.searchParams.set("phaseone_tagada_coupon", cleanCoupon);
  }

  if (cleanCoupons && discountToken) {
    /*
      Keep the original working WooCommerce coupon bridge flow.
      Do not send generic coupon/coupon_code/discount_code/promo params here,
      because they can interfere before the cart sync finishes.
      For multiple coupons, the first code/token remains in the legacy fields and
      the full list is available in phaseone_coupons / phaseone_discount_tokens.
    */
    const discountTokens = String(discountToken || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    url.searchParams.set("phaseone_coupon", cleanCoupon);
    url.searchParams.set("phaseone_coupons", cleanCoupons);
    url.searchParams.set("phaseone_coupon_count", String(couponCodes.length));
    url.searchParams.set(
      "phaseone_discount_token",
      discountTokens[0] || discountToken,
    );
    url.searchParams.set("phaseone_discount_tokens", discountTokens.join(","));
    url.searchParams.set(
      "phaseone_discount_amount",
      String(Number(discountAmount || 0)),
    );
    url.searchParams.set(
      "phaseone_preview_total",
      String(Number(previewTotal || 0)),
    );
  }

  if (token) {
    url.searchParams.set("lab_auth_token", token);
  }

  if (customerEmail) {
    url.searchParams.set("customer_email", customerEmail);
    url.searchParams.set("billing_email", customerEmail);
  }

  if (customerName) {
    url.searchParams.set("customer_name", customerName);
  }

  if (firstName) {
    url.searchParams.set("billing_first_name", firstName);
  }

  if (lastName) {
    url.searchParams.set("billing_last_name", lastName);
  }

  if (cashbackToApply > 0) {
    url.searchParams.set("phaseone_cashback_apply", "1");
    url.searchParams.set("phaseone_cashback_amount", String(cashbackToApply));
    url.searchParams.set("store_credit_amount", String(cashbackToApply));
  }

  if (paymentMethod?.id) {
    url.searchParams.set("phaseone_selected_payment", paymentMethod.id);
    url.searchParams.set(
      "phaseone_payment_flow",
      paymentMethod.flow || paymentMethod.id,
    );
    url.searchParams.set(
      "phaseone_payment_label",
      paymentMethod.title || paymentMethod.label || "",
    );
  }

  if (Number(paymentDiscountAmount || 0) > 0) {
    url.searchParams.set("phaseone_payment_discount", "1");
    url.searchParams.set(
      "phaseone_payment_discount_amount",
      String(Number(paymentDiscountAmount || 0)),
    );
    url.searchParams.set(
      "phaseone_payment_discount_rate",
      String(Number(paymentDiscountRate || PAYMENT_DISCOUNT_RATE)),
    );
    url.searchParams.set(
      "phaseone_payment_discount_label",
      getPaymentDiscountLabel(paymentMethod),
    );
  }

  if (policyAcknowledged) {
    url.searchParams.set("phaseone_age_confirmed", "1");
    url.searchParams.set("phaseone_research_use_acknowledged", "1");
    url.searchParams.set("phaseone_terms_accepted", "1");
    url.searchParams.set("phaseone_refund_policy_accepted", "1");
    url.searchParams.set("phaseone_research_use_policy_accepted", "1");
    url.searchParams.set(
      "phaseone_policy_acknowledged_at",
      new Date().toISOString(),
    );
  }

  // Important: card keeps the normal checkout flow.
  // Venmo and Zelle are handled by the manual-payment REST endpoint.
  // Only Bank Transfer is forced to the Yodlee/eDebit WooCommerce gateway.
  if (paymentMethod?.gatewayId) {
    url.searchParams.set("payment_method", paymentMethod.gatewayId);
    url.searchParams.set("phaseone_payment_method", paymentMethod.gatewayId);
    url.searchParams.set("phaseone_gateway_id", paymentMethod.gatewayId);
  }

  return url.toString();
}

export default function CheckoutTransferPage() {
  const cart = useCart?.();

  useEffect(() => {
    recoverBankTransferBackRoute();

    const handlePageShow = () => recoverBankTransferBackRoute();
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const [session, setSession] = useState(null);
  const [localCartItems, setLocalCartItems] = useState([]);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountUser, setAccountUser] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponLocked, setCouponLocked] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponStatus, setCouponStatus] = useState("idle");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponData, setCouponData] = useState(null);
  const [discountToken, setDiscountToken] = useState("");
  const [applyCashback, setApplyCashback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState("card");
  const [bankTransferEmail, setBankTransferEmail] = useState("");
  const [checkoutForm, setCheckoutForm] = useState(() =>
    getBlankCheckoutForm(),
  );
  const [selectedShippingMethodId] = useState("fedex");
  const [policyAcknowledged, setPolicyAcknowledged] = useState(false);
  const [manualPaymentOrder, setManualPaymentOrder] = useState(null);
  const [manualPaymentStatus, setManualPaymentStatus] = useState("idle");

  const hasProviderCartItems =
    Array.isArray(cart?.cartItems) && cart.cartItems.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pendingSession = readPendingCheckoutSession();
    setSession(pendingSession);

    const savedCart = localStorage.getItem("lab_cart");
    const parsedCart = safeJsonParse(savedCart, []);

    setLocalCartItems(Array.isArray(parsedCart) ? parsedCart : []);

    const pendingCustomerData = getSessionCustomerData(
      pendingSession || {},
      {},
    );
    const initialBankEmail = normalizeEmail(
      pendingCustomerData?.billing?.email ||
        localStorage.getItem("phaseone_checkout_email") ||
        localStorage.getItem("phaseone_customer_email") ||
        localStorage.getItem("customer_email") ||
        "",
    );

    if (initialBankEmail) {
      setBankTransferEmail(initialBankEmail);
    }

    setCheckoutForm((current) =>
      mergeOnlyEmptyFields(
        current,
        buildCheckoutFormData(pendingSession || {}, {}, initialBankEmail),
      ),
    );

    const cleanCoupon = getSavedCoupon();
    const lockedFromUrl = Boolean(getUrlCoupon());
    const lockedFromStorage = Boolean(getStoredLockedCoupon());
    const shouldLockCoupon = Boolean(lockedFromUrl || lockedFromStorage);

    setCouponLocked(shouldLockCoupon);
    setCoupon(cleanCoupon);
    setCouponInput(cleanCoupon);

    if (cleanCoupon) {
      setCouponStatus("idle");
      setCouponMessage(
        shouldLockCoupon
          ? "Referral code locked from your link. It will be sent automatically to payment."
          : "Apply the code from your link to preview the discount.",
      );
    } else {
      setCouponStatus("idle");
      setCouponMessage("");
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      setAccountLoading(true);

      try {
        const token = getAccountToken();

        const response = await fetch(ACCOUNT_ENDPOINT, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await response.json().catch(() => null);

        if (!active) return;

        if (!response.ok || !data?.authenticated || !data?.user) {
          setAccountUser(null);
          return;
        }

        setAccountUser(data.user);
      } catch {
        if (!active) return;
        setAccountUser(null);
      } finally {
        if (active) setAccountLoading(false);
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const customerData = getSessionCustomerData(
      session || {},
      accountUser || {},
    );
    const detectedEmail = normalizeEmail(customerData?.billing?.email || "");

    if (detectedEmail && !bankTransferEmail) {
      setBankTransferEmail(detectedEmail);
    }

    setCheckoutForm((current) =>
      mergeOnlyEmptyFields(
        current,
        buildCheckoutFormData(
          session || {},
          accountUser || {},
          bankTransferEmail,
        ),
      ),
    );
  }, [session, accountUser, bankTransferEmail]);

  const manualOrderStorageKey = useMemo(() => {
    return `phaseone_manual_payment_order_${getManualOrderStorageSuffix(session || {})}`;
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedOrder = normalizeManualOrderData(
      safeJsonParse(localStorage.getItem(manualOrderStorageKey), null),
    );

    if (savedOrder?.order_id && savedOrder?.payment_reference) {
      setManualPaymentOrder(savedOrder);
      setManualPaymentStatus("ready");
    }
  }, [manualOrderStorageKey]);

  const sessionCartItems =
    session?.cart_items || session?.cartItems || session?.items || [];

  const cartItems = hasProviderCartItems
    ? cart.cartItems
    : Array.isArray(sessionCartItems) && sessionCartItems.length > 0
      ? sessionCartItems
      : localCartItems;

  const cartTotal = hasProviderCartItems
    ? Number(cart.cartTotal || 0)
    : Number(
        session?.cart_total ||
          session?.cartTotal ||
          calculateCartTotal(cartItems),
      );

  const paidSubtotal = hasProviderCartItems
    ? Number(cart.paidSubtotal || cartTotal)
    : Number(session?.paid_subtotal || session?.paidSubtotal || cartTotal);

  const rewardGifts =
    cart?.rewardGifts ||
    session?.reward_gifts ||
    session?.rewardGifts ||
    cartItems.filter((item) => isRewardGiftItem(item));

  const rewardProgress =
    cart?.rewardProgress ||
    session?.reward_progress ||
    session?.rewardProgress ||
    null;

  const estimatedPoints = Math.max(
    0,
    Math.floor(paidSubtotal || cartTotal || 0),
  );

  const isLoggedIn = Boolean(accountUser);
  const accountDisplayName =
    getAccountName(accountUser || {}) || "Your account";

  const pointsBalance = Number(
    accountUser?.pointsBalance ||
      accountUser?.points_balance ||
      accountUser?.points ||
      0,
  );

  const storeCredit = Number(
    accountUser?.storeCredit ||
      accountUser?.store_credit ||
      accountUser?.credit ||
      0,
  );

  const cashbackAvailable = Math.max(0, storeCredit);
  const validatedCouponDiscount =
    couponStatus === "valid" ? Math.max(Number(couponDiscount || 0), 0) : 0;
  const subtotalAfterCoupon = Math.max(cartTotal - validatedCouponDiscount, 0);
  const canApplyCashback =
    isLoggedIn && cashbackAvailable > 0 && subtotalAfterCoupon > 0;

  const cashbackToApply =
    applyCashback && canApplyCashback
      ? Math.min(cashbackAvailable, subtotalAfterCoupon)
      : 0;

  const previewTotal = Math.max(subtotalAfterCoupon - cashbackToApply, 0);
  const hasItems = cartItems.length > 0;

  const selectedPaymentMethod =
    PAYMENT_METHODS.find((method) => method.id === selectedPaymentMethodId) ||
    PAYMENT_METHODS[0];

  const isManualPaymentSelected = isManualPaymentMethod(
    selectedPaymentMethod?.id,
  );
  const manualPaymentDetails = getManualPaymentDetails(
    selectedPaymentMethod?.id,
  );

  const selectedShippingMethod =
    FEDEX_SHIPPING_METHODS.find(
      (method) => method.id === selectedShippingMethodId,
    ) || FEDEX_SHIPPING_METHODS[0];

  const paymentDiscountBase = Math.max(previewTotal, 0);
  const paymentMethodDiscount = getPaymentDiscountAmount(
    selectedPaymentMethod?.id,
    paymentDiscountBase,
  );
  const paymentDiscountLabel = getPaymentDiscountLabel(selectedPaymentMethod);

  const freeShippingUnlocked = cartTotal >= FREE_SHIPPING_MINIMUM;
  const amountUntilFreeShipping = Math.max(
    FREE_SHIPPING_MINIMUM - cartTotal,
    0,
  );
  const selectedShippingOriginalPrice = Number(
    selectedShippingMethod?.price || 0,
  );

  const bankShippingCost =
    selectedPaymentMethod?.id === "bank" && !freeShippingUnlocked
      ? selectedShippingOriginalPrice
      : 0;

  const manualShippingCost =
    isManualPaymentSelected && !freeShippingUnlocked
      ? MANUAL_PAYMENT_SHIPPING_COST
      : 0;

  const cardShippingCost =
    selectedPaymentMethod?.id === "card" && !freeShippingUnlocked
      ? selectedShippingOriginalPrice
      : 0;

  const activeShippingCost =
    bankShippingCost + manualShippingCost + cardShippingCost;

  const effectiveSelectedShippingMethod = {
    ...selectedShippingMethod,
    price: bankShippingCost,
    original_price: selectedShippingOriginalPrice,
    free_shipping_applied:
      selectedPaymentMethod?.id === "bank" && freeShippingUnlocked,
    free_shipping_minimum: FREE_SHIPPING_MINIMUM,
  };

  const paymentPreviewTotal = Math.max(
    previewTotal - paymentMethodDiscount + activeShippingCost,
    0,
  );

  const manualPaymentReference = buildManualPaymentReference(
    manualPaymentOrder || {},
  );
  const manualPaymentReady = Boolean(
    isManualPaymentSelected &&
    manualPaymentOrder?.order_id &&
    manualPaymentReference,
  );
  const manualPaymentMatchesSelected = Boolean(
    manualPaymentReady &&
    selectedPaymentMethod?.id &&
    [selectedPaymentMethod.id, `phaseone_${selectedPaymentMethod.id}`].includes(
      String(manualPaymentOrder?.payment_method || ""),
    ),
  );
  // Zelle/Venmo instructions are shown inside this same component after the order is created.
  const showManualInstructions = Boolean(
    manualPaymentReady && manualPaymentMatchesSelected,
  );
  const manualInstructionsEmail = normalizeEmail(
    manualPaymentOrder?.email ||
      manualPaymentOrder?.billing?.email ||
      checkoutForm.email ||
      bankTransferEmail,
  );

  const manualOrderDisplayNumber = manualPaymentOrder?.order_number
    ? `#${manualPaymentOrder.order_number}`
    : "";
  const manualOrderTotal =
    Number(manualPaymentOrder?.total || 0) > 0
      ? Number(manualPaymentOrder.total)
      : paymentPreviewTotal;

  const manualPaymentAmount = useMemo(
    () => formatMoney(manualOrderTotal),
    [manualOrderTotal],
  );

  const manualOrderPaymentDetails =
    manualPaymentOrder?.payment_details ||
    manualPaymentOrder?.paymentDetails ||
    manualPaymentDetails ||
    null;

  const manualThanksBilling = formatAddressBlock(
    manualPaymentOrder?.billing || normalizeCheckoutFormForOrder(checkoutForm),
  );

  const manualThanksShipping = formatAddressBlock(
    manualPaymentOrder?.shipping ||
      manualPaymentOrder?.billing ||
      normalizeCheckoutFormForOrder(checkoutForm),
  );

  const manualThanksItems = chooseManualThanksItems(
    manualPaymentOrder?.items,
    cartItems,
  );

  useEffect(() => {
    if (!showManualInstructions || typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, [showManualInstructions]);

  const effectiveBankTransferEmail = normalizeEmail(
    checkoutForm.email || bankTransferEmail,
  );

  const updateCheckoutField = (field, value) => {
    setCheckoutForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "email") {
      setBankTransferEmail(normalizeEmail(value));
    }

    setError("");
    setPaymentNotice("");
  };

  useEffect(() => {
    if (!canApplyCashback && applyCashback) {
      setApplyCashback(false);
    }
  }, [canApplyCashback, applyCashback]);

  const handleCouponInput = (event) => {
    if (couponLocked) {
      setCouponMessage("This referral code is locked from your link.");
      return;
    }

    const cleanValue = sanitizeCouponInput(event.target.value);
    const couponCodes = normalizeCouponList(cleanValue);

    setCouponInput(cleanValue);

    const typedCouponCount = sanitizeCouponInput(event.target.value)
      .split(/[\s,;]+/g)
      .map((code) => normalizeCoupon(code))
      .filter(Boolean).length;

    if (typedCouponCount > 3) {
      setCouponMessage("You can apply up to 3 coupons per order.");
    } else {
      setCouponMessage("");
    }

    if (formatCouponList(cleanValue) !== coupon) {
      setCouponStatus("idle");
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");
    }
  };

  const applyCoupon = async () => {
    const couponCodes = normalizeCouponList(couponInput);

    if (!couponCodes.length) {
      saveCoupon("");
      setCoupon("");
      setCouponStatus("error");
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");
      setCouponMessage("Enter up to 3 promo or affiliate codes first.");
      return;
    }

    if (!hasItems) {
      setCouponStatus("error");
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");
      setCouponMessage("Add products before applying a coupon.");
      return;
    }

    try {
      setCouponStatus("loading");
      setCouponMessage(
        couponCodes.length > 1
          ? `Validating ${couponCodes.length} coupons...`
          : "Validating coupon...",
      );
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");

      const token = getAccountToken();
      const checkoutItems = buildCheckoutItems(cartItems);
      const customerEmail =
        accountUser?.email || session?.customer?.email || "";
      const validatedCoupons = [];
      let accumulatedDiscount = 0;

      for (const cleanCoupon of couponCodes) {
        const workingSubtotal = Math.max(cartTotal - accumulatedDiscount, 0);

        console.log("PHASE ONE COUPON REQUEST:", {
          endpoint: VALIDATE_COUPON_ENDPOINT,
          coupon: cleanCoupon,
          subtotal: workingSubtotal,
          items: checkoutItems,
          customerEmail,
        });

        const response = await fetch(VALIDATE_COUPON_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            coupon: cleanCoupon,
            code: cleanCoupon,
            subtotal: workingSubtotal,
            originalSubtotal: cartTotal,
            original_subtotal: cartTotal,
            customerEmail,
            customer_email: customerEmail,
            items: checkoutItems,
            cartItems: checkoutItems,
          }),
        });

        const rawText = await response.text();

        console.log("PHASE ONE COUPON RAW RESPONSE:", {
          coupon: cleanCoupon,
          status: response.status,
          ok: response.ok,
          rawText,
        });

        if (looksLikeHtmlResponse(rawText)) {
          throw new Error(
            `Coupon endpoint returned an HTML page. Check PUBLIC_WP_SITE_URL and confirm the WordPress plugin route exists: ${VALIDATE_COUPON_ENDPOINT}`,
          );
        }

        let data = null;

        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          data = null;
        }

        console.log("PHASE ONE COUPON PARSED RESPONSE:", data);

        if (!response.ok || !data?.valid) {
          const realError =
            data?.error ||
            data?.message ||
            rawText ||
            `${cleanCoupon} failed with status ${response.status}.`;

          throw new Error(realError);
        }

        const discountAmount = Math.max(
          Number(data.discountAmount ?? data.discount_amount ?? 0),
          0,
        );

        const secureToken =
          data.discountToken ||
          data.discount_token ||
          data.phaseone_discount_token ||
          "";

        const serverCoupon = normalizeCoupon(
          data?.coupon?.code || data?.code || cleanCoupon,
        );
        const couponDetails = data?.coupon || {};

        if (discountAmount <= 0) {
          throw new Error(
            data?.error ||
              data?.message ||
              `${serverCoupon || cleanCoupon} was found, but it returned no discount.`,
          );
        }

        if (!secureToken) {
          throw new Error(
            `${serverCoupon || cleanCoupon} validated, but the secure discount token was not returned.`,
          );
        }

        accumulatedDiscount += discountAmount;
        validatedCoupons.push({
          code: serverCoupon || cleanCoupon,
          discountAmount,
          discountToken: secureToken,
          data,
          details: {
            ...couponDetails,
            discount_type:
              couponDetails.discount_type ||
              couponDetails.discountType ||
              data.discount_type ||
              data.discountType ||
              "",
          },
        });
      }

      const savedCoupon = saveCoupon(
        validatedCoupons.map((item) => item.code).join(","),
      );
      const totalDiscount = Number(accumulatedDiscount.toFixed(2));
      const discountTokens = validatedCoupons
        .map((item) => item.discountToken)
        .join(",");

      setCoupon(savedCoupon);
      setCouponInput(savedCoupon);
      setCouponStatus("valid");
      setCouponDiscount(totalDiscount);
      setCouponData({
        coupons: validatedCoupons,
        coupon_count: validatedCoupons.length,
      });
      setDiscountToken(discountTokens);
      setCouponMessage(
        `${savedCoupon} applied: -${formatMoney(totalDiscount)}.`,
      );
    } catch (err) {
      console.error("PHASE ONE COUPON APPLY ERROR:", err);

      saveCoupon("");
      setCoupon("");
      setCouponStatus("error");
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");
      setCouponMessage(
        err?.message || "Coupon validation failed. Check browser console.",
      );
    }
  };

  useEffect(() => {
    if (!couponLocked || !hasItems || !couponInput || couponStatus !== "idle") {
      return;
    }

    const timer = window.setTimeout(() => {
      applyCoupon();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [couponLocked, hasItems, couponInput, couponStatus]);

  const removeCoupon = () => {
    if (couponLocked) {
      setCouponMessage("This referral code is locked from your link.");
      return;
    }

    saveCoupon("");
    setCoupon("");
    setCouponInput("");
    setCouponStatus("idle");
    setCouponDiscount(0);
    setCouponData(null);
    setDiscountToken("");
    setCouponMessage("Coupons removed.");
  };

  const validateBeforePayment = () => {
    setError("");

    if (!hasItems) {
      setError("Your cart is empty.");
      return false;
    }

    const typedCoupons = normalizeCouponList(couponInput);

    if (typedCoupons.length && couponStatus !== "valid" && !couponLocked) {
      setError("Please apply and validate the coupon codes before continuing.");
      return false;
    }

    if (couponStatus === "valid" && !discountToken && !couponLocked) {
      setError(
        "The coupon was validated, but the secure discount token is missing. Apply it again.",
      );
      return false;
    }

    if (!policyAcknowledged) {
      setError(
        "Please confirm the age, research-use, and policy acknowledgement before continuing.",
      );
      return false;
    }

    return true;
  };

  const continueToWooCheckout = () => {
    if (!validateBeforePayment()) return;

    const checkoutCoupon =
      couponStatus === "valid"
        ? coupon
        : couponLocked
          ? formatCouponList(couponInput)
          : "";

    const checkoutUrl = buildWooCheckoutUrl({
      session,
      cartItems,
      coupon: checkoutCoupon,
      discountToken: couponStatus === "valid" ? discountToken : "",
      discountAmount: couponStatus === "valid" ? validatedCouponDiscount : 0,
      previewTotal: paymentPreviewTotal,
      accountUser,
      cashbackToApply,
      paymentMethod: selectedPaymentMethod,
      paymentDiscountAmount: paymentMethodDiscount,
      paymentDiscountRate: PAYMENT_DISCOUNT_RATE,
      policyAcknowledged,
    });

    if (!checkoutUrl) {
      setError("Checkout URL is missing. Check PUBLIC_WOOCOMMERCE_URL.");
      return;
    }

    setLoading(true);
    window.location.href = checkoutUrl;
  };

  const createPrismCardCheckout = async () => {
    if (!validateBeforePayment()) return;

    if (cashbackToApply > 0) {
      setError(
        "Cashback cannot be applied through the new PRISM card flow yet. Turn off cashback and try again.",
      );
      return;
    }

    const checkoutItems = buildCheckoutItems(cartItems);

    if (!checkoutItems.length) {
      setError("No valid cart items were found for secure card checkout.");
      return;
    }

    const normalizedForm = normalizeCheckoutFormForOrder(checkoutForm);
    const requiredFields = [
      ["first_name", "First name"],
      ["last_name", "Last name"],
      ["email", "Email"],
      ["phone", "Phone number"],
      ["address_1", "Address"],
      ["city", "City"],
      ["state", "State / Province"],
      ["postcode", "Postal code"],
      ["country", "Country"],
    ];

    const missingField = requiredFields.find(([key]) => !normalizedForm[key]);

    if (missingField) {
      setError(`${missingField[1]} is required for secure card checkout.`);
      return;
    }

    if (!isValidEmail(normalizedForm.email)) {
      setError("Enter a valid email for secure card checkout.");
      return;
    }

    const finalBilling = { ...normalizedForm };
    const finalShipping = { ...normalizedForm };
    const acceptedAt = new Date().toISOString();
    const couponCodes = normalizeCouponList(
      couponStatus === "valid" ? coupon : couponInput,
    );

    if (typeof window !== "undefined") {
      localStorage.setItem("phaseone_checkout_email", finalBilling.email);
      localStorage.setItem(
        "phaseone_checkout_shipping",
        JSON.stringify(checkoutForm),
      );
    }

    try {
      setLoading(true);
      setError("");
      setPaymentNotice("Opening secure payment...");

      const response = await fetch(PRISM_CHECKOUT_ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          customer: {
            firstName: finalBilling.first_name,
            lastName: finalBilling.last_name,
            email: finalBilling.email,
            phone: finalBilling.phone,
          },
          billing: finalBilling,
          shipping: finalShipping,
          items: checkoutItems.map((item) => ({
            product_id: Number(item.product_id || 0),
            variation_id: Number(item.variation_id || 0),
            quantity: Number(item.quantity || 1),
          })),
          couponCodes,
          coupon_codes: couponCodes,
          acknowledgements: {
            age21OrOlder: true,
            inVitroResearchUseOnly: true,
            termsAndConditionsAccepted: true,
            refundPolicyAccepted: true,
            researchUseOnlyPolicyAccepted: true,
            acceptedAt,
            text: POLICY_ACKNOWLEDGEMENT_TEXT,
          },
          source: "phaseone_custom_checkout_prism",
        }),
      });

      const rawText = await response.text();

      if (looksLikeHtmlResponse(rawText)) {
        throw new Error(
          "The secure checkout endpoint returned an HTML page. Confirm that src/pages/api/prism/checkout.ts exists and redeploy the Astro site.",
        );
      }

      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok || !data?.success || !data?.redirectUrl) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to start secure PRISM card checkout.",
        );
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "phaseone_prism_pending_order",
          JSON.stringify({
            orderId: data.orderId || null,
            orderNumber: data.orderNumber || null,
            email: finalBilling.email,
            createdAt: acceptedAt,
          }),
        );
      }

      window.location.assign(data.redirectUrl);
    } catch (err) {
      console.error("PHASE ONE PRISM CHECKOUT ERROR:", err);
      setLoading(false);
      setPaymentNotice("");
      setError(
        err?.message ||
          "Unable to start secure PRISM card checkout. Please try again.",
      );
    }
  };

  const createBankTransferOrder = async () => {
    if (!validateBeforePayment()) return;

    const checkoutItems = buildCheckoutItems(cartItems);

    if (!checkoutItems.length) {
      setError("No valid cart items were found for bank transfer checkout.");
      return;
    }

    const normalizedForm = normalizeCheckoutFormForOrder(checkoutForm);
    const finalBankEmail = normalizeEmail(
      normalizedForm.email || bankTransferEmail,
    );

    if (!isValidEmail(finalBankEmail)) {
      setError("Enter a valid email before creating the Bank Transfer order.");
      return;
    }

    const requiredFields = [
      ["first_name", "First name"],
      ["last_name", "Last name"],
      ["address_1", "Address"],
      ["city", "City"],
      ["state", "State / Province"],
      ["postcode", "Postal code"],
      ["phone", "Phone number"],
    ];

    const missingField = requiredFields.find(([key]) => !normalizedForm[key]);

    if (missingField) {
      setError(`${missingField[1]} is required for Bank Transfer checkout.`);
      return;
    }

    const finalBilling = {
      ...normalizedForm,
      email: finalBankEmail,
    };

    const finalShipping = {
      ...normalizedForm,
      email: finalBankEmail,
    };

    const finalCustomer = {
      firstName: finalBilling.first_name,
      lastName: finalBilling.last_name,
      email: finalBankEmail,
      phone: finalBilling.phone,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("phaseone_checkout_email", finalBankEmail);
      localStorage.setItem(
        "phaseone_checkout_shipping",
        JSON.stringify(checkoutForm),
      );
    }

    try {
      setLoading(true);
      setError("");
      setPaymentNotice("Opening secure bank transfer...");

      const endpoint = getBankTransferEndpoint();

      if (!endpoint) {
        throw new Error(
          "Bank Transfer endpoint is missing. Check PUBLIC_WP_SITE_URL or PUBLIC_WOOCOMMERCE_URL.",
        );
      }

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(getAccountToken()
            ? { Authorization: `Bearer ${getAccountToken()}` }
            : {}),
        },
        body: JSON.stringify({
          paymentMethod: "edd_draft_yodlee_gateway",
          gatewayId: "edd_draft_yodlee_gateway",
          payment_method: "edd_draft_yodlee_gateway",

          customer: finalCustomer,
          billing: finalBilling,
          shipping: finalShipping,
          items: checkoutItems,
          shippingMethod: effectiveSelectedShippingMethod,
          shipping_method: effectiveSelectedShippingMethod,
          shippingTotal: bankShippingCost,
          shipping_total: bankShippingCost,
          freeShippingApplied:
            effectiveSelectedShippingMethod.free_shipping_applied,
          free_shipping_applied:
            effectiveSelectedShippingMethod.free_shipping_applied,
          freeShippingMinimum: FREE_SHIPPING_MINIMUM,
          free_shipping_minimum: FREE_SHIPPING_MINIMUM,

          couponCode:
            couponStatus === "valid"
              ? coupon
              : couponLocked
                ? formatCouponList(couponInput)
                : "",
          coupon:
            couponStatus === "valid"
              ? coupon
              : couponLocked
                ? formatCouponList(couponInput)
                : "",
          couponCodes: normalizeCouponList(
            couponStatus === "valid" ? coupon : couponInput,
          ),
          coupon_codes: normalizeCouponList(
            couponStatus === "valid" ? coupon : couponInput,
          ),
          discountToken: couponStatus === "valid" ? discountToken : "",
          discountTokens:
            couponStatus === "valid"
              ? String(discountToken || "")
                  .split(",")
                  .filter(Boolean)
              : [],
          discount_tokens:
            couponStatus === "valid"
              ? String(discountToken || "")
                  .split(",")
                  .filter(Boolean)
              : [],
          couponDiscountAmount:
            couponStatus === "valid" ? validatedCouponDiscount : 0,
          discountAmount:
            (couponStatus === "valid" ? validatedCouponDiscount : 0) +
            paymentMethodDiscount,
          paymentDiscountAmount: paymentMethodDiscount,
          payment_discount_amount: paymentMethodDiscount,
          paymentDiscountRate: PAYMENT_DISCOUNT_RATE,
          payment_discount_rate: PAYMENT_DISCOUNT_RATE,
          paymentDiscountLabel: paymentDiscountLabel,
          payment_discount_label: paymentDiscountLabel,
          cashbackAmount: cashbackToApply,
          previewTotal: paymentPreviewTotal,
          cartTotal,
          source: "phaseone_custom_checkout_bank_transfer",
          ageConfirmed: true,
          researchUseAcknowledged: true,
          termsAccepted: true,
          refundPolicyAccepted: true,
          researchUsePolicyAccepted: true,
          policyAcknowledgedAt: new Date().toISOString(),
          policyAcknowledgementText: POLICY_ACKNOWLEDGEMENT_TEXT,
          acknowledgements: {
            age21OrOlder: true,
            inVitroResearchUseOnly: true,
            termsAndConditionsAccepted: true,
            refundPolicyAccepted: true,
            researchUseOnlyPolicyAccepted: true,
            acceptedAt: new Date().toISOString(),
            text: POLICY_ACKNOWLEDGEMENT_TEXT,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to create the Bank Transfer order.",
        );
      }

      const paymentUrl =
        data?.redirectUrl ||
        data?.redirect_url ||
        data?.gatewayRedirectUrl ||
        data?.gateway_redirect_url ||
        data?.paymentUrl ||
        data?.payment_url ||
        data?.checkoutUrl ||
        data?.checkout_url ||
        "";

      if (!paymentUrl) {
        throw new Error("Bank Transfer payment URL was not returned.");
      }

      window.location.href = paymentUrl;
    } catch (err) {
      console.error("PHASE ONE BANK TRANSFER CHECKOUT ERROR:", err);
      setLoading(false);
      setPaymentNotice("");
      setError(
        err?.message ||
          "Unable to open Bank Transfer checkout. Please try again.",
      );
    }
  };

  const createOrReuseManualPaymentOrder = async (
    methodId = selectedPaymentMethod?.id,
  ) => {
    const manualMethod = PAYMENT_METHODS.find(
      (method) => method.id === methodId,
    );

    if (!manualMethod || !isManualPaymentMethod(manualMethod.id)) return;

    if (!validateBeforePayment()) {
      setManualPaymentStatus("idle");
      return;
    }

    const checkoutItems = buildCheckoutItems(cartItems);

    if (!checkoutItems.length) {
      setError("No valid cart items were found for this order.");
      setManualPaymentStatus("error");
      return;
    }

    const normalizedForm = normalizeCheckoutFormForOrder(checkoutForm);
    const customerData = getSessionCustomerData(
      session || {},
      accountUser || {},
    );
    const finalEmail = normalizeEmail(
      normalizedForm.email ||
        bankTransferEmail ||
        customerData?.billing?.email ||
        customerData?.customer?.email ||
        "",
    );

    if (!isValidEmail(finalEmail)) {
      setError(
        "Enter a valid email before generating Venmo/Zelle payment instructions.",
      );
      setManualPaymentStatus("error");
      return;
    }

    const requiredFields = [
      ["first_name", "First name"],
      ["last_name", "Last name"],
      ["address_1", "Address"],
      ["city", "City"],
      ["state", "State"],
      ["postcode", "Postal code"],
      ["phone", "Phone number"],
    ];

    const missingField = requiredFields.find(([key]) => !normalizedForm[key]);

    if (missingField) {
      setError(
        `${missingField[1]} is required before creating the ${manualMethod.title} order.`,
      );
      setManualPaymentStatus("error");
      return;
    }

    const finalBilling = {
      ...normalizeCheckoutAddress(customerData?.billing || {}, normalizedForm),
      ...normalizedForm,
      email: finalEmail,
    };

    const finalShipping = {
      ...normalizeCheckoutAddress(customerData?.shipping || {}, finalBilling),
      ...normalizedForm,
      email: finalEmail,
    };

    const finalCustomer = {
      firstName: finalBilling.first_name,
      lastName: finalBilling.last_name,
      email: finalEmail,
      phone: finalBilling.phone,
    };

    const savedOrder =
      typeof window !== "undefined"
        ? normalizeManualOrderData(
            safeJsonParse(localStorage.getItem(manualOrderStorageKey), null),
          )
        : null;

    const existingOrderId = Number(
      manualPaymentOrder?.order_id || savedOrder?.order_id || 0,
    );

    try {
      setError("");
      setPaymentNotice("");
      setLoading(true);
      setManualPaymentStatus("loading");

      const endpoint = getManualPaymentOrderEndpoint();

      if (!endpoint) {
        throw new Error(
          "Manual payment endpoint is missing. Check PUBLIC_WP_SITE_URL or PUBLIC_WOOCOMMERCE_URL.",
        );
      }

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(getAccountToken()
            ? { Authorization: `Bearer ${getAccountToken()}` }
            : {}),
        },
        body: JSON.stringify({
          existingOrderId,
          existing_order_id: existingOrderId,
          paymentMethod: manualMethod.id,
          payment_method: manualMethod.id,
          paymentMethodTitle: manualMethod.title,
          payment_method_title: manualMethod.title,
          customer: finalCustomer,
          billing: finalBilling,
          shipping: finalShipping,
          items: checkoutItems,
          shippingMethod: {
            id: freeShippingUnlocked
              ? "free_fedex_shipping"
              : "fedex_flat_rate",
            title: "FedEx Shipping",
            price: manualShippingCost,
            method_id: freeShippingUnlocked ? "free_shipping" : "flat_rate",
            free_shipping_applied: freeShippingUnlocked,
            free_shipping_minimum: FREE_SHIPPING_MINIMUM,
          },
          shipping_method: {
            id: freeShippingUnlocked
              ? "free_fedex_shipping"
              : "fedex_flat_rate",
            title: "FedEx Shipping",
            price: manualShippingCost,
            method_id: freeShippingUnlocked ? "free_shipping" : "flat_rate",
            free_shipping_applied: freeShippingUnlocked,
            free_shipping_minimum: FREE_SHIPPING_MINIMUM,
          },
          shippingTotal: manualShippingCost,
          shipping_total: manualShippingCost,
          freeShippingApplied: freeShippingUnlocked,
          free_shipping_applied: freeShippingUnlocked,
          freeShippingMinimum: FREE_SHIPPING_MINIMUM,
          free_shipping_minimum: FREE_SHIPPING_MINIMUM,
          couponCode:
            couponStatus === "valid"
              ? coupon
              : couponLocked
                ? formatCouponList(couponInput)
                : "",
          coupon:
            couponStatus === "valid"
              ? coupon
              : couponLocked
                ? formatCouponList(couponInput)
                : "",
          couponCodes: normalizeCouponList(
            couponStatus === "valid" ? coupon : couponInput,
          ),
          coupon_codes: normalizeCouponList(
            couponStatus === "valid" ? coupon : couponInput,
          ),
          discountToken: couponStatus === "valid" ? discountToken : "",
          discountTokens:
            couponStatus === "valid"
              ? String(discountToken || "")
                  .split(",")
                  .filter(Boolean)
              : [],
          discount_tokens:
            couponStatus === "valid"
              ? String(discountToken || "")
                  .split(",")
                  .filter(Boolean)
              : [],
          couponDiscountAmount:
            couponStatus === "valid" ? validatedCouponDiscount : 0,
          paymentDiscountAmount: paymentMethodDiscount,
          payment_discount_amount: paymentMethodDiscount,
          paymentDiscountRate: PAYMENT_DISCOUNT_RATE,
          payment_discount_rate: PAYMENT_DISCOUNT_RATE,
          paymentDiscountLabel: paymentDiscountLabel,
          payment_discount_label: paymentDiscountLabel,
          cashbackAmount: cashbackToApply,
          cashback_amount: cashbackToApply,
          previewTotal: paymentPreviewTotal,
          preview_total: paymentPreviewTotal,
          cartTotal,
          cart_total: cartTotal,
          source: "phaseone_custom_checkout_manual_payment",
          expiresInHours: 24,
          expires_in_hours: 24,
          ageConfirmed: true,
          researchUseAcknowledged: true,
          termsAccepted: true,
          refundPolicyAccepted: true,
          researchUsePolicyAccepted: true,
          policyAcknowledgedAt: new Date().toISOString(),
          policyAcknowledgementText: POLICY_ACKNOWLEDGEMENT_TEXT,
          acknowledgements: {
            age21OrOlder: true,
            inVitroResearchUseOnly: true,
            termsAndConditionsAccepted: true,
            refundPolicyAccepted: true,
            researchUseOnlyPolicyAccepted: true,
            acceptedAt: new Date().toISOString(),
            text: POLICY_ACKNOWLEDGEMENT_TEXT,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to prepare Venmo/Zelle payment instructions.",
        );
      }

      const normalizedOrderData = normalizeManualOrderData(data);

      if (
        !normalizedOrderData?.order_id ||
        !normalizedOrderData?.payment_reference
      ) {
        throw new Error(
          "The order was created, but no payment reference was returned.",
        );
      }

      const orderData = {
        ...normalizedOrderData,
        email: normalizedOrderData.email || finalEmail,
        customer: normalizedOrderData.customer || finalCustomer,
        billing: normalizedOrderData.billing || finalBilling,
        shipping: normalizedOrderData.shipping || finalShipping,
        payment_details:
          normalizedOrderData.payment_details ||
          normalizedOrderData.paymentDetails ||
          data?.payment_details ||
          data?.paymentDetails ||
          getManualPaymentDetails(manualMethod.id),
      };

      setManualPaymentOrder(orderData);
      setManualPaymentStatus("ready");

      if (typeof window !== "undefined") {
        localStorage.setItem(manualOrderStorageKey, JSON.stringify(orderData));
        localStorage.setItem("phaseone_checkout_email", finalEmail);
        localStorage.setItem(
          "phaseone_checkout_shipping",
          JSON.stringify(checkoutForm),
        );
      }

      setLoading(false);
      setPaymentNotice(
        `${manualMethod.title} order ${orderData.order_number ? `#${orderData.order_number}` : ""} created. Payment instructions are shown below and were emailed to ${finalEmail}.`,
      );

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          document
            .querySelector(".phase-thanks-card")
            ?.scrollIntoView({ behavior: "auto", block: "start" });
        }, 120);
      }
    } catch (err) {
      console.error("PHASE ONE MANUAL PAYMENT ORDER ERROR:", err);
      setLoading(false);
      setManualPaymentStatus("error");
      setPaymentNotice("");
      setError(
        err?.message ||
          "Unable to prepare Venmo/Zelle payment instructions. Please try again.",
      );
    }
  };

  const handleContinuePayment = () => {
    if (selectedPaymentMethod?.id === "bank") {
      createBankTransferOrder();
      return;
    }

    if (isManualPaymentSelected) {
      createOrReuseManualPaymentOrder(selectedPaymentMethod?.id);
      return;
    }

    setPaymentNotice("");
    createPrismCardCheckout();
  };

  if (showManualInstructions && manualPaymentDetails) {
    return (
      <main className="checkout-page manual-thanks-page">
        <section className="checkout-shell manual-thanks-shell">
          <section
            className="phase-thanks-card phase-thanks-card-full"
            aria-live="polite"
          >
            <div className="phase-thanks-hero">
              <span className="phase-thanks-icon">
                <BadgeCheck size={24} />
              </span>

              <div>
                <p>Thank you</p>
                <h2>Your order was received</h2>
                <span>
                  Order {manualOrderDisplayNumber || ""} is on hold until we
                  confirm your {manualPaymentDetails.title} payment. A copy of
                  these instructions was sent to{" "}
                  {manualInstructionsEmail ||
                    manualThanksBilling.email ||
                    "your email"}
                  .
                </span>
              </div>
            </div>

            <div className="phase-thanks-grid main-grid">
              <div className="phase-thanks-panel payment-panel">
                <span>Amount to send</span>
                <strong>{manualPaymentAmount}</strong>
                <small>Send this exact amount.</small>
              </div>

              <div className="phase-thanks-panel reference-panel">
                <span>Payment reference</span>
                <strong>{manualPaymentReference}</strong>
                <small>Use only this reference in the payment note.</small>
              </div>
            </div>

            <div className="phase-thanks-split">
              <div className="phase-thanks-box">
                <div className="phase-thanks-box-head">
                  <span>Payment instructions</span>
                  <strong>{manualPaymentDetails.title}</strong>
                </div>

                <div className="phase-thanks-line">
                  <span>{manualPaymentDetails.recipientLabel}</span>
                  <strong>
                    {manualOrderPaymentDetails?.recipient ||
                      manualPaymentDetails.recipientValue}
                  </strong>
                </div>

                {(manualOrderPaymentDetails?.recipient_extra ||
                  manualPaymentDetails.extraRecipientLine) && (
                  <div className="phase-thanks-line">
                    <span>Name</span>
                    <strong>
                      {manualOrderPaymentDetails?.recipient_extra ||
                        manualPaymentDetails.extraRecipientLine}
                    </strong>
                  </div>
                )}

                <div className="phase-thanks-line">
                  <span>Status</span>
                  <strong>Awaiting payment</strong>
                </div>

                {(manualOrderPaymentDetails?.button_url ||
                  manualPaymentDetails.actionHref) && (
                  <a
                    className="phase-thanks-action"
                    href={
                      manualOrderPaymentDetails?.button_url ||
                      manualPaymentDetails.actionHref
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {manualOrderPaymentDetails?.button_label ||
                      manualPaymentDetails.actionLabel ||
                      "Open payment app"}
                  </a>
                )}
              </div>

              <div className="phase-thanks-box">
                <div className="phase-thanks-box-head">
                  <span>Shipping details</span>
                  <strong>
                    {manualThanksShipping.fullName || "Shipping address"}
                  </strong>
                </div>

                <div className="phase-thanks-address">
                  {manualThanksShipping.lines.length ? (
                    manualThanksShipping.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))
                  ) : (
                    <p>Shipping address saved on the order.</p>
                  )}
                  {manualThanksShipping.phone && (
                    <p>{manualThanksShipping.phone}</p>
                  )}
                </div>

                <div className="phase-thanks-line compact">
                  <span>Email</span>
                  <strong>
                    {manualInstructionsEmail || manualThanksBilling.email}
                  </strong>
                </div>
              </div>
            </div>

            <div className="phase-thanks-box order-box">
              <div className="phase-thanks-box-head">
                <span>Order details</span>
                <strong>
                  {manualThanksItems.length} item
                  {manualThanksItems.length === 1 ? "" : "s"}
                </strong>
              </div>

              <div className="phase-thanks-items">
                {manualThanksItems.map((item, index) => {
                  const options = getItemOptions(item);
                  const lineTotal = getCartItemLineTotal(item);
                  const image = getItemImage(item);
                  const name = getItemName(item);
                  const quantity = getCartItemQuantity(item);

                  return (
                    <div
                      key={
                        item.cartKey ||
                        item.cart_key ||
                        `${item.id || item.product_id || name}-${index}`
                      }
                    >
                      <span className="phase-thanks-item-media">
                        <img src={image} alt="" loading="lazy" />
                      </span>

                      <span className="phase-thanks-item-copy">
                        <strong>
                          {quantity}× {name}
                        </strong>
                        {options && <small>{options}</small>}
                      </span>

                      <em>
                        {isRewardGiftItem(item)
                          ? "FREE"
                          : formatMoney(lineTotal)}
                      </em>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="phase-thanks-warning">
              <AlertTriangle size={16} />
              <p>
                Important: write only <strong>{manualPaymentReference}</strong>{" "}
                in the payment note. Do not include product names. Unpaid
                Zelle/Venmo orders cancel automatically after 24 hours.
              </p>
            </div>

            <div className="phase-thanks-actions-row">
              <a href="/shop">Continue shopping</a>
              <a href="/contact">Need help?</a>
            </div>
          </section>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  if (!hasItems) {
    return (
      <main className="checkout-page checkout-empty-page">
        <section className="checkout-empty">
          <p>Checkout</p>
          <h1>Your cart is empty</h1>
          <a href="/shop">Back to shop</a>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <section className="checkout-shell">
        <header className="checkout-header">
          <a href="/shop" className="checkout-back">
            <ArrowLeft size={15} />
            Back to shop
          </a>

          <div className="checkout-brand">
            <span>PHASE ONE LABZ</span>
            <small>
              <Lock size={13} /> Secure checkout
            </small>
          </div>
        </header>

        <div className="checkout-layout">
          <form
            className="traditional-checkout-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleContinuePayment();
            }}
          >
            <section className="checkout-section">
              <div className="section-heading">
                <span className="section-number">1</span>
                <div>
                  <h1>Contact</h1>
                  <p>We will send your order confirmation and updates here.</p>
                </div>
              </div>

              <div className="field-grid two-columns">
                <label className="checkout-field">
                  <span>Email address</span>
                  <input
                    type="email"
                    value={checkoutForm.email}
                    onChange={(event) =>
                      updateCheckoutField("email", event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="checkout-field">
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={checkoutForm.phone}
                    onChange={(event) =>
                      updateCheckoutField("phone", event.target.value)
                    }
                    placeholder="+1 (555) 123-4567"
                    autoComplete="tel"
                  />
                </label>
              </div>
            </section>

            <section className="checkout-section">
              <div className="section-heading">
                <span className="section-number">2</span>
                <div>
                  <h2>Delivery address</h2>
                  <p>One address is used for every payment method.</p>
                </div>
              </div>

              <div className="field-grid">
                <label className="checkout-field full-width">
                  <span>Country / Region</span>
                  <select
                    value={checkoutForm.country}
                    onChange={(event) =>
                      updateCheckoutField("country", event.target.value)
                    }
                    autoComplete="country"
                  >
                    <option value="US">United States</option>
                  </select>
                </label>

                <div className="field-grid two-columns full-width">
                  <label className="checkout-field">
                    <span>First name</span>
                    <input
                      type="text"
                      value={checkoutForm.firstName}
                      onChange={(event) =>
                        updateCheckoutField("firstName", event.target.value)
                      }
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </label>

                  <label className="checkout-field">
                    <span>Last name</span>
                    <input
                      type="text"
                      value={checkoutForm.lastName}
                      onChange={(event) =>
                        updateCheckoutField("lastName", event.target.value)
                      }
                      placeholder="Last name"
                      autoComplete="family-name"
                    />
                  </label>
                </div>

                <label className="checkout-field full-width">
                  <span>Address</span>
                  <input
                    type="text"
                    value={checkoutForm.address1}
                    onChange={(event) =>
                      updateCheckoutField("address1", event.target.value)
                    }
                    placeholder="Street address"
                    autoComplete="address-line1"
                  />
                </label>

                <label className="checkout-field full-width">
                  <span>Apartment, suite, etc. <em>Optional</em></span>
                  <input
                    type="text"
                    value={checkoutForm.address2}
                    onChange={(event) =>
                      updateCheckoutField("address2", event.target.value)
                    }
                    placeholder="Apartment, suite, unit"
                    autoComplete="address-line2"
                  />
                </label>

                <div className="field-grid address-row full-width">
                  <label className="checkout-field">
                    <span>City</span>
                    <input
                      type="text"
                      value={checkoutForm.city}
                      onChange={(event) =>
                        updateCheckoutField("city", event.target.value)
                      }
                      placeholder="City"
                      autoComplete="address-level2"
                    />
                  </label>

                  <label className="checkout-field">
                    <span>State</span>
                    <select
                      value={checkoutForm.state}
                      onChange={(event) =>
                        updateCheckoutField("state", event.target.value)
                      }
                      autoComplete="address-level1"
                    >
                      {US_STATES.map(([value, label]) => (
                        <option key={value || "empty"} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="checkout-field">
                    <span>ZIP code</span>
                    <input
                      type="text"
                      value={checkoutForm.postcode}
                      onChange={(event) =>
                        updateCheckoutField("postcode", event.target.value)
                      }
                      placeholder="12345"
                      autoComplete="postal-code"
                    />
                  </label>
                </div>
              </div>

              <div className="shipping-choice">
                <span className="shipping-choice-icon">
                  <Truck size={18} />
                </span>
                <div>
                  <strong>FedEx Shipping</strong>
                  <small>Estimated 3–5 business days after processing.</small>
                </div>
                <em>
                  {freeShippingUnlocked
                    ? "FREE"
                    : formatMoney(MANUAL_PAYMENT_SHIPPING_COST)}
                </em>
              </div>
            </section>

            <section className="checkout-section payment-section">
              <div className="section-heading">
                <span className="section-number">3</span>
                <div>
                  <h2>Payment</h2>
                  <p>Select one method. The button below follows your choice.</p>
                </div>
              </div>

              <div className="traditional-payment-list" role="radiogroup">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const active = selectedPaymentMethodId === method.id;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`traditional-payment-option ${
                        active ? "is-active" : ""
                      }`}
                      onClick={() => {
                        setSelectedPaymentMethodId(method.id);
                        setError("");
                        setPaymentNotice("");
                      }}
                    >
                      <span className="payment-radio" aria-hidden="true">
                        <i />
                      </span>

                      <span className="traditional-payment-icon">
                        <Icon size={19} />
                      </span>

                      <span className="traditional-payment-copy">
                        <strong>{method.label}</strong>
                        <small>{method.description}</small>

                        {method.id === "card" && (
                          <span className="wallet-badges" aria-label="Supported wallets">
                            <b> Pay</b>
                            <b>G Pay</b>
                            <b>Link</b>
                            <b>VISA</b>
                            <b>MC</b>
                          </span>
                        )}
                      </span>

                      <span
                        className={`traditional-payment-badge ${
                          isPaymentDiscountEligible(method.id)
                            ? "has-discount"
                            : ""
                        }`}
                      >
                        {method.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <label
              className={`compliance-check ${
                !policyAcknowledged && error ? "has-error" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={policyAcknowledged}
                onChange={(event) => {
                  setPolicyAcknowledged(event.target.checked);
                  if (event.target.checked) setError("");
                }}
              />
              <span>
                I confirm I am 21 or older, these products are for in-vitro
                research or laboratory use only, and I agree to the{" "}
                <a href={POLICY_LINKS.terms}>Terms & Conditions</a>,{" "}
                <a href={POLICY_LINKS.refund}>Refund Policy</a>, and{" "}
                <a href={POLICY_LINKS.researchUse}>Research Use Only policy</a>.
              </span>
            </label>

            {error && <p className="checkout-error">{error}</p>}
            {paymentNotice && !error && (
              <p className="checkout-status">{paymentNotice}</p>
            )}

            <button
              type="submit"
              disabled={loading || manualPaymentStatus === "loading"}
              className="checkout-submit"
            >
              <span>
                {loading || manualPaymentStatus === "loading"
                  ? "Processing..."
                  : selectedPaymentMethod?.id === "card"
                    ? "Pay securely"
                    : selectedPaymentMethod?.id === "bank"
                      ? "Continue to ACH"
                      : `Place ${selectedPaymentMethod?.title || "payment"} order`}
              </span>
              <strong>{formatMoney(paymentPreviewTotal)}</strong>
            </button>

            <div className="secure-footnote">
              <ShieldCheck size={16} />
              <span>
                Payment details are handled by the selected secure provider.
                Phase One Labz never stores card or banking credentials.
              </span>
            </div>
          </form>

          <aside className="checkout-summary">
            <div className="summary-card">
              <div className="summary-head">
                <div>
                  <span>Your order</span>
                  <h2>Order summary</h2>
                </div>
                <PackageCheck size={19} />
              </div>

              <div className="summary-items">
                {cartItems.map((item, index) => {
                  const image = getItemImage(item);
                  const options = getItemOptions(item);
                  const isRewardGift = isRewardGiftItem(item);
                  const lineTotal =
                    getCartItemPrice(item) * Number(item.quantity || 1);

                  return (
                    <div
                      key={item.cartKey || `${item.id}-${options}-${index}`}
                      className="summary-item"
                    >
                      <div className="summary-image">
                        <img src={image} alt={getItemName(item)} />
                        <span>{item.quantity}</span>
                      </div>

                      <div className="summary-item-copy">
                        <strong>{getItemName(item)}</strong>
                        {options && <small>{options}</small>}
                        {isRewardGift && <small className="gift-label">Free reward</small>}
                      </div>

                      <em>{isRewardGift ? "FREE" : formatMoney(lineTotal)}</em>
                    </div>
                  );
                })}
              </div>

              <div className="summary-coupon">
                {couponStatus === "valid" ? (
                  <div className="applied-coupon">
                    <div>
                      <BadgeCheck size={16} />
                      <span>
                        <strong>{coupon}</strong>
                        <small>-{formatMoney(validatedCouponDiscount)}</small>
                      </span>
                    </div>
                    {!couponLocked && (
                      <button type="button" onClick={removeCoupon}>
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="coupon-entry">
                    <input
                      value={couponInput}
                      onChange={handleCouponInput}
                      placeholder="Discount code"
                      disabled={couponLocked || couponStatus === "loading"}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponStatus === "loading" || !couponInput.trim()}
                    >
                      {couponStatus === "loading" ? "Checking" : "Apply"}
                    </button>
                  </div>
                )}

                {couponMessage && couponStatus !== "valid" && (
                  <small
                    className={couponStatus === "error" ? "coupon-error" : ""}
                  >
                    {couponMessage}
                  </small>
                )}
              </div>

              <div className="summary-lines">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(cartTotal)}</strong>
                </div>

                {couponStatus === "valid" && validatedCouponDiscount > 0 && (
                  <div className="discount-line">
                    <span>Discount</span>
                    <strong>-{formatMoney(validatedCouponDiscount)}</strong>
                  </div>
                )}

                {paymentMethodDiscount > 0 && (
                  <div className="discount-line">
                    <span>{paymentDiscountLabel}</span>
                    <strong>-{formatMoney(paymentMethodDiscount)}</strong>
                  </div>
                )}

                <div>
                  <span>Shipping</span>
                  <strong>
                    {activeShippingCost > 0
                      ? formatMoney(activeShippingCost)
                      : "FREE"}
                  </strong>
                </div>
              </div>

              <div className="summary-total">
                <span>Total</span>
                <div>
                  <small>USD</small>
                  <strong>{formatMoney(paymentPreviewTotal)}</strong>
                </div>
              </div>

              {!freeShippingUnlocked && (
                <p className="free-shipping-progress">
                  Add {formatMoney(amountUntilFreeShipping)} more for free FedEx
                  shipping.
                </p>
              )}

              <div className="summary-note">
                <BadgeCheck size={15} />
                <span>Research use only. Not for human consumption.</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .checkout-page {
    min-height: 100vh;
    padding: 68px 20px 88px;
    color: #f8fafc;
    background:
      radial-gradient(circle at 12% 0%, rgba(37, 99, 235, 0.12), transparent 32%),
      radial-gradient(circle at 88% 16%, rgba(14, 165, 233, 0.08), transparent 28%),
      #02050b;
  }

  .checkout-shell {
    width: min(1160px, 100%);
    margin: 0 auto;
  }

  .checkout-header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    min-height: 44px;
    gap: 20px;
    margin-bottom: 42px;
  }

  .checkout-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    color: #94a3b8;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
  }

  .checkout-back:hover {
    color: #ffffff;
  }

  .checkout-brand {
    display: grid;
    justify-items: center;
    gap: 7px;
    letter-spacing: 0.17em;
  }

  .checkout-brand > span {
    color: #ffffff;
    font-size: 15px;
    font-weight: 900;
  }

  .checkout-brand small {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .checkout-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 390px;
    gap: 28px;
    align-items: start;
  }

  .traditional-checkout-form,
  .summary-card,
  .phase-thanks-card,
  .checkout-empty {
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(6, 11, 22, 0.94);
    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.28);
  }

  .traditional-checkout-form {
    overflow: hidden;
    border-radius: 22px;
  }

  .checkout-section {
    position: relative;
    padding: 30px 28px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.11);
  }

  .checkout-section:first-child {
    padding-top: 34px;
  }

  .section-heading {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    margin-bottom: 22px;
  }

  .section-number {
    display: grid;
    width: 29px;
    height: 29px;
    flex: 0 0 29px;
    place-items: center;
    border: 1px solid rgba(96, 165, 250, 0.28);
    border-radius: 50%;
    background: rgba(37, 99, 235, 0.12);
    color: #93c5fd;
    font-size: 12px;
    font-weight: 900;
    line-height: 1;
    overflow: visible;
  }

  .section-heading h1,
  .section-heading h2 {
    margin: 0;
    color: #ffffff;
    font-size: 20px;
    line-height: 1.15;
    letter-spacing: -0.025em;
  }

  .section-heading p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.55;
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .field-grid.two-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field-grid.address-row {
    grid-template-columns: minmax(0, 1.2fr) minmax(130px, 0.9fr) minmax(110px, 0.7fr);
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .checkout-field {
    display: grid;
    gap: 7px;
  }

  .checkout-field > span {
    color: #cbd5e1;
    font-size: 11px;
    font-weight: 800;
  }

  .checkout-field em {
    color: #475569;
    font-style: normal;
    font-weight: 600;
  }

  .checkout-field input,
  .checkout-field select,
  .coupon-entry input {
    width: 100%;
    min-height: 50px;
    border: 1px solid rgba(148, 163, 184, 0.17);
    border-radius: 12px;
    outline: none;
    background: rgba(2, 6, 15, 0.74);
    padding: 0 14px;
    color: #f8fafc;
    font: inherit;
    font-size: 14px;
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }

  .checkout-field input::placeholder,
  .coupon-entry input::placeholder {
    color: #475569;
  }

  .checkout-field input:focus,
  .checkout-field select:focus,
  .coupon-entry input:focus {
    border-color: rgba(96, 165, 250, 0.78);
    background: rgba(4, 10, 22, 0.98);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  .shipping-choice {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 13px;
    margin-top: 18px;
    border: 1px solid rgba(96, 165, 250, 0.28);
    border-radius: 14px;
    background: rgba(30, 64, 175, 0.08);
    padding: 14px;
  }

  .shipping-choice-icon,
  .traditional-payment-icon {
    display: grid;
    place-items: center;
    border: 1px solid rgba(148, 163, 184, 0.13);
    border-radius: 11px;
    background: rgba(15, 23, 42, 0.72);
    color: #93c5fd;
  }

  .shipping-choice-icon {
    width: 42px;
    height: 42px;
  }

  .shipping-choice div {
    display: grid;
    gap: 4px;
  }

  .shipping-choice strong {
    font-size: 13px;
  }

  .shipping-choice small {
    color: #64748b;
    font-size: 11px;
  }

  .shipping-choice em {
    color: #bfdbfe;
    font-size: 12px;
    font-style: normal;
    font-weight: 900;
  }

  .traditional-payment-list {
    display: grid;
    gap: 10px;
  }

  .traditional-payment-option {
    display: grid;
    grid-template-columns: 20px 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 15px;
    background: rgba(2, 6, 15, 0.58);
    padding: 14px;
    color: #f8fafc;
    text-align: left;
    cursor: pointer;
    transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
  }

  .traditional-payment-option:hover {
    border-color: rgba(96, 165, 250, 0.35);
    background: rgba(8, 17, 35, 0.92);
  }

  .traditional-payment-option.is-active {
    border-color: #3b82f6;
    background: linear-gradient(90deg, rgba(37, 99, 235, 0.13), rgba(8, 17, 35, 0.86));
    box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.17);
  }

  .payment-radio {
    display: grid;
    width: 18px;
    height: 18px;
    place-items: center;
    border: 1px solid #475569;
    border-radius: 50%;
  }

  .payment-radio i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: transparent;
  }

  .is-active .payment-radio {
    border-color: #60a5fa;
  }

  .is-active .payment-radio i {
    background: #60a5fa;
  }

  .traditional-payment-icon {
    width: 42px;
    height: 42px;
  }

  .traditional-payment-copy {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .traditional-payment-copy > strong {
    font-size: 13px;
  }

  .traditional-payment-copy > small {
    color: #64748b;
    font-size: 11px;
    line-height: 1.45;
  }

  .traditional-payment-badge {
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.64);
    padding: 6px 9px;
    color: #94a3b8;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .traditional-payment-badge.has-discount {
    border-color: rgba(34, 197, 94, 0.22);
    background: rgba(22, 163, 74, 0.08);
    color: #86efac;
  }

  .wallet-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 4px;
  }

  .wallet-badges b {
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.78);
    padding: 4px 7px;
    color: #cbd5e1;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.02em;
  }

  .compliance-check {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 10px;
    margin: 20px 28px 0;
    color: #64748b;
    font-size: 11px;
    line-height: 1.6;
  }

  .compliance-check input {
    width: 16px;
    height: 16px;
    margin: 2px 0 0;
    accent-color: #3b82f6;
  }

  .compliance-check a {
    color: #bfdbfe;
  }

  .compliance-check.has-error {
    color: #fca5a5;
  }

  .checkout-error,
  .checkout-status {
    margin: 14px 28px 0;
    border-radius: 11px;
    padding: 11px 13px;
    font-size: 12px;
    line-height: 1.45;
  }

  .checkout-error {
    border: 1px solid rgba(248, 113, 113, 0.25);
    background: rgba(127, 29, 29, 0.12);
    color: #fecaca;
  }

  .checkout-status {
    border: 1px solid rgba(96, 165, 250, 0.22);
    background: rgba(30, 64, 175, 0.1);
    color: #bfdbfe;
  }

  .checkout-submit {
    display: flex;
    min-height: 58px;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    width: calc(100% - 56px);
    margin: 18px 28px 0;
    border: 0;
    border-radius: 14px;
    background: linear-gradient(135deg, #2563eb, #0284c7);
    padding: 0 19px;
    color: #ffffff;
    font: inherit;
    cursor: pointer;
    box-shadow: 0 14px 35px rgba(37, 99, 235, 0.24);
  }

  .checkout-submit:hover:not(:disabled) {
    filter: brightness(1.08);
  }

  .checkout-submit:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .checkout-submit span,
  .checkout-submit strong {
    font-size: 14px;
    font-weight: 900;
  }

  .secure-footnote {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 8px;
    padding: 14px 28px 25px;
    color: #475569;
    font-size: 10px;
    line-height: 1.5;
    text-align: center;
  }

  .checkout-summary {
    position: sticky;
    top: 24px;
  }

  .summary-card {
    overflow: hidden;
    border-radius: 20px;
    padding: 22px;
  }

  .summary-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.11);
  }

  .summary-head span {
    color: #64748b;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .summary-head h2 {
    margin: 4px 0 0;
    font-size: 19px;
  }

  .summary-head svg {
    color: #60a5fa;
  }

  .summary-items {
    display: grid;
    gap: 14px;
    max-height: 360px;
    overflow: auto;
    padding: 18px 3px 18px 0;
  }

  .summary-item {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
  }

  .summary-image {
    position: relative;
    display: grid;
    width: 52px;
    height: 52px;
    place-items: center;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.13);
    border-radius: 11px;
    background: rgba(15, 23, 42, 0.62);
  }

  .summary-image img {
    width: 88%;
    height: 88%;
    object-fit: contain;
  }

  .summary-image span {
    position: absolute;
    top: -5px;
    right: -5px;
    display: grid;
    min-width: 20px;
    height: 20px;
    place-items: center;
    border-radius: 999px;
    background: #2563eb;
    color: #ffffff;
    font-size: 9px;
    font-weight: 900;
  }

  .summary-item-copy {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .summary-item-copy strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .summary-item-copy small {
    color: #64748b;
    font-size: 10px;
  }

  .summary-item em {
    color: #e2e8f0;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
  }

  .gift-label,
  .discount-line {
    color: #86efac !important;
  }

  .summary-coupon {
    display: grid;
    gap: 8px;
    padding: 16px 0;
    border-top: 1px solid rgba(148, 163, 184, 0.11);
    border-bottom: 1px solid rgba(148, 163, 184, 0.11);
  }

  .coupon-entry {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .coupon-entry input {
    min-height: 44px;
  }

  .coupon-entry button,
  .applied-coupon button {
    border: 1px solid rgba(96, 165, 250, 0.24);
    border-radius: 10px;
    background: rgba(37, 99, 235, 0.1);
    padding: 0 13px;
    color: #bfdbfe;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .coupon-entry button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .summary-coupon > small {
    color: #64748b;
    font-size: 10px;
    line-height: 1.4;
  }

  .summary-coupon > small.coupon-error {
    color: #fca5a5;
  }

  .applied-coupon,
  .applied-coupon > div {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .applied-coupon {
    justify-content: space-between;
  }

  .applied-coupon svg {
    color: #4ade80;
  }

  .applied-coupon span {
    display: grid;
    gap: 2px;
  }

  .applied-coupon strong {
    font-size: 11px;
  }

  .applied-coupon small {
    color: #86efac;
    font-size: 10px;
  }

  .summary-lines {
    display: grid;
    gap: 11px;
    padding: 18px 0;
  }

  .summary-lines > div,
  .summary-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .summary-lines span {
    color: #94a3b8;
    font-size: 11px;
  }

  .summary-lines strong {
    font-size: 11px;
  }

  .summary-total {
    border-top: 1px solid rgba(148, 163, 184, 0.12);
    padding-top: 18px;
  }

  .summary-total > span {
    font-size: 14px;
    font-weight: 900;
  }

  .summary-total > div {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }

  .summary-total small {
    color: #64748b;
    font-size: 9px;
    font-weight: 800;
  }

  .summary-total strong {
    font-size: 23px;
    letter-spacing: -0.04em;
  }

  .free-shipping-progress {
    margin: 14px 0 0;
    border-radius: 10px;
    background: rgba(37, 99, 235, 0.08);
    padding: 10px 11px;
    color: #93c5fd;
    font-size: 10px;
    line-height: 1.4;
  }

  .summary-note {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    color: #475569;
    font-size: 9px;
  }

  .summary-note svg {
    color: #60a5fa;
  }

  .checkout-empty-page,
  .manual-thanks-page {
    display: grid;
    min-height: 100vh;
    place-items: center;
    padding: 50px 18px;
    background: #02050b;
  }

  .checkout-empty {
    width: min(480px, 100%);
    border-radius: 20px;
    padding: 34px;
    text-align: center;
  }

  .checkout-empty p,
  .phase-thanks-hero p {
    margin: 0;
    color: #60a5fa;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .checkout-empty h1 {
    margin: 10px 0 22px;
  }

  .checkout-empty a,
  .phase-thanks-actions-row a,
  .phase-thanks-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    border-radius: 11px;
    background: #2563eb;
    padding: 0 16px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 900;
    text-decoration: none;
  }

  .manual-thanks-shell {
    width: min(900px, 100%);
  }

  .phase-thanks-card {
    border-radius: 22px;
    padding: 28px;
  }

  .phase-thanks-hero {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 22px;
  }

  .phase-thanks-icon {
    display: grid;
    width: 46px;
    height: 46px;
    flex: 0 0 46px;
    place-items: center;
    border-radius: 14px;
    background: rgba(34, 197, 94, 0.1);
    color: #4ade80;
  }

  .phase-thanks-hero h2 {
    margin: 5px 0 8px;
    font-size: 24px;
  }

  .phase-thanks-hero > div > span {
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.55;
  }

  .phase-thanks-grid,
  .phase-thanks-split {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  .phase-thanks-panel,
  .phase-thanks-box,
  .phase-thanks-warning {
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 14px;
    background: rgba(2, 6, 15, 0.58);
    padding: 16px;
  }

  .phase-thanks-panel,
  .phase-thanks-box-head,
  .phase-thanks-line,
  .phase-thanks-address,
  .phase-thanks-item-copy {
    display: grid;
    gap: 5px;
  }

  .phase-thanks-panel > span,
  .phase-thanks-box-head > span,
  .phase-thanks-line > span {
    color: #64748b;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .phase-thanks-panel > strong {
    font-size: 23px;
  }

  .phase-thanks-panel small,
  .phase-thanks-line small {
    color: #64748b;
    font-size: 10px;
  }

  .phase-thanks-line {
    margin-top: 14px;
  }

  .phase-thanks-address p {
    margin: 0;
    color: #cbd5e1;
    font-size: 11px;
  }

  .phase-thanks-action {
    width: 100%;
    margin-top: 16px;
  }

  .order-box {
    margin-top: 12px;
  }

  .phase-thanks-items {
    display: grid;
    gap: 10px;
    margin-top: 14px;
  }

  .phase-thanks-items > div {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }

  .phase-thanks-item-media {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.7);
  }

  .phase-thanks-item-media img {
    width: 88%;
    height: 88%;
    object-fit: contain;
  }

  .phase-thanks-item-copy strong {
    font-size: 11px;
  }

  .phase-thanks-item-copy small {
    color: #64748b;
    font-size: 9px;
  }

  .phase-thanks-items em {
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }

  .phase-thanks-warning {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 12px;
    color: #fbbf24;
  }

  .phase-thanks-warning p {
    margin: 0;
    font-size: 11px;
    line-height: 1.5;
  }

  .phase-thanks-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
  }

  @media (max-width: 960px) {
    .checkout-layout {
      grid-template-columns: 1fr;
    }

    .checkout-summary {
      position: static;
      order: -1;
    }
  }

  @media (max-width: 680px) {
    .checkout-page {
      padding: 38px 12px 58px;
    }

    .checkout-header {
      grid-template-columns: 1fr auto;
    }

    .checkout-brand {
      justify-items: end;
    }

    .checkout-brand > span {
      font-size: 12px;
    }

    .checkout-section {
      padding: 24px 16px;
    }

    .checkout-section:first-child {
      padding-top: 28px;
    }

    .field-grid.two-columns,
    .field-grid.address-row,
    .phase-thanks-grid,
    .phase-thanks-split {
      grid-template-columns: 1fr;
    }

    .traditional-payment-option {
      grid-template-columns: 18px 40px minmax(0, 1fr);
    }

    .traditional-payment-badge {
      grid-column: 3;
      justify-self: start;
    }

    .compliance-check,
    .checkout-error,
    .checkout-status {
      margin-right: 16px;
      margin-left: 16px;
    }

    .checkout-submit {
      width: calc(100% - 32px);
      margin-right: 16px;
      margin-left: 16px;
    }

    .secure-footnote {
      padding-right: 16px;
      padding-left: 16px;
    }

    .summary-card,
    .phase-thanks-card {
      padding: 18px;
    }
  }
`;