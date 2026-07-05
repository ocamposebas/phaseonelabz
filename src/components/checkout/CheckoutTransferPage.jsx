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
const VALIDATE_COUPON_ENDPOINT =
  "https://staging.phaseonelabz.com/wp-json/phaseone/v1/validate-coupon";
const WOO_URL = import.meta.env.PUBLIC_WOOCOMMERCE_URL || "https://staging.phaseonelabz.com";
const PAYMENT_DISCOUNT_RATE = 0.05;
const FREE_SHIPPING_MINIMUM = 50;
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
    extraRecipientLine: "Payment details appear here after the order is created.",
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
    label: "Card / Klarna / Affirm",
    title: "Card / Klarna / Affirm",
    description: "Pay securely with credit/debit card, Klarna, or Affirm.",
    badge: "Secure",
    flow: "secure_checkout",
    gatewayId: "",
    icon: CreditCard,
    cta: "Continue with Card / Klarna / Affirm",
  },
  {
    id: "venmo",
    label: "Venmo",
    title: "Venmo",
    description: "Complete checkout here, then see Venmo instructions in the thanks section and by email.",
    badge: "5% OFF",
    flow: "manual_order",
    gatewayId: "",
    icon: Smartphone,
    cta: "Continue with Venmo",
  },
  {
    id: "zelle",
    label: "Zelle",
    title: "Zelle",
    description: "Complete checkout here, then see Zelle instructions in the thanks section and by email.",
    badge: "5% OFF",
    flow: "manual_order",
    gatewayId: "",
    icon: Building2,
    cta: "Continue with Zelle",
  },
  {
    id: "bank",
    label: "Bank",
    title: "Bank Transfer / ACH",
    description: "Continue directly to ACH bank transfer and get 5% applied instantly.",
    badge: "5% OFF",
    flow: "bank_transfer_yodlee",
    gatewayId: "edd_draft_yodlee_gateway",
    icon: Landmark,
    cta: "Continue with ACH Discount",
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

const BANK_SHIPPING_METHODS = [
  {
    id: "standard",
    title: "Standard Shipping",
    description: "Estimated 3–7 business days after processing.",
    price: 13,
    method_id: "flat_rate",
  },
  {
    id: "priority",
    title: "Priority Shipping",
    description: "Estimated 2–4 business days after processing.",
    price: 14.95,
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
  const clean = String(value || "").trim().toLowerCase();

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
    backUrl.toString()
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
    cleanCheckoutUrl
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

  document.cookie = "phaseone_tagada_coupon=; Path=/; Max-Age=0; SameSite=Lax; Secure";
  document.cookie = "phaseone_tagada_coupon=; Path=/; Domain=.phaseonelabz.com; Max-Age=0; SameSite=Lax; Secure";

  try {
    window.sessionStorage?.removeItem("phaseone_tagada_coupon");
    window.localStorage?.removeItem("phaseone_tagada_coupon");
  } catch {
    // Ignore.
  }
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
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

  const lockedFlag = localStorage.getItem("phaseone_coupon_locked_from_url") === "1";
  const lockedCoupon = normalizeCoupon(
    localStorage.getItem("phaseone_locked_checkout_coupon") || ""
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
      String(item?.cartKey || "").startsWith("reward:")
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
    item.id
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
    item.raw?.variation_id
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

  return Number((getCartItemUnitPrice(item) * getCartItemQuantity(item)).toFixed(2));
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
  const safeOrderItems = Array.isArray(orderItems) ? orderItems.filter(Boolean) : [];
  const safeCartItems = getVisibleCartItems(currentCartItems);

  if (!safeOrderItems.length) return safeCartItems;
  if (!safeCartItems.length) return safeOrderItems;

  const orderTotal = safeOrderItems.reduce((sum, item) => sum + getCartItemLineTotal(item), 0);
  const cartTotalValue = safeCartItems.reduce((sum, item) => sum + getCartItemLineTotal(item), 0);

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
        regular_price: toMoneyNumber(item.regular_price || item.regularPrice || item.price, unitPrice),
        sale_price: toMoneyNumber(item.sale_price || item.salePrice || item.price, unitPrice),
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
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
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
    source?.reference
  );

  if (directReference && !/[0-9a-f]{8}-[0-9a-f]{4}/i.test(directReference)) {
    return directReference.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 18);
  }

  const rawOrderNumber = pickFirstValue(
    source?.order_number,
    source?.orderNumber,
    source?.number,
    source?.order_id,
    source?.orderId,
    source?.id
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
  return String(
    session?.checkout_session ||
      session?.session_id ||
      session?.sessionId ||
      getSessionIdFromUrl() ||
      "current"
  )
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 40) || "current";
}

function normalizeManualOrderData(data = {}) {
  const order = data?.order || data || {};
  const orderId = Number(
    order?.order_id ||
      order?.orderId ||
      order?.id ||
      data?.order_id ||
      data?.orderId ||
      0
  );

  if (!orderId) return null;

  const orderNumber = String(
    order?.order_number ||
      order?.orderNumber ||
      order?.number ||
      data?.order_number ||
      data?.orderNumber ||
      orderId
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
    total: Number(order?.total ?? order?.order_total ?? data?.total ?? data?.order_total ?? 0),
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
      fallbackData.firstName
    ),
    last_name: pickFirstValue(
      data.last_name,
      data.lastName,
      fallbackData.last_name,
      fallbackData.lastName
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
      fallbackData.address
    ),
    address_2: pickFirstValue(
      data.address_2,
      data.address2,
      fallbackData.address_2,
      fallbackData.address2
    ),
    city: pickFirstValue(data.city, fallbackData.city),
    state: pickFirstValue(data.state, fallbackData.state),
    postcode: pickFirstValue(
      data.postcode,
      data.zip,
      data.postalCode,
      fallbackData.postcode,
      fallbackData.zip,
      fallbackData.postalCode
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
      ""
  ).trim();

  const { firstName, lastName } = splitName(customerName);

  const customerEmail = pickFirstValue(
    accountUser?.email,
    accountUser?.user_email,
    session?.customer?.email,
    session?.customer_email,
    session?.billing?.email,
    session?.billingAddress?.email,
    session?.billing_email
  );

  const customerPhone = pickFirstValue(
    accountUser?.phone,
    accountUser?.billing?.phone,
    session?.customer?.phone,
    session?.customer_phone,
    session?.billing?.phone,
    session?.billingAddress?.phone,
    session?.billing_phone
  );

  const baseCustomer = {
    first_name: pickFirstValue(accountUser?.first_name, accountUser?.firstName, firstName),
    last_name: pickFirstValue(accountUser?.last_name, accountUser?.lastName, lastName),
    email: customerEmail,
    phone: customerPhone,
  };

  const billing = normalizeCheckoutAddress(
    session?.billing || session?.billingAddress || session?.billing_address || {},
    baseCustomer
  );

  const shipping = normalizeCheckoutAddress(
    session?.shipping || session?.shippingAddress || session?.shipping_address || {},
    billing
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
    acceptsMarketing: false,
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

function buildCheckoutFormData(session = {}, accountUser = {}, fallbackEmail = "") {
  const data = getSessionCustomerData(session || {}, accountUser || {});
  const billing = data.billing || {};
  const shipping = data.shipping || billing || {};

  return {
    email: normalizeEmail(billing.email || data.customer?.email || fallbackEmail),
    acceptsMarketing: false,
    country: shipping.country || billing.country || "US",
    firstName: shipping.first_name || billing.first_name || data.customer?.firstName || "",
    lastName: shipping.last_name || billing.last_name || data.customer?.lastName || "",
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
    if ((merged[key] === "" || merged[key] === undefined || merged[key] === null) && value) {
      merged[key] = value;
    }
  });

  return merged;
}

function normalizeCheckoutFormForOrder(form = {}) {
  const clean = {
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

  return clean;
}

function formatAddressBlock(address = {}) {
  const clean = normalizeCheckoutAddress(address || {}, {});
  const fullName = [clean.first_name, clean.last_name].filter(Boolean).join(" ");
  const cityLine = [clean.city, clean.state, clean.postcode].filter(Boolean).join(", ");

  return {
    fullName,
    lines: [
      clean.address_1,
      clean.address_2,
      cityLine,
      clean.country,
    ].filter(Boolean),
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
      null
    );

    if (direct) return { ...direct, session_id: direct.session_id || sessionId };
  }

  const pending = safeJsonParse(
    localStorage.getItem("phaseone_pending_checkout"),
    null
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
  const token =
    session?.auth_token ||
    session?.token ||
    getAccountToken();

  const customerEmail = String(
    accountUser?.email ||
      session?.customer?.email ||
      session?.customer_email ||
      ""
  ).trim();

  const customerName = String(
    getAccountName(accountUser || {}) ||
      session?.customer?.name ||
      session?.customer_name ||
      ""
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
    url.searchParams.set("phaseone_discount_token", discountTokens[0] || discountToken);
    url.searchParams.set("phaseone_discount_tokens", discountTokens.join(","));
    url.searchParams.set("phaseone_discount_amount", String(Number(discountAmount || 0)));
    url.searchParams.set("phaseone_preview_total", String(Number(previewTotal || 0)));
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
    url.searchParams.set("phaseone_payment_flow", paymentMethod.flow || paymentMethod.id);
    url.searchParams.set("phaseone_payment_label", paymentMethod.title || paymentMethod.label || "");

  }

  if (Number(paymentDiscountAmount || 0) > 0) {
    url.searchParams.set("phaseone_payment_discount", "1");
    url.searchParams.set(
      "phaseone_payment_discount_amount",
      String(Number(paymentDiscountAmount || 0))
    );
    url.searchParams.set(
      "phaseone_payment_discount_rate",
      String(Number(paymentDiscountRate || PAYMENT_DISCOUNT_RATE))
    );
    url.searchParams.set(
      "phaseone_payment_discount_label",
      getPaymentDiscountLabel(paymentMethod)
    );
  }

  if (policyAcknowledged) {
    url.searchParams.set("phaseone_age_confirmed", "1");
    url.searchParams.set("phaseone_research_use_acknowledged", "1");
    url.searchParams.set("phaseone_terms_accepted", "1");
    url.searchParams.set("phaseone_refund_policy_accepted", "1");
    url.searchParams.set("phaseone_research_use_policy_accepted", "1");
    url.searchParams.set("phaseone_policy_acknowledged_at", new Date().toISOString());
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
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("card");
  const [bankTransferEmail, setBankTransferEmail] = useState("");
  const [checkoutForm, setCheckoutForm] = useState(() => getBlankCheckoutForm());
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState("standard");
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

    const pendingCustomerData = getSessionCustomerData(pendingSession || {}, {});
    const initialBankEmail = normalizeEmail(
      pendingCustomerData?.billing?.email ||
        localStorage.getItem("phaseone_checkout_email") ||
        localStorage.getItem("phaseone_customer_email") ||
        localStorage.getItem("customer_email") ||
        ""
    );

    if (initialBankEmail) {
      setBankTransferEmail(initialBankEmail);
    }

    setCheckoutForm((current) =>
      mergeOnlyEmptyFields(
        current,
        buildCheckoutFormData(pendingSession || {}, {}, initialBankEmail)
      )
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
          : "Apply the code from your link to preview the discount."
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
    const customerData = getSessionCustomerData(session || {}, accountUser || {});
    const detectedEmail = normalizeEmail(customerData?.billing?.email || "");

    if (detectedEmail && !bankTransferEmail) {
      setBankTransferEmail(detectedEmail);
    }

    setCheckoutForm((current) =>
      mergeOnlyEmptyFields(
        current,
        buildCheckoutFormData(session || {}, accountUser || {}, bankTransferEmail)
      )
    );
  }, [session, accountUser, bankTransferEmail]);

  const manualOrderStorageKey = useMemo(() => {
    return `phaseone_manual_payment_order_${getManualOrderStorageSuffix(session || {})}`;
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedOrder = normalizeManualOrderData(
      safeJsonParse(localStorage.getItem(manualOrderStorageKey), null)
    );

    if (savedOrder?.order_id && savedOrder?.payment_reference) {
      setManualPaymentOrder(savedOrder);
      setManualPaymentStatus("ready");
    }
  }, [manualOrderStorageKey]);

  const sessionCartItems =
    session?.cart_items ||
    session?.cartItems ||
    session?.items ||
    [];

  const cartItems = hasProviderCartItems
    ? cart.cartItems
    : Array.isArray(sessionCartItems) && sessionCartItems.length > 0
      ? sessionCartItems
      : localCartItems;

  const cartTotal = hasProviderCartItems
    ? Number(cart.cartTotal || 0)
    : Number(session?.cart_total || session?.cartTotal || calculateCartTotal(cartItems));

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

  const estimatedPoints = Math.max(0, Math.floor(paidSubtotal || cartTotal || 0));

  const isLoggedIn = Boolean(accountUser);
  const accountDisplayName = getAccountName(accountUser || {}) || "Your account";

  const pointsBalance = Number(
    accountUser?.pointsBalance ||
      accountUser?.points_balance ||
      accountUser?.points ||
      0
  );

  const storeCredit = Number(
    accountUser?.storeCredit ||
      accountUser?.store_credit ||
      accountUser?.credit ||
      0
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

  const isManualPaymentSelected = isManualPaymentMethod(selectedPaymentMethod?.id);
  const manualPaymentDetails = getManualPaymentDetails(selectedPaymentMethod?.id);

  const selectedShippingMethod =
    BANK_SHIPPING_METHODS.find((method) => method.id === selectedShippingMethodId) ||
    BANK_SHIPPING_METHODS[0];

  const paymentDiscountBase = Math.max(previewTotal, 0);
  const paymentMethodDiscount = getPaymentDiscountAmount(
    selectedPaymentMethod?.id,
    paymentDiscountBase
  );
  const paymentDiscountLabel = getPaymentDiscountLabel(selectedPaymentMethod);

  const freeShippingUnlocked = cartTotal >= FREE_SHIPPING_MINIMUM;
  const amountUntilFreeShipping = Math.max(FREE_SHIPPING_MINIMUM - cartTotal, 0);
  const selectedShippingOriginalPrice = Number(selectedShippingMethod?.price || 0);

  const bankShippingCost = selectedPaymentMethod?.id === "bank" && !freeShippingUnlocked
    ? selectedShippingOriginalPrice
    : 0;

  const manualShippingCost = isManualPaymentSelected && !freeShippingUnlocked
    ? MANUAL_PAYMENT_SHIPPING_COST
    : 0;

  const activeShippingCost = bankShippingCost + manualShippingCost;

  const effectiveSelectedShippingMethod = {
    ...selectedShippingMethod,
    price: bankShippingCost,
    original_price: selectedShippingOriginalPrice,
    free_shipping_applied: selectedPaymentMethod?.id === "bank" && freeShippingUnlocked,
    free_shipping_minimum: FREE_SHIPPING_MINIMUM,
  };

  const paymentPreviewTotal = Math.max(
    previewTotal - paymentMethodDiscount + activeShippingCost,
    0
  );

  const manualPaymentReference = buildManualPaymentReference(manualPaymentOrder || {});
  const manualPaymentReady = Boolean(
    isManualPaymentSelected && manualPaymentOrder?.order_id && manualPaymentReference
  );
  const manualPaymentMatchesSelected = Boolean(
    manualPaymentReady &&
      selectedPaymentMethod?.id &&
      [
        selectedPaymentMethod.id,
        `phaseone_${selectedPaymentMethod.id}`,
      ].includes(String(manualPaymentOrder?.payment_method || ""))
  );
  // Zelle/Venmo instructions are shown inside this same component after the order is created.
  const showManualInstructions = Boolean(manualPaymentReady && manualPaymentMatchesSelected);
  const manualInstructionsEmail = normalizeEmail(
    manualPaymentOrder?.email ||
      manualPaymentOrder?.billing?.email ||
      checkoutForm.email ||
      bankTransferEmail
  );

  const manualOrderDisplayNumber = manualPaymentOrder?.order_number
    ? `#${manualPaymentOrder.order_number}`
    : "";
  const manualOrderTotal = Number(manualPaymentOrder?.total || 0) > 0
    ? Number(manualPaymentOrder.total)
    : paymentPreviewTotal;

  const manualPaymentAmount = useMemo(
    () => formatMoney(manualOrderTotal),
    [manualOrderTotal]
  );

  const manualOrderPaymentDetails =
    manualPaymentOrder?.payment_details ||
    manualPaymentOrder?.paymentDetails ||
    manualPaymentDetails ||
    null;

  const manualThanksBilling = formatAddressBlock(
    manualPaymentOrder?.billing || normalizeCheckoutFormForOrder(checkoutForm)
  );

  const manualThanksShipping = formatAddressBlock(
    manualPaymentOrder?.shipping ||
      manualPaymentOrder?.billing ||
      normalizeCheckoutFormForOrder(checkoutForm)
  );

  const manualThanksItems = chooseManualThanksItems(manualPaymentOrder?.items, cartItems);

  useEffect(() => {
    if (!showManualInstructions || typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, [showManualInstructions]);

  const effectiveBankTransferEmail = normalizeEmail(
    checkoutForm.email || bankTransferEmail
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
          : "Validating coupon..."
      );
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");

      const token = getAccountToken();
      const checkoutItems = buildCheckoutItems(cartItems);
      const customerEmail = accountUser?.email || session?.customer?.email || "";
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
            `Coupon endpoint returned an HTML page. Check PUBLIC_WP_SITE_URL and confirm the WordPress plugin route exists: ${VALIDATE_COUPON_ENDPOINT}`
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
          0
        );

        const secureToken =
          data.discountToken ||
          data.discount_token ||
          data.phaseone_discount_token ||
          "";

        const serverCoupon = normalizeCoupon(data?.coupon?.code || data?.code || cleanCoupon);
        const couponDetails = data?.coupon || {};

        if (discountAmount <= 0) {
          throw new Error(
            data?.error ||
              data?.message ||
              `${serverCoupon || cleanCoupon} was found, but it returned no discount.`
          );
        }

        if (!secureToken) {
          throw new Error(
            `${serverCoupon || cleanCoupon} validated, but the secure discount token was not returned.`
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

      const savedCoupon = saveCoupon(validatedCoupons.map((item) => item.code).join(","));
      const totalDiscount = Number(accumulatedDiscount.toFixed(2));
      const discountTokens = validatedCoupons.map((item) => item.discountToken).join(",");

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
        `${savedCoupon} applied: -${formatMoney(totalDiscount)}.`
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
        err?.message || "Coupon validation failed. Check browser console."
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
        "The coupon was validated, but the secure discount token is missing. Apply it again."
      );
      return false;
    }

    if (!policyAcknowledged) {
      setError(
        "Please confirm the age, research-use, and policy acknowledgement before continuing."
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

  const createBankTransferOrder = async () => {
    if (!validateBeforePayment()) return;

    const checkoutItems = buildCheckoutItems(cartItems);

    if (!checkoutItems.length) {
      setError("No valid cart items were found for bank transfer checkout.");
      return;
    }

    const normalizedForm = normalizeCheckoutFormForOrder(checkoutForm);
    const finalBankEmail = normalizeEmail(normalizedForm.email || bankTransferEmail);

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
      localStorage.setItem("phaseone_checkout_shipping", JSON.stringify(checkoutForm));
    }

    try {
      setLoading(true);
      setError("");
      setPaymentNotice("Preparing your Bank Transfer checkout...");

      const endpoint = getBankTransferEndpoint();

      if (!endpoint) {
        throw new Error(
          "Bank Transfer endpoint is missing. Check PUBLIC_WP_SITE_URL or PUBLIC_WOOCOMMERCE_URL."
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
          freeShippingApplied: effectiveSelectedShippingMethod.free_shipping_applied,
          free_shipping_applied: effectiveSelectedShippingMethod.free_shipping_applied,
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
            couponStatus === "valid" ? coupon : couponInput
          ),
          coupon_codes: normalizeCouponList(
            couponStatus === "valid" ? coupon : couponInput
          ),
          discountToken: couponStatus === "valid" ? discountToken : "",
          discountTokens: couponStatus === "valid" ? String(discountToken || "").split(",").filter(Boolean) : [],
          discount_tokens: couponStatus === "valid" ? String(discountToken || "").split(",").filter(Boolean) : [],
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
            "Unable to create the Bank Transfer order."
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
          "Unable to open Bank Transfer checkout. Please try again."
      );
    }
  };

  const createOrReuseManualPaymentOrder = async (methodId = selectedPaymentMethod?.id) => {
    const manualMethod = PAYMENT_METHODS.find((method) => method.id === methodId);

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
    const customerData = getSessionCustomerData(session || {}, accountUser || {});
    const finalEmail = normalizeEmail(
      normalizedForm.email ||
        bankTransferEmail ||
        customerData?.billing?.email ||
        customerData?.customer?.email ||
        ""
    );

    if (!isValidEmail(finalEmail)) {
      setError("Enter a valid email before generating Venmo/Zelle payment instructions.");
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
      setError(`${missingField[1]} is required before creating the ${manualMethod.title} order.`);
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

    const savedOrder = typeof window !== "undefined"
      ? normalizeManualOrderData(
          safeJsonParse(localStorage.getItem(manualOrderStorageKey), null)
        )
      : null;

    const existingOrderId = Number(
      manualPaymentOrder?.order_id || savedOrder?.order_id || 0
    );

    try {
      setError("");
      setPaymentNotice("");
      setLoading(true);
      setManualPaymentStatus("loading");

      const endpoint = getManualPaymentOrderEndpoint();

      if (!endpoint) {
        throw new Error(
          "Manual payment endpoint is missing. Check PUBLIC_WP_SITE_URL or PUBLIC_WOOCOMMERCE_URL."
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
            id: freeShippingUnlocked ? "free_manual_shipping" : "manual_flat_rate",
            title: freeShippingUnlocked ? "Free Shipping" : "Standard Shipping",
            price: manualShippingCost,
            method_id: freeShippingUnlocked ? "free_shipping" : "flat_rate",
            free_shipping_applied: freeShippingUnlocked,
            free_shipping_minimum: FREE_SHIPPING_MINIMUM,
          },
          shipping_method: {
            id: freeShippingUnlocked ? "free_manual_shipping" : "manual_flat_rate",
            title: freeShippingUnlocked ? "Free Shipping" : "Standard Shipping",
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
            couponStatus === "valid" ? coupon : couponInput
          ),
          coupon_codes: normalizeCouponList(
            couponStatus === "valid" ? coupon : couponInput
          ),
          discountToken: couponStatus === "valid" ? discountToken : "",
          discountTokens: couponStatus === "valid" ? String(discountToken || "").split(",").filter(Boolean) : [],
          discount_tokens: couponStatus === "valid" ? String(discountToken || "").split(",").filter(Boolean) : [],
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
            "Unable to prepare Venmo/Zelle payment instructions."
        );
      }

      const normalizedOrderData = normalizeManualOrderData(data);

      if (!normalizedOrderData?.order_id || !normalizedOrderData?.payment_reference) {
        throw new Error("The order was created, but no payment reference was returned.");
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
        localStorage.setItem("phaseone_checkout_shipping", JSON.stringify(checkoutForm));

      }

      setLoading(false);
      setPaymentNotice(
        `${manualMethod.title} order ${orderData.order_number ? `#${orderData.order_number}` : ""} created. Payment instructions are shown below and were emailed to ${finalEmail}.`
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
          "Unable to prepare Venmo/Zelle payment instructions. Please try again."
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
    continueToWooCheckout();
  };


  if (showManualInstructions && manualPaymentDetails) {
    return (
      <main className="checkout-page manual-thanks-page">
        <section className="checkout-shell manual-thanks-shell">
          <section className="phase-thanks-card phase-thanks-card-full" aria-live="polite">
            <div className="phase-thanks-hero">
              <span className="phase-thanks-icon">
                <BadgeCheck size={24} />
              </span>

              <div>
                <p>Thank you</p>
                <h2>Your order was received</h2>
                <span>
                  Order {manualOrderDisplayNumber || ""} is on hold until we confirm your {manualPaymentDetails.title} payment. A copy of these instructions was sent to {manualInstructionsEmail || manualThanksBilling.email || "your email"}.
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
                    {manualOrderPaymentDetails?.recipient || manualPaymentDetails.recipientValue}
                  </strong>
                </div>

                {(manualOrderPaymentDetails?.recipient_extra || manualPaymentDetails.extraRecipientLine) && (
                  <div className="phase-thanks-line">
                    <span>Name</span>
                    <strong>
                      {manualOrderPaymentDetails?.recipient_extra || manualPaymentDetails.extraRecipientLine}
                    </strong>
                  </div>
                )}

                <div className="phase-thanks-line">
                  <span>Status</span>
                  <strong>Awaiting payment</strong>
                </div>

                {(manualOrderPaymentDetails?.button_url || manualPaymentDetails.actionHref) && (
                  <a
                    className="phase-thanks-action"
                    href={manualOrderPaymentDetails?.button_url || manualPaymentDetails.actionHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {manualOrderPaymentDetails?.button_label || manualPaymentDetails.actionLabel || "Open payment app"}
                  </a>
                )}
              </div>

              <div className="phase-thanks-box">
                <div className="phase-thanks-box-head">
                  <span>Shipping details</span>
                  <strong>{manualThanksShipping.fullName || "Shipping address"}</strong>
                </div>

                <div className="phase-thanks-address">
                  {manualThanksShipping.lines.length ? (
                    manualThanksShipping.lines.map((line) => <p key={line}>{line}</p>)
                  ) : (
                    <p>Shipping address saved on the order.</p>
                  )}
                  {manualThanksShipping.phone && <p>{manualThanksShipping.phone}</p>}
                </div>

                <div className="phase-thanks-line compact">
                  <span>Email</span>
                  <strong>{manualInstructionsEmail || manualThanksBilling.email}</strong>
                </div>
              </div>
            </div>

            <div className="phase-thanks-box order-box">
              <div className="phase-thanks-box-head">
                <span>Order details</span>
                <strong>{manualThanksItems.length} item{manualThanksItems.length === 1 ? "" : "s"}</strong>
              </div>

              <div className="phase-thanks-items">
                {manualThanksItems.map((item, index) => {
                  const options = getItemOptions(item);
                  const lineTotal = getCartItemLineTotal(item);
                  const image = getItemImage(item);
                  const name = getItemName(item);
                  const quantity = getCartItemQuantity(item);

                  return (
                    <div key={item.cartKey || item.cart_key || `${item.id || item.product_id || name}-${index}`}>
                      <span className="phase-thanks-item-media">
                        <img src={image} alt="" loading="lazy" />
                      </span>

                      <span className="phase-thanks-item-copy">
                        <strong>{quantity}× {name}</strong>
                        {options && <small>{options}</small>}
                      </span>

                      <em>{isRewardGiftItem(item) ? "FREE" : formatMoney(lineTotal)}</em>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="phase-thanks-warning">
              <AlertTriangle size={16} />
              <p>
                Important: write only <strong>{manualPaymentReference}</strong> in the payment note. Do not include product names. Unpaid Zelle/Venmo orders cancel automatically after 24 hours.
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
        <div className="checkout-topbar">
          <a href="/shop" className="checkout-back">
            <ArrowLeft size={14} />
            Continue shopping
          </a>

          <div className="checkout-secure">
            <Lock size={13} />
            Secure checkout
          </div>
        </div>

        <div className="checkout-heading">
          <div>
            <p>Phase One Labs</p>
            <h1>Checkout</h1>
          </div>

          {isLoggedIn ? (
            <div className="account-rewards-card">
              <div className="account-rewards-main">
                <span>
                  <UserRound size={15} />
                </span>

                <div>
                  <strong>{accountDisplayName}</strong>
                  <small>
                    {formatMoney(storeCredit)} cashback ·{" "}
                    {pointsBalance.toLocaleString("en-US")} points
                  </small>
                </div>
              </div>

              <a href="/account#rewards" className="redeem-button">
                Rewards
              </a>
            </div>
          ) : (
            <a href="/account" className="rewards-badge">
              <span>
                <Gift size={15} />
              </span>

              <div>
                <strong>
                  {accountLoading
                    ? "Checking account..."
                    : "Sign in to earn points"}
                </strong>
                <small>
                  Earn approx. {estimatedPoints} points with this order.
                </small>
              </div>
            </a>
          )}
        </div>

        <div className="checkout-grid">
          <div className="checkout-main">
            <div className="checkout-card hero-card">
              <div className="hero-glow" />

              <div className="checkout-card-head">
                <span>
                  <Sparkles size={16} />
                </span>

                <div>
                  <p>Before payment</p>
                  <h2>Apply discounts and account benefits</h2>
                </div>
              </div>

              <p className="checkout-copy">
                Add a promo or affiliate code, apply available cashback, then
                choose your payment method. Complete the checkout details before pressing Comprar.
              </p>
            </div>

            <div className="checkout-card compact-card">
              <div className="checkout-card-head compact-head">
                <span>
                  <Tag size={15} />
                </span>

                <div>
                  <p>Promo code</p>
                  <h2>Coupon or affiliate codes</h2>
                </div>
              </div>

              <div className="coupon-box">
                <input
                      value={couponInput}
                      onChange={handleCouponInput}
                      placeholder="CODE1, CODE2, CODE3"
                      inputMode="text"
                      autoCapitalize="characters"
                      readOnly={couponLocked}
                      aria-readonly={couponLocked}
                      className={couponLocked ? "coupon-locked-input" : ""}
                    />

                    {couponLocked && couponStatus === "valid" ? (
                      <button type="button" className="locked-code" disabled>
                        <Lock size={14} />
                        Locked
                      </button>
                    ) : couponStatus === "valid" ? (
                      <button type="button" className="remove-code" onClick={removeCoupon}>
                        <X size={14} />
                        Remove
                      </button>
                    ) : (
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponStatus === "loading"}
                  >
                    {couponStatus === "loading" ? "Checking" : "Apply"}
                  </button>
                )}
              </div>

              {!couponLocked && (
                <p className="coupon-locked-note">
                  You can apply up to 3 codes. Separate them with commas or spaces.
                </p>
              )}

              {couponLocked && couponInput && (
                <p className="coupon-locked-note">
                  Referral code locked from your link. It will be passed to secure payment automatically.
                </p>
              )}

              {couponStatus === "valid" && coupon && (
                <div className="applied-code">
                  <BadgeCheck size={15} />
                  <p>
                    <strong>{coupon}</strong> applied. Total discount: {" "}
                    <strong>-{formatMoney(validatedCouponDiscount)}</strong>.
                  </p>
                </div>
              )}

              {couponMessage && couponStatus !== "valid" && (
                <p
                  className={
                    couponStatus === "error"
                      ? "checkout-soft-message error-message"
                      : "checkout-soft-message"
                  }
                >
                  {couponMessage}
                </p>
              )}
            </div>

            <div className="checkout-card compact-card">
              <div className="checkout-card-head compact-head">
                <span>
                  <Wallet size={15} />
                </span>

                <div>
                  <p>Cashback</p>
                  <h2>Store credit balance</h2>
                </div>
              </div>

              {isLoggedIn ? (
                canApplyCashback ? (
                  <label className="cashback-check">
                    <input
                      type="checkbox"
                      checked={applyCashback}
                      onChange={(event) =>
                        setApplyCashback(event.target.checked)
                      }
                    />

                    <span>
                      <strong>Apply cashback</strong>
                      <small>
                        Use up to{" "}
                        {formatMoney(Math.min(cashbackAvailable, cartTotal))}{" "}
                        from your available {formatMoney(cashbackAvailable)}{" "}
                        balance.
                      </small>
                    </span>
                  </label>
                ) : (
                  <div className="benefit-empty">
                    <Wallet size={16} />
                    <p>
                      No cashback balance is available on this account yet.
                    </p>
                  </div>
                )
              ) : (
                <div className="benefit-empty">
                  <UserRound size={16} />
                  <p>
                    Sign in before checkout to use cashback and earn rewards.
                  </p>
                </div>
              )}
            </div>

            <div className="checkout-card compact-card">
              <div className="checkout-card-head compact-head">
                <span>
                  <Gift size={15} />
                </span>

                <div>
                  <p>Rewards</p>
                  <h2>Points and free gifts</h2>
                </div>
              </div>

              <div className="reward-grid">
                <div>
                  <span>Estimated points</span>
                  <strong>{estimatedPoints.toLocaleString("en-US")}</strong>
                </div>

                <div>
                  <span>Free rewards</span>
                  <strong>{rewardGifts?.length || 0}</strong>
                </div>
              </div>

              {rewardProgress?.nextTier && (
                <p className="checkout-soft-message">
                  You are {formatMoney(rewardProgress.remaining)} away from the{" "}
                  {rewardProgress.nextTier.shortTitle || "next"} reward.
                </p>
              )}
            </div>

            <div className="checkout-card compact-card payment-card">
              <div className="checkout-card-head compact-head">
                <span>
                  <CreditCard size={15} />
                </span>

                <div>
                  <p>Payment method</p>
                  <h2>Choose how you want to pay</h2>
                </div>
              </div>

              <div className="payment-method-grid" role="radiogroup" aria-label="Payment method">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const active = selectedPaymentMethodId === method.id;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`payment-method ${active ? "is-active" : ""}`}
                      onClick={() => {
                        setSelectedPaymentMethodId(method.id);
                        setError("");
                        setPaymentNotice("");

                      }}
                    >
                      <span className="payment-icon">
                        <Icon size={18} />
                      </span>

                      <span className="payment-copy">
                        <strong>{method.label}</strong>
                        <small>{method.description}</small>
                      </span>

                      <em className={isPaymentDiscountEligible(method.id) ? "payment-discount-badge" : ""}>
                        {method.badge}
                      </em>
                    </button>
                  );
                })}
              </div>

              {!isManualPaymentSelected && (
                <div className="payment-selected-note">
                  <ShieldCheck size={15} />
                  <p>
                    Selected: <strong>{selectedPaymentMethod.title}</strong>.{" "}
                    {paymentMethodDiscount > 0
                      ? `${paymentDiscountLabel} is applied to your estimated total.`
                      : selectedPaymentMethod.id === "bank"
                        ? "You will continue directly to the verified bank transfer portal in this tab."
                        : "You will continue through the same secure checkout flow."}
                  </p>
                </div>
              )}

              {showManualInstructions && manualPaymentDetails && (
                <section className="phase-thanks-card" aria-live="polite">
                  <div className="phase-thanks-hero">
                    <span className="phase-thanks-icon">
                      <BadgeCheck size={22} />
                    </span>

                    <div>
                      <p>Thanks</p>
                      <h2>Your order was received</h2>
                      <span>
                        Order {manualOrderDisplayNumber || ""} is on hold until we confirm your {manualPaymentDetails.title} payment.
                      </span>
                    </div>
                  </div>

                  <div className="phase-thanks-grid main-grid">
                    <div className="phase-thanks-panel payment-panel">
                      <span>Amount to send</span>
                      <strong>{manualPaymentAmount}</strong>
                      <small>Send the exact amount shown here.</small>
                    </div>

                    <div className="phase-thanks-panel">
                      <span>Payment reference</span>
                      <strong>{manualPaymentReference}</strong>
                      <small>Put only this in the payment note.</small>
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
                          {manualOrderPaymentDetails?.recipient || manualPaymentDetails.recipientValue}
                        </strong>
                      </div>

                      {(manualOrderPaymentDetails?.recipient_extra || manualPaymentDetails.extraRecipientLine) && (
                        <div className="phase-thanks-line">
                          <span>Name</span>
                          <strong>
                            {manualOrderPaymentDetails?.recipient_extra || manualPaymentDetails.extraRecipientLine}
                          </strong>
                        </div>
                      )}

                      <div className="phase-thanks-line">
                        <span>Status</span>
                        <strong>Awaiting payment</strong>
                      </div>

                      {(manualOrderPaymentDetails?.button_url || manualPaymentDetails.actionHref) && (
                        <a
                          className="phase-thanks-action"
                          href={manualOrderPaymentDetails?.button_url || manualPaymentDetails.actionHref}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {manualOrderPaymentDetails?.button_label || manualPaymentDetails.actionLabel || "Open payment app"}
                        </a>
                      )}
                    </div>

                    <div className="phase-thanks-box">
                      <div className="phase-thanks-box-head">
                        <span>Shipping details</span>
                        <strong>{manualThanksShipping.fullName || "Shipping address"}</strong>
                      </div>

                      <div className="phase-thanks-address">
                        {manualThanksShipping.lines.length ? (
                          manualThanksShipping.lines.map((line) => <p key={line}>{line}</p>)
                        ) : (
                          <p>Shipping address saved on the order.</p>
                        )}
                        {manualThanksShipping.phone && <p>{manualThanksShipping.phone}</p>}
                      </div>

                      <div className="phase-thanks-line compact">
                        <span>Email</span>
                        <strong>{manualInstructionsEmail || manualThanksBilling.email}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="phase-thanks-box order-box">
                    <div className="phase-thanks-box-head">
                      <span>Order details</span>
                      <strong>{manualThanksItems.length} item{manualThanksItems.length === 1 ? "" : "s"}</strong>
                    </div>

                    <div className="phase-thanks-items">
                      {manualThanksItems.map((item, index) => {
                        const options = getItemOptions(item);
                        const lineTotal = getCartItemLineTotal(item);

                        return (
                          <div key={item.cartKey || `${item.id || item.product_id}-${index}`}>
                            <span>
                              <strong>{item.quantity || 1}× {item.name || item.title || "Item"}</strong>
                              {options && <small>{options}</small>}
                            </span>
                            <em>{isRewardGiftItem(item) ? "FREE" : formatMoney(lineTotal)}</em>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="phase-thanks-warning">
                    <AlertTriangle size={16} />
                    <p>
                      Important: write only <strong>{manualPaymentReference}</strong> in the payment note. Do not include product names. Unpaid Zelle/Venmo orders cancel automatically after 24 hours.
                    </p>
                  </div>
                </section>
              )}

              {(selectedPaymentMethod.id === "bank" || (isManualPaymentSelected && !showManualInstructions)) && (
                <div className="bank-checkout-panel">
                  <div className="bank-checkout-intro">
                    <div>
                      <strong>
                        {selectedPaymentMethod.id === "bank"
                          ? "Secure bank transfer details"
                          : `${selectedPaymentMethod.title} checkout details`}
                      </strong>
                      <p>
                        {selectedPaymentMethod.id === "bank"
                          ? "Complete your contact, delivery address, and shipping option. Your ACH 5% discount is already applied in the order summary."
                          : `Fill in the contact and shipping information below. We use this address to ship your order. Shipping is free over ${formatMoney(FREE_SHIPPING_MINIMUM)}; otherwise it is ${formatMoney(MANUAL_PAYMENT_SHIPPING_COST)}.`}
                      </p>
                    </div>
                  </div>

                  <div className="bank-form-section">
                    <div className="bank-section-title">
                      <span>Contact</span>
                      <small>Email for order updates and payment confirmation.</small>
                    </div>

                    <label className="bank-field is-full">
                      <span>Email</span>
                      <input
                        type="email"
                        value={checkoutForm.email}
                        onChange={(event) => updateCheckoutField("email", event.target.value)}
                        placeholder="your@email.com"
                        autoComplete="email"
                      />
                    </label>

                    <label className="bank-marketing-check">
                      <input
                        type="checkbox"
                        checked={checkoutForm.acceptsMarketing}
                        onChange={(event) =>
                          updateCheckoutField("acceptsMarketing", event.target.checked)
                        }
                      />
                      <span>Email me with news and offers</span>
                    </label>
                  </div>

                  <div className="bank-form-section">
                    <div className="bank-section-title">
                      <span>Delivery</span>
                      <small>Shipping address for this order.</small>
                    </div>

                    <label className="bank-field is-full">
                      <span>Country</span>
                      <select
                        value={checkoutForm.country}
                        onChange={(event) => updateCheckoutField("country", event.target.value)}
                        autoComplete="country"
                      >
                        <option value="US">United States</option>
                      </select>
                    </label>

                    <div className="bank-form-grid two">
                      <label className="bank-field">
                        <span>First Name</span>
                        <input
                          type="text"
                          value={checkoutForm.firstName}
                          onChange={(event) => updateCheckoutField("firstName", event.target.value)}
                          placeholder="John"
                          autoComplete="given-name"
                        />
                      </label>

                      <label className="bank-field">
                        <span>Last Name</span>
                        <input
                          type="text"
                          value={checkoutForm.lastName}
                          onChange={(event) => updateCheckoutField("lastName", event.target.value)}
                          placeholder="Doe"
                          autoComplete="family-name"
                        />
                      </label>
                    </div>

                    <label className="bank-field is-full">
                      <span>Address</span>
                      <input
                        type="text"
                        value={checkoutForm.address1}
                        onChange={(event) => updateCheckoutField("address1", event.target.value)}
                        placeholder="123 Main Street"
                        autoComplete="address-line1"
                      />
                    </label>

                    <label className="bank-field is-full">
                      <span>Apartment, suite, etc.</span>
                      <input
                        type="text"
                        value={checkoutForm.address2}
                        onChange={(event) => updateCheckoutField("address2", event.target.value)}
                        placeholder="Apt, Suite, etc. (optional)"
                        autoComplete="address-line2"
                      />
                    </label>

                    <div className="bank-form-grid three">
                      <label className="bank-field">
                        <span>City</span>
                        <input
                          type="text"
                          value={checkoutForm.city}
                          onChange={(event) => updateCheckoutField("city", event.target.value)}
                          placeholder="City"
                          autoComplete="address-level2"
                        />
                      </label>

                      <label className="bank-field">
                        <span>State / Province</span>
                        <select
                          value={checkoutForm.state}
                          onChange={(event) => updateCheckoutField("state", event.target.value)}
                          autoComplete="address-level1"
                        >
                          {US_STATES.map(([value, label]) => (
                            <option key={value || "empty"} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="bank-field">
                        <span>Postal Code</span>
                        <input
                          type="text"
                          value={checkoutForm.postcode}
                          onChange={(event) => updateCheckoutField("postcode", event.target.value)}
                          placeholder="12345"
                          autoComplete="postal-code"
                        />
                      </label>
                    </div>

                    <label className="bank-field is-full">
                      <span>Phone</span>
                      <input
                        type="tel"
                        value={checkoutForm.phone}
                        onChange={(event) => updateCheckoutField("phone", event.target.value)}
                        placeholder="+1 (555) 123-4567"
                        autoComplete="tel"
                      />
                    </label>
                  </div>

                  <div className="bank-form-section">
                    <div className="bank-section-title">
                      <span>Shipping method</span>
                      <small>
                        {freeShippingUnlocked
                          ? "Free shipping unlocked for this order."
                          : `Shipping is $${MANUAL_PAYMENT_SHIPPING_COST}. Add ${formatMoney(amountUntilFreeShipping)} more to get free shipping.`}
                      </small>
                    </div>

                    {selectedPaymentMethod.id === "bank" ? (
                      <div className="bank-shipping-options" role="radiogroup" aria-label="Shipping method">
                        {BANK_SHIPPING_METHODS.map((method) => {
                          const active = selectedShippingMethodId === method.id;

                          return (
                            <button
                              key={method.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              className={`bank-shipping-method ${active ? "is-active" : ""}`}
                              onClick={() => {
                                setSelectedShippingMethodId(method.id);
                                setError("");
                                setPaymentNotice("");
                              }}
                            >
                              <span>
                                <Truck size={16} />
                              </span>

                              <div>
                                <strong>{method.title}</strong>
                                <small>
                                  {freeShippingUnlocked
                                    ? `${method.description} Free shipping is applied automatically.`
                                    : method.description}
                                </small>
                              </div>

                              <em className={freeShippingUnlocked ? "free-shipping-price" : ""}>
                                {freeShippingUnlocked ? "FREE" : formatMoney(method.price)}
                              </em>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="manual-shipping-single">
                        <span>
                          <Truck size={16} />
                        </span>

                        <div>
                          <strong>{freeShippingUnlocked ? "Free Shipping" : "Standard Shipping"}</strong>
                          <small>
                            {freeShippingUnlocked
                              ? `Free shipping is applied because the order is over ${formatMoney(FREE_SHIPPING_MINIMUM)}.`
                              : `Shipping is ${formatMoney(MANUAL_PAYMENT_SHIPPING_COST)}. Add ${formatMoney(amountUntilFreeShipping)} more to get free shipping.`}
                          </small>
                        </div>

                        <em className={freeShippingUnlocked ? "free-shipping-price" : ""}>
                          {freeShippingUnlocked ? "FREE" : formatMoney(MANUAL_PAYMENT_SHIPPING_COST)}
                        </em>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && <p className="checkout-error">{error}</p>}
            {paymentNotice && !error && (
              <p className="checkout-success-message">{paymentNotice}</p>
            )}

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

              <span className="compliance-copy">
                I confirm I am 21 or older, I am acquiring these compounds for
                in-vitro research or laboratory use only, and I agree to the{" "}
                <a href={POLICY_LINKS.terms}>Terms & Conditions</a>,{" "}
                <a href={POLICY_LINKS.refund}>Refund Policy</a>, and{" "}
                <a href={POLICY_LINKS.researchUse}>Research Use Only policy</a>.
              </span>
            </label>

            <button
              type="button"
              onClick={handleContinuePayment}
              disabled={loading || manualPaymentStatus === "loading" || showManualInstructions}
              className="checkout-submit"
            >
              <span className="checkout-submit-main">
                <strong>
                  {loading || manualPaymentStatus === "loading"
                    ? isManualPaymentSelected
                      ? "Creating order"
                      : "Opening secure checkout"
                    : showManualInstructions
                      ? "Payment instructions ready"
                      : selectedPaymentMethod?.id === "bank"
                        ? "Continue with ACH Discount"
                        : isManualPaymentSelected
                          ? "Comprar"
                          : "Continue to secure checkout"}
                </strong>

                <span>
                  {showManualInstructions
                    ? "Use the payment details shown above."
                    : isManualPaymentSelected
                      ? "The order will be created now. The thanks section will appear here with payment instructions."
                      : paymentMethodDiscount > 0
                        ? `${paymentDiscountLabel} applied.`
                        : "Protected payment redirect."}
                </span>
              </span>

              <span className="checkout-submit-icon">→</span>
            </button>

            {isManualPaymentSelected && (
              <div className="security-note manual-final-note">
                <ShieldCheck size={17} />
                <p>
                  After pressing Comprar, your order will be created and the thanks section will appear here with payment instructions. Use only the payment reference shown in the thanks section.
                </p>
              </div>
            )}
          </div>

          <aside className="checkout-summary">
            <div className="summary-card">
              <div className="summary-head">
                <h2>Order summary</h2>
                <PackageCheck size={17} />
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
                        <img src={image} alt={item.name} />
                        <span>{item.quantity}</span>
                      </div>

                      <div>
                        <h3>{item.name}</h3>
                        {options && <p>{options}</p>}
                        {isRewardGift && <p className="gift-label">Free reward</p>}
                      </div>

                      <strong>
                        {isRewardGift ? "FREE" : formatMoney(lineTotal)}
                      </strong>
                    </div>
                  );
                })}
              </div>

              <div className="summary-lines">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(cartTotal)}</strong>
                </div>

                {couponStatus === "valid" && coupon && (
                  <div className="coupon-line">
                    <span>Coupon {coupon}</span>
                    <strong>-{formatMoney(validatedCouponDiscount)}</strong>
                  </div>
                )}

                {cashbackToApply > 0 && (
                  <div className="cashback-line">
                    <span>Cashback selected</span>
                    <strong>-{formatMoney(cashbackToApply)}</strong>
                  </div>
                )}

                {paymentMethodDiscount > 0 && (
                  <div className="payment-discount-line">
                    <span>{paymentDiscountLabel}</span>
                    <strong>-{formatMoney(paymentMethodDiscount)}</strong>
                  </div>
                )}

                {(selectedPaymentMethod?.id === "bank" || isManualPaymentSelected) && (
                  <div className="shipping-line">
                    <span>Shipping</span>
                    <strong className={freeShippingUnlocked ? "free-shipping-price" : ""}>
                      {freeShippingUnlocked ? "FREE" : formatMoney(activeShippingCost)}
                    </strong>
                  </div>
                )}

                <div className="total due-total">
                  <span>Estimated due</span>
                  <strong>{formatMoney(paymentPreviewTotal)}</strong>
                </div>
              </div>

              <div className="summary-rewards">
                <Gift size={15} />

                {isLoggedIn ? (
                  <p>
                    Logged in reward estimate:{" "}
                    <strong>{estimatedPoints} points</strong>. Cashback
                    available: <strong>{formatMoney(storeCredit)}</strong>.
                  </p>
                ) : (
                  <p>
                    Sign in before ordering to earn{" "}
                    <strong>{estimatedPoints} points</strong>.
                  </p>
                )}
              </div>

              <div className="summary-note">
                <BadgeCheck size={15} />
                <p>Research use only. Not for human consumption.</p>
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
    padding: 78px 20px 72px;
    color: #ffffff;
    background: transparent;
  }

  .manual-thanks-page {
    display: grid;
    align-items: start;
    padding: clamp(44px, 7vh, 82px) 14px 54px;
  }

  .manual-thanks-shell {
    width: min(940px, 100%);
    margin: 0 auto;
  }

  .checkout-empty-page {
    display: grid;
    place-items: center;
  }

  .checkout-shell {
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .checkout-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 20px;
  }

  .checkout-back,
  .checkout-secure {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.48);
    padding: 0 14px;
    color: rgba(207, 250, 254, 0.86);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .checkout-secure {
    color: rgba(226, 232, 240, 0.78);
  }

  .checkout-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 22px;
    align-items: end;
    margin-bottom: 24px;
  }

  .checkout-heading p,
  .checkout-card-head p,
  .summary-kicker,
  .bank-section-title span,
  .payment-method span.payment-eyebrow {
    margin: 0;
    color: rgba(103, 232, 249, 0.7);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .checkout-heading h1 {
    margin: 7px 0 0;
    max-width: 780px;
    color: #ffffff;
    font-size: clamp(38px, 5vw, 64px);
    font-weight: 720;
    letter-spacing: -0.07em;
    line-height: 0.92;
  }

  .rewards-badge,
  .account-rewards-card {
    display: flex;
    width: min(410px, 100%);
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border: 1px solid rgba(103, 232, 249, 0.14);
    border-radius: 22px;
    background: rgba(8, 20, 34, 0.72);
    padding: 14px;
    text-decoration: none;
  }

  .account-rewards-main,
  .rewards-badge {
    min-width: 0;
  }

  .account-rewards-main {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .rewards-badge > span,
  .account-rewards-main > span {
    display: grid;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid rgba(103, 232, 249, 0.14);
    border-radius: 15px;
    background: rgba(103, 232, 249, 0.08);
    color: rgb(165, 243, 252);
  }

  .rewards-badge strong,
  .account-rewards-main strong {
    display: block;
    max-width: 230px;
    overflow: hidden;
    color: #ffffff;
    font-size: 13px;
    font-weight: 850;
    letter-spacing: -0.025em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rewards-badge small,
  .account-rewards-main small {
    display: block;
    margin-top: 4px;
    color: rgba(203, 213, 225, 0.62);
    font-size: 11px;
    line-height: 1.45;
  }

  .redeem-button {
    flex: 0 0 auto;
    border: 1px solid rgba(103, 232, 249, 0.2);
    border-radius: 999px;
    background: rgba(103, 232, 249, 0.08);
    padding: 10px 13px;
    color: rgb(165, 243, 252);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.14em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .checkout-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 390px;
    gap: 22px;
    align-items: start;
  }

  .checkout-main {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  .checkout-card,
  .summary-card {
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 26px;
    background: rgba(7, 16, 30, 0.78);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
  }

  .checkout-card {
    padding: 20px;
  }

  .compact-card {
    padding: 18px;
  }

  .hero-card,
  .payment-card {
    overflow: hidden;
  }

  .hero-glow,
  .payment-card::before,
  .checkout-submit-aura,
  .bt-orb,
  .floating-orb,
  .form-orb {
    display: none !important;
  }

  .checkout-card-head {
    display: flex;
    align-items: center;
    gap: 13px;
    margin-bottom: 14px;
  }

  .compact-head {
    margin-bottom: 14px;
  }

  .checkout-card-head > span {
    display: grid;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid rgba(103, 232, 249, 0.14);
    border-radius: 15px;
    background: rgba(103, 232, 249, 0.075);
    color: rgb(165, 243, 252);
  }

  .checkout-card-head h2,
  .summary-head h2 {
    margin: 4px 0 0;
    color: #ffffff;
    font-size: 21px;
    font-weight: 760;
    letter-spacing: -0.045em;
    line-height: 1.05;
  }

  .checkout-copy {
    max-width: 720px;
    margin: 0;
    color: rgba(203, 213, 225, 0.68);
    font-size: 13.5px;
    line-height: 1.72;
  }

  .coupon-box {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }

  input,
  select {
    width: 100%;
    min-height: 52px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 15px;
    background: rgba(2, 6, 23, 0.56);
    padding: 0 14px;
    color: #ffffff;
    outline: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 750;
    transition: border-color 160ms ease, background 160ms ease;
  }

  input::placeholder {
    color: rgba(148, 163, 184, 0.52);
  }

  input:focus,
  select:focus {
    border-color: rgba(103, 232, 249, 0.42);
    background: rgba(2, 6, 23, 0.74);
  }

  select option {
    background: #07111f;
    color: white;
  }

  .coupon-box button,
  .remove-code {
    display: inline-flex;
    min-height: 52px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 15px;
    background: rgb(103, 232, 249);
    padding: 0 18px;
    color: rgb(2, 6, 23);
    cursor: pointer;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .coupon-box .remove-code {
    border: 1px solid rgba(248, 113, 113, 0.18);
    background: rgba(248, 113, 113, 0.1);
    color: rgb(254, 202, 202);
  }

  .coupon-box .locked-code {
    border: 1px solid rgba(245, 158, 11, 0.35);
    background: rgba(245, 158, 11, 0.14);
    color: rgb(253, 230, 138);
    cursor: not-allowed;
  }

  .coupon-locked-input {
    border-color: rgba(245, 158, 11, 0.34);
    background: rgba(245, 158, 11, 0.07);
    color: rgb(253, 230, 138);
    cursor: not-allowed;
  }

  .coupon-locked-note {
    margin: 10px 0 0;
    color: rgba(253, 230, 138, 0.82);
    font-size: 11px;
    font-weight: 800;
    line-height: 1.5;
  }

  .applied-code,
  .benefit-empty,
  .security-note,
  .summary-note,
  .summary-rewards,
  .payment-selected-note {
    display: flex;
    gap: 11px;
    margin-top: 13px;
    border: 1px solid rgba(103, 232, 249, 0.12);
    border-radius: 17px;
    background: rgba(103, 232, 249, 0.045);
    padding: 13px;
    color: rgba(226, 232, 240, 0.72);
    font-size: 12px;
    line-height: 1.55;
  }

  .payment-selected-note {
    margin-top: 12px;
  }

  .payment-red-warning {
    display: flex;
    gap: 11px;
    margin-top: 10px;
    border: 1px solid rgba(248, 113, 113, 0.24);
    border-radius: 17px;
    background: rgba(248, 113, 113, 0.075);
    padding: 13px;
    color: rgba(254, 202, 202, 0.94);
    font-size: 12px;
    font-weight: 800;
    line-height: 1.55;
  }

  .payment-red-warning p {
    margin: 0;
  }

  .payment-red-warning svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: rgb(252, 165, 165);
  }

  .applied-code p,
  .benefit-empty p,
  .security-note p,
  .summary-note p,
  .summary-rewards p,
  .payment-selected-note p {
    margin: 0;
  }

  .applied-code strong,
  .summary-rewards strong,
  .payment-selected-note strong {
    color: rgb(165, 243, 252);
  }

  .cashback-check {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border: 1px solid rgba(103, 232, 249, 0.14);
    border-radius: 17px;
    background: rgba(103, 232, 249, 0.045);
    padding: 14px;
    cursor: pointer;
  }

  .cashback-check input,
  .bank-marketing-check input {
    width: 18px;
    height: 18px;
    min-height: 18px;
    padding: 0;
    accent-color: rgb(103, 232, 249);
  }

  .cashback-check span {
    display: grid;
    gap: 4px;
  }

  .cashback-check strong {
    color: #ffffff;
    font-size: 13px;
    font-weight: 850;
  }

  .cashback-check small {
    color: rgba(203, 213, 225, 0.62);
    font-size: 11.5px;
    line-height: 1.45;
  }

  .reward-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .reward-grid div {
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 18px;
    background: rgba(2, 6, 23, 0.42);
    padding: 15px;
  }

  .reward-grid span {
    display: block;
    color: rgba(203, 213, 225, 0.58);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .reward-grid strong {
    display: block;
    margin-top: 7px;
    color: #ffffff;
    font-size: 25px;
    font-weight: 850;
    letter-spacing: -0.05em;
  }

  .checkout-soft-message,
  .error-message {
    margin: 12px 0 0;
    color: rgba(203, 213, 225, 0.66);
    font-size: 12px;
    line-height: 1.55;
  }

  .error-message {
    color: rgba(254, 202, 202, 0.9);
  }

  .payment-method-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .payment-method {
    position: relative;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    min-height: 92px;
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 20px;
    background: rgba(2, 6, 23, 0.45);
    padding: 14px;
    color: #ffffff;
    cursor: pointer;
    text-align: left;
    transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
  }

  .payment-method:hover {
    transform: translateY(-1px);
    border-color: rgba(103, 232, 249, 0.28);
    background: rgba(8, 24, 46, 0.72);
  }

  .payment-method.is-active {
    border-color: rgba(103, 232, 249, 0.68);
    background: rgba(8, 29, 45, 0.82);
  }

  .payment-icon {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    border: 1px solid rgba(103, 232, 249, 0.14);
    border-radius: 15px;
    background: rgba(103, 232, 249, 0.07);
    color: rgb(165, 243, 252);
  }

  .payment-copy {
    min-width: 0;
  }

  .payment-copy strong {
    display: block;
    color: #ffffff;
    font-size: 14px;
    font-weight: 870;
    letter-spacing: -0.025em;
  }

  .payment-copy small {
    display: block;
    margin-top: 4px;
    color: rgba(203, 213, 225, 0.6);
    font-size: 11px;
    line-height: 1.4;
  }

  .payment-method em {
    align-self: start;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    padding: 5px 8px;
    color: rgba(226, 232, 240, 0.78);
    font-size: 8px;
    font-style: normal;
    font-weight: 950;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .payment-method.is-active em {
    border-color: rgba(103, 232, 249, 0.36);
    background: rgb(103, 232, 249);
    color: rgb(2, 6, 23);
  }

  .payment-method em.payment-discount-badge {
    border-color: rgba(245, 158, 11, 0.55);
    background:
      linear-gradient(135deg, rgba(251, 191, 36, 0.98), rgba(245, 158, 11, 0.92)),
      rgb(245, 158, 11);
    color: rgb(20, 12, 3);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 10px 24px rgba(245, 158, 11, 0.22);
  }

  .payment-method.is-active em.payment-discount-badge {
    border-color: rgba(253, 230, 138, 0.8);
    background:
      linear-gradient(135deg, rgb(253, 224, 71), rgb(245, 158, 11));
    color: rgb(20, 12, 3);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.16) inset,
      0 12px 30px rgba(245, 158, 11, 0.34);
  }

  .manual-payment-panel {
    display: grid;
    gap: 14px;
    margin-top: 16px;
    border: 1px solid rgba(103, 232, 249, 0.14);
    border-radius: 22px;
    background:
      linear-gradient(135deg, rgba(103, 232, 249, 0.07), rgba(2, 6, 23, 0.16)),
      rgba(2, 6, 23, 0.38);
    padding: 16px;
  }

  .simple-manual-payment {
    gap: 12px;
    border-color: rgba(103, 232, 249, 0.18);
    background: rgba(2, 6, 23, 0.42);
  }

  .simple-manual-payment.is-ready {
    border-color: rgba(34, 197, 94, 0.28);
    background:
      linear-gradient(135deg, rgba(34, 197, 94, 0.075), rgba(2, 6, 23, 0.16)),
      rgba(2, 6, 23, 0.46);
  }

  .manual-payment-simple-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    padding-bottom: 12px;
  }

  .manual-payment-simple-head span,
  .manual-payment-simple-grid span {
    display: block;
    color: rgba(103, 232, 249, 0.72);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .manual-payment-simple-head strong {
    display: block;
    margin-top: 5px;
    color: white;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.055em;
    line-height: 1;
  }

  .manual-payment-simple-head p {
    margin: 6px 0 0;
    color: rgba(203, 213, 225, 0.62);
    font-size: 12px;
    line-height: 1.45;
  }

  .manual-payment-loading {
    display: grid;
    gap: 5px;
  }

  .manual-payment-loading span {
    color: rgba(103, 232, 249, 0.74);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .manual-payment-loading strong {
    color: #ffffff;
    font-size: 16px;
    font-weight: 850;
    letter-spacing: -0.03em;
  }

  .manual-payment-loading p,
  .manual-payment-expiry {
    margin: 0;
    color: rgba(203, 213, 225, 0.62);
    font-size: 12px;
    line-height: 1.5;
  }

  .manual-payment-expiry {
    border-top: 1px solid rgba(148, 163, 184, 0.12);
    padding-top: 12px;
  }

  .manual-payment-simple-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .manual-payment-simple-grid > div {
    min-width: 0;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 16px;
    background: rgba(2, 6, 23, 0.38);
    padding: 12px;
  }

  .manual-payment-simple-grid strong {
    display: block;
    margin-top: 7px;
    overflow-wrap: anywhere;
    color: white;
    font-size: 13px;
    font-weight: 900;
    line-height: 1.3;
  }

  .manual-payment-simple-grid small {
    display: block;
    margin-top: 5px;
    color: rgba(203, 213, 225, 0.58);
    font-size: 11px;
    line-height: 1.35;
  }

  .manual-payment-action.compact {
    min-height: 40px;
    padding: 0 13px;
    white-space: nowrap;
  }

  .manual-payment-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: start;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    padding-bottom: 14px;
  }

  .manual-payment-head span,
  .manual-payment-info-grid span {
    display: block;
    color: rgba(103, 232, 249, 0.72);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .manual-payment-head strong {
    display: block;
    margin-top: 5px;
    color: #ffffff;
    font-size: 17px;
    font-weight: 880;
    letter-spacing: -0.035em;
  }

  .manual-payment-head p {
    max-width: 640px;
    margin: 7px 0 0;
    color: rgba(203, 213, 225, 0.64);
    font-size: 12px;
    line-height: 1.6;
  }

  .manual-payment-total {
    min-width: 150px;
    border: 1px solid rgba(103, 232, 249, 0.13);
    border-radius: 17px;
    background: rgba(103, 232, 249, 0.055);
    padding: 12px;
    text-align: right;
  }

  .manual-payment-total small {
    display: block;
    color: rgba(203, 213, 225, 0.58);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .manual-payment-total strong {
    display: block;
    margin-top: 5px;
    color: rgb(165, 243, 252);
    font-size: 20px;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .manual-payment-info-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .manual-payment-info-grid > div {
    min-width: 0;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 18px;
    background: rgba(2, 6, 23, 0.42);
    padding: 14px;
  }

  .manual-payment-info-grid strong {
    display: block;
    margin-top: 7px;
    overflow-wrap: anywhere;
    color: #ffffff;
    font-size: 13px;
    font-weight: 900;
    line-height: 1.35;
  }

  .manual-payment-info-grid small {
    display: block;
    margin-top: 5px;
    color: rgba(203, 213, 225, 0.56);
    font-size: 11px;
    line-height: 1.35;
  }

  .manual-payment-action {
    display: inline-flex;
    width: fit-content;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(103, 232, 249, 0.25);
    border-radius: 999px;
    background: rgb(103, 232, 249);
    padding: 0 16px;
    color: rgb(2, 6, 23);
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.15em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .manual-payment-steps {
    display: grid;
    gap: 9px;
    margin: 0;
    padding-left: 20px;
    color: rgba(226, 232, 240, 0.76);
    font-size: 12px;
    font-weight: 760;
    line-height: 1.5;
  }

  .manual-payment-steps li::marker {
    color: rgb(165, 243, 252);
    font-weight: 950;
  }

  .manual-payment-warning {
    display: flex;
    gap: 10px;
    border: 1px solid rgba(245, 158, 11, 0.22);
    border-radius: 17px;
    background: rgba(245, 158, 11, 0.075);
    padding: 12px;
    color: rgba(253, 230, 138, 0.92);
    font-size: 12px;
    font-weight: 800;
    line-height: 1.5;
  }

  .manual-payment-warning p {
    margin: 0;
  }

  .manual-payment-warning svg {
    flex: 0 0 auto;
    margin-top: 2px;
  }


  .bank-checkout-panel {
    display: grid;
    gap: 14px;
    margin-top: 16px;
    border: 1px solid rgba(103, 232, 249, 0.12);
    border-radius: 22px;
    background: rgba(2, 6, 23, 0.34);
    padding: 16px;
  }

  .bank-checkout-intro {
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    padding-bottom: 14px;
  }

  .bank-checkout-intro strong {
    display: block;
    color: #ffffff;
    font-size: 16px;
    font-weight: 850;
    letter-spacing: -0.03em;
  }

  .bank-checkout-intro p {
    max-width: 620px;
    margin: 6px 0 0;
    color: rgba(203, 213, 225, 0.64);
    font-size: 12px;
    line-height: 1.6;
  }

  .bank-form-section {
    display: grid;
    gap: 12px;
  }

  .bank-section-title {
    display: grid;
    gap: 4px;
  }

  .bank-section-title small {
    color: rgba(203, 213, 225, 0.56);
    font-size: 12px;
    line-height: 1.45;
  }

  .bank-form-grid {
    display: grid;
    gap: 10px;
  }

  .bank-form-grid.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bank-form-grid.three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .bank-field {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .bank-field.is-full {
    grid-column: 1 / -1;
  }

  .bank-field > span {
    color: rgba(226, 232, 240, 0.75);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .bank-marketing-check {
    display: flex;
    align-items: center;
    gap: 9px;
    color: rgba(203, 213, 225, 0.7);
    font-size: 12px;
    line-height: 1.4;
  }

  .bank-shipping-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .bank-shipping-method,
  .manual-shipping-single {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    gap: 11px;
    align-items: center;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 18px;
    background: rgba(2, 6, 23, 0.45);
    padding: 13px;
    color: white;
    cursor: pointer;
    text-align: left;
  }

  .bank-shipping-method.is-active {
    border-color: rgba(103, 232, 249, 0.58);
    background: rgba(8, 29, 45, 0.78);
  }

  .manual-shipping-single {
    border-color: rgba(103, 232, 249, 0.2);
    background: rgba(8, 29, 45, 0.58);
  }

  .bank-shipping-method > span,
  .manual-shipping-single > span {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    border-radius: 14px;
    background: rgba(103, 232, 249, 0.08);
    color: rgb(165, 243, 252);
  }

  .bank-shipping-method strong,
  .manual-shipping-single strong {
    display: block;
    font-size: 13px;
    font-weight: 850;
  }

  .bank-shipping-method small,
  .manual-shipping-single small {
    display: block;
    margin-top: 3px;
    color: rgba(203, 213, 225, 0.58);
    font-size: 11px;
    line-height: 1.35;
  }

  .bank-shipping-method em,
  .manual-shipping-single em {
    color: rgb(165, 243, 252);
    font-size: 13px;
    font-style: normal;
    font-weight: 900;
    white-space: nowrap;
  }

  .free-shipping-price {
    color: rgb(165, 243, 252) !important;
    letter-spacing: 0.08em;
  }


  .phase-thanks-card {
    display: grid;
    gap: 14px;
    border: 1px solid rgba(103, 232, 249, 0.18);
    border-radius: 26px;
    background:
      linear-gradient(135deg, rgba(103, 232, 249, 0.08), rgba(2, 6, 23, 0.16)),
      rgba(2, 6, 23, 0.5);
    padding: 18px;
    box-shadow: none;
  }

  .phase-thanks-card-full {
    gap: 18px;
    padding: clamp(18px, 3vw, 28px);
    background: rgba(2, 6, 23, 0.72);
  }

  .phase-thanks-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
    padding-top: 14px;
  }

  .phase-thanks-actions-row a {
    display: inline-flex;
    min-height: 42px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(103, 232, 249, 0.18);
    border-radius: 999px;
    background: rgba(103, 232, 249, 0.08);
    padding: 0 15px;
    color: rgb(165, 243, 252);
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.14em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .phase-thanks-actions-row a:first-child {
    border: 0;
    background: rgb(103, 232, 249);
    color: rgb(2, 6, 23);
  }

  .phase-thanks-hero {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    padding-bottom: 14px;
  }

  .phase-thanks-icon {
    display: grid;
    width: 48px;
    height: 48px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid rgba(103, 232, 249, 0.2);
    border-radius: 17px;
    background: rgba(103, 232, 249, 0.08);
    color: rgb(165, 243, 252);
  }

  .phase-thanks-hero p,
  .phase-thanks-panel span,
  .phase-thanks-box-head span,
  .phase-thanks-line span {
    margin: 0;
    color: rgba(103, 232, 249, 0.72);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .phase-thanks-hero h2 {
    margin: 4px 0 0;
    color: #ffffff;
    font-size: clamp(28px, 4vw, 42px);
    font-weight: 790;
    letter-spacing: -0.06em;
    line-height: 0.96;
  }

  .phase-thanks-hero > div > span {
    display: block;
    margin-top: 8px;
    color: rgba(203, 213, 225, 0.66);
    font-size: 12.5px;
    line-height: 1.55;
  }

  .phase-thanks-grid,
  .phase-thanks-split {
    display: grid;
    gap: 12px;
  }

  .phase-thanks-grid.main-grid,
  .phase-thanks-split {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .phase-thanks-panel,
  .phase-thanks-box {
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 20px;
    background: rgba(2, 6, 23, 0.42);
    padding: 15px;
  }

  .phase-thanks-panel strong {
    display: block;
    margin-top: 7px;
    color: #ffffff;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.04em;
  }

  .phase-thanks-panel.payment-panel strong {
    color: rgb(165, 243, 252);
    font-size: 30px;
  }

  .phase-thanks-panel small,
  .phase-thanks-box-head + .phase-thanks-address,
  .phase-thanks-line.compact,
  .phase-thanks-items small {
    color: rgba(203, 213, 225, 0.58);
    font-size: 11.5px;
    line-height: 1.45;
  }

  .phase-thanks-box-head {
    display: grid;
    gap: 5px;
    margin-bottom: 12px;
  }

  .phase-thanks-box-head strong,
  .phase-thanks-line strong {
    color: #ffffff;
    font-size: 13px;
    font-weight: 880;
    line-height: 1.35;
  }

  .phase-thanks-line {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid rgba(148, 163, 184, 0.1);
    padding: 11px 0 0;
    margin-top: 11px;
  }

  .phase-thanks-line strong {
    text-align: right;
    word-break: break-word;
  }

  .phase-thanks-line.compact strong {
    max-width: 70%;
  }

  .phase-thanks-address {
    display: grid;
    gap: 3px;
    color: rgba(226, 232, 240, 0.78);
    font-size: 12px;
    line-height: 1.45;
  }

  .phase-thanks-address p {
    margin: 0;
  }

  .phase-thanks-action {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    margin-top: 14px;
    border-radius: 999px;
    background: rgb(103, 232, 249);
    padding: 0 16px;
    color: rgb(2, 6, 23);
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.14em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .phase-thanks-items {
    display: grid;
    gap: 10px;
  }

  .phase-thanks-items > div {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    border-top: 1px solid rgba(148, 163, 184, 0.1);
    padding-top: 10px;
  }

  .phase-thanks-item-media {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.45);
    overflow: hidden;
  }

  .phase-thanks-item-media img {
    width: 34px;
    height: 34px;
    object-fit: contain;
  }

  .phase-thanks-item-copy {
    min-width: 0;
  }

  .phase-thanks-items > div:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .phase-thanks-items strong {
    display: block;
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 850;
    line-height: 1.35;
  }

  .phase-thanks-items small {
    display: block;
    margin-top: 3px;
  }

  .phase-thanks-items em {
    color: rgb(165, 243, 252);
    font-size: 12px;
    font-style: normal;
    font-weight: 900;
    white-space: nowrap;
  }

  .phase-thanks-warning {
    display: flex;
    gap: 10px;
    border: 1px solid rgba(248, 113, 113, 0.24);
    border-radius: 18px;
    background: rgba(248, 113, 113, 0.075);
    padding: 13px;
    color: rgba(254, 202, 202, 0.94);
    font-size: 12px;
    font-weight: 800;
    line-height: 1.55;
  }

  .phase-thanks-warning p {
    margin: 0;
  }

  .phase-thanks-warning svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: rgb(252, 165, 165);
  }

  .checkout-error,
  .checkout-success-message {
    margin: 0;
    border: 1px solid rgba(248, 113, 113, 0.22);
    border-radius: 16px;
    background: rgba(248, 113, 113, 0.08);
    padding: 13px 15px;
    color: rgb(254, 202, 202);
    font-size: 12px;
    font-weight: 800;
    line-height: 1.55;
  }

  .checkout-success-message {
    border-color: rgba(103, 232, 249, 0.2);
    background: rgba(103, 232, 249, 0.06);
    color: rgba(207, 250, 254, 0.92);
  }

  .compliance-check {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border: 1px solid rgba(103, 232, 249, 0.16);
    border-radius: 18px;
    background: rgba(103, 232, 249, 0.055);
    padding: 15px;
    color: rgba(226, 232, 240, 0.78);
    cursor: pointer;
    font-size: 12px;
    font-weight: 720;
    line-height: 1.6;
  }

  .compliance-check.has-error {
    border-color: rgba(248, 113, 113, 0.32);
    background: rgba(248, 113, 113, 0.075);
  }

  .compliance-check input {
    width: 18px;
    height: 18px;
    min-height: 18px;
    flex: 0 0 auto;
    margin-top: 2px;
    padding: 0;
    accent-color: rgb(103, 232, 249);
  }

  .compliance-copy {
    display: block;
    color: rgba(226, 232, 240, 0.78);
  }

  .compliance-copy a {
    color: rgb(165, 243, 252);
    font-weight: 900;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .checkout-submit {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 18px;
    min-height: 62px;
    width: 100%;
    border: 1px solid rgba(165, 243, 252, 0.22);
    border-radius: 18px;
    background:
      linear-gradient(135deg, rgba(103, 232, 249, 0.12), rgba(255, 255, 255, 0.025)),
      rgba(2, 6, 23, 0.78);
    color: white;
    cursor: pointer;
    padding: 0 14px 0 22px;
    text-align: left;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      0 18px 45px rgba(0, 0, 0, 0.18);
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      background 180ms ease;
  }

  .checkout-submit:hover {
    transform: translateY(-2px);
    border-color: rgba(103, 232, 249, 0.48);
    background:
      linear-gradient(135deg, rgba(103, 232, 249, 0.18), rgba(255, 255, 255, 0.035)),
      rgba(4, 16, 30, 0.88);
  }

  .checkout-submit:disabled {
    cursor: wait;
    opacity: 0.7;
    transform: none;
  }

  .checkout-submit-main {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .checkout-submit-main strong {
    display: block;
    color: white;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 0.18em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .checkout-submit-main span {
    display: block;
    color: rgba(203, 213, 225, 0.62);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: 0;
    text-transform: none;
  }

  .checkout-submit-icon {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    border: 1px solid rgba(165, 243, 252, 0.18);
    border-radius: 15px;
    background: rgb(103, 232, 249);
    color: rgb(2, 6, 23);
    font-size: 18px;
    font-weight: 950;
    transition:
      transform 180ms ease,
      background 180ms ease;
  }

  .checkout-submit:hover .checkout-submit-icon {
    transform: translateX(2px);
    background: white;
  }

  .security-note {
    margin-top: 0;
  }

  .checkout-summary {
    position: sticky;
    top: 92px;
  }

  .summary-card {
    overflow: hidden;
    padding: 22px;
  }

  .summary-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
    color: rgb(165, 243, 252);
  }

  .summary-items {
    display: grid;
    gap: 14px;
    max-height: 360px;
    overflow: auto;
    padding-right: 2px;
  }

  .summary-item {
    display: grid;
    grid-template-columns: 60px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .summary-image {
    position: relative;
    display: grid;
    width: 60px;
    height: 60px;
    place-items: center;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 17px;
    background: rgba(2, 6, 23, 0.48);
  }

  .summary-image img {
    max-width: 47px;
    max-height: 47px;
    object-fit: contain;
  }

  .summary-image span {
    position: absolute;
    right: -6px;
    top: -2px;
    display: grid;
    min-width: 22px;
    height: 22px;
    place-items: center;
    border: 2px solid #081426;
    border-radius: 999px;
    background: rgb(103, 232, 249);
    color: rgb(2, 6, 23);
    font-size: 10px;
    font-weight: 950;
    z-index: 2;
  }

  .summary-item h3 {
    margin: 0;
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 850;
    line-height: 1.35;
  }

  .summary-item p {
    margin: 4px 0 0;
    color: rgba(203, 213, 225, 0.54);
    font-size: 10.5px;
    line-height: 1.35;
  }

  .summary-item .gift-label {
    color: rgb(165, 243, 252);
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .summary-item strong {
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 900;
    white-space: nowrap;
  }

  .summary-lines {
    display: grid;
    gap: 11px;
    margin-top: 18px;
    border-top: 1px solid rgba(148, 163, 184, 0.14);
    padding-top: 16px;
  }

  .summary-lines div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: rgba(203, 213, 225, 0.68);
    font-size: 13px;
  }

  .summary-lines strong {
    color: #ffffff;
    font-weight: 850;
  }

  .summary-lines .coupon-line strong,
  .summary-lines .cashback-line strong,
  .summary-lines .payment-discount-line strong,
  .summary-lines .shipping-line strong {
    color: rgb(165, 243, 252);
  }

  .summary-lines .total,
  .due-total {
    margin-top: 4px;
    border-top: 1px solid rgba(148, 163, 184, 0.14);
    padding-top: 13px;
    color: #ffffff;
    font-size: 18px;
    font-weight: 900;
  }

  .summary-rewards,
  .summary-note {
    margin-top: 14px;
  }

  .checkout-empty {
    width: min(560px, 100%);
    margin: 80px auto;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 28px;
    background: rgba(7, 16, 30, 0.78);
    padding: 32px;
    text-align: center;
  }

  .checkout-empty p {
    margin: 0;
    color: rgb(165, 243, 252);
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .checkout-empty h1 {
    margin: 10px 0 0;
    color: white;
    font-size: 44px;
    letter-spacing: -0.06em;
  }

  .checkout-empty a {
    display: inline-flex;
    margin-top: 20px;
    border-radius: 999px;
    background: rgb(103, 232, 249);
    padding: 13px 18px;
    color: rgb(2, 6, 23);
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.16em;
    text-decoration: none;
    text-transform: uppercase;
  }

  @media (max-width: 1100px) {
    .checkout-grid {
      grid-template-columns: 1fr;
    }

    .checkout-summary {
      position: relative;
      top: auto;
      order: -1;
    }

    .checkout-heading {
      grid-template-columns: 1fr;
      align-items: start;
    }

    .rewards-badge,
    .account-rewards-card {
      width: 100%;
    }
  }

  @media (max-width: 820px) {
    .checkout-page {
      padding: 58px 14px 56px;
    }

    .checkout-topbar {
      align-items: stretch;
      flex-direction: column;
    }

    .checkout-back,
    .checkout-secure {
      width: 100%;
    }

    .checkout-heading h1 {
      font-size: 42px;
    }

    .checkout-card,
    .summary-card {
      border-radius: 22px;
      padding: 15px;
    }

    .payment-method-grid,
    .bank-shipping-options,
    .reward-grid,
    .manual-payment-head,
    .manual-payment-info-grid,
    .bank-form-grid.two,
    .bank-form-grid.three,
    .phase-thanks-grid.main-grid,
    .phase-thanks-split {
      grid-template-columns: 1fr;
    }

    .payment-method {
      grid-template-columns: 42px minmax(0, 1fr);
      min-height: auto;
    }

    .payment-method em {
      grid-column: 2;
      width: fit-content;
    }

    .coupon-box {
      grid-template-columns: 1fr;
    }

    .coupon-box button {
      width: 100%;
    }


    .manual-payment-simple-head,
    .manual-payment-simple-grid {
      grid-template-columns: 1fr;
    }

    .manual-payment-simple-head {
      align-items: stretch;
      flex-direction: column;
    }


    .manual-thanks-page {
      padding: 42px 12px 44px;
    }

    .phase-thanks-card-full {
      border-radius: 22px;
      padding: 15px;
    }

    .phase-thanks-hero {
      display: grid;
      gap: 11px;
    }

    .phase-thanks-line {
      display: grid;
      gap: 6px;
    }

    .phase-thanks-line strong,
    .phase-thanks-line.compact strong {
      max-width: 100%;
      text-align: left;
    }

    .phase-thanks-items > div {
      grid-template-columns: 40px minmax(0, 1fr);
    }

    .phase-thanks-items em {
      grid-column: 2;
      justify-self: start;
    }

    .phase-thanks-actions-row {
      justify-content: stretch;
    }

    .phase-thanks-actions-row a {
      width: 100%;
    }

    .manual-payment-action.compact {
      width: 100%;
    }

    .checkout-submit {
      min-height: 60px;
      border-radius: 17px;
      padding-left: 18px;
    }

    .checkout-submit-main strong {
      font-size: 10px;
      letter-spacing: 0.16em;
    }

    .checkout-submit-main span {
      font-size: 11px;
    }

    .checkout-submit-icon {
      width: 42px;
      height: 42px;
    }

    .summary-item {
      grid-template-columns: 58px minmax(0, 1fr);
    }

    .summary-item strong {
      grid-column: 2;
    }
  }

  @media (max-width: 460px) {
    .checkout-heading h1 {
      font-size: 38px;
    }

    .bank-checkout-panel,
    .manual-payment-panel {
      padding: 13px;
    }

    .manual-payment-total {
      text-align: left;
    }

    .bank-shipping-method,
    .manual-shipping-single {
      grid-template-columns: 38px minmax(0, 1fr);
    }

    .bank-shipping-method em,
    .manual-shipping-single em {
      grid-column: 2;
    }
  }
`;
