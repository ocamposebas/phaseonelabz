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
const WOO_URL = import.meta.env.PUBLIC_WOOCOMMERCE_URL || "";
const PAYMENT_DISCOUNT_RATE = 0.05;
const PAYMENT_DISCOUNT_METHOD_IDS = ["venmo", "zelle", "bank"];

const PAYMENT_METHODS = [
  {
    id: "card",
    label: "Card",
    title: "Credit / Debit Card",
    description: "Continue to the same secure checkout and pay by card.",
    badge: "Secure",
    flow: "secure_checkout",
    gatewayId: "",
    icon: CreditCard,
    cta: "Continue to secure checkout",
  },
  {
    id: "venmo",
    label: "Venmo",
    title: "Venmo",
    description: "Continue to secure checkout and save 5% when paying with Venmo.",
    badge: "5% OFF",
    flow: "secure_checkout",
    gatewayId: "",
    icon: Smartphone,
    cta: "Continue to secure checkout",
  },
  {
    id: "zelle",
    label: "Zelle",
    title: "Zelle",
    description: "Continue to secure checkout and save 5% when paying with Zelle.",
    badge: "5% OFF",
    flow: "secure_checkout",
    gatewayId: "",
    icon: Building2,
    cta: "Continue to secure checkout",
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
    price: 9.95,
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

function getSavedCoupon() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);

  const fromUrl =
    params.get("coupon") ||
    params.get("coupon_code") ||
    params.get("affiliate_coupon") ||
    params.get("phaseone_coupon") ||
    params.get("ref") ||
    "";

  const cleanFromUrl = normalizeCoupon(fromUrl);

  /*
    Important:
    Do not auto-prefill coupons from old localStorage/session values.
    This prevents test codes like PRUEBA10 from appearing automatically.
    Only a coupon explicitly present in the current URL can prefill the field.
  */
  if (cleanFromUrl) {
    localStorage.setItem("phaseone_checkout_coupon", cleanFromUrl);
    return cleanFromUrl;
  }

  localStorage.removeItem("phaseone_checkout_coupon");

  return "";
}

function saveCoupon(value = "") {
  if (typeof window === "undefined") return "";

  const cleanCoupon = normalizeCoupon(value);

  if (cleanCoupon) {
    localStorage.setItem("phaseone_checkout_coupon", cleanCoupon);
  } else {
    localStorage.removeItem("phaseone_checkout_coupon");
  }

  return cleanCoupon;
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
    item.variationDatabaseId
  );
}

function getCartItemPrice(item = {}) {
  if (isRewardGiftItem(item)) {
    return 0;
  }

  return Number(item.price || item.sale_price || item.regular_price || 0);
}

function calculateCartTotal(items = []) {
  return items.reduce((total, item) => {
    return total + getCartItemPrice(item) * Number(item.quantity || 1);
  }, 0);
}

function getItemImage(item = {}) {
  return (
    item.image ||
    item.images?.[0]?.src ||
    item.images?.[0]?.url ||
    item.featuredImage ||
    "/tarro.png"
  );
}

function getItemOptions(item = {}) {
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

function buildCheckoutItems(cartItems = []) {
  /* Used for coupon validation and eDebit/ACH. Rewards remain visual only. */
  const officialItems = cartItems
    .filter((item) => !isRewardGiftItem(item))
    .map((item) => ({
      product_id: getOfficialProductId(item),
      variation_id: getOfficialVariationId(item),
      quantity: Number(item.quantity || 1),
      price: getCartItemPrice(item),
      regular_price: Number(item.regular_price || item.price || 0),
      sale_price: Number(item.sale_price || item.price || 0),
      variation:
        item.variation ||
        item.variation_attributes ||
        item.selectedAttributes ||
        item.selectedOptions ||
        {},
    }))
    .filter((item) => item.product_id > 0 && item.quantity > 0);

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

  const cleanCoupon = normalizeCoupon(coupon);
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

  if (cleanCoupon && discountToken) {
    url.searchParams.set("phaseone_coupon", cleanCoupon);
    url.searchParams.set("phaseone_discount_token", discountToken);
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

  // Important: card keeps the normal checkout flow without payment discount.
  // Venmo and Zelle keep the same secure flow, but receive a 5% discount flag.
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

    setCoupon(cleanCoupon);
    setCouponInput(cleanCoupon);

    if (cleanCoupon) {
      setCouponStatus("idle");
      setCouponMessage("Apply the code from your link to preview the discount.");
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

  const selectedShippingMethod =
    BANK_SHIPPING_METHODS.find((method) => method.id === selectedShippingMethodId) ||
    BANK_SHIPPING_METHODS[0];

  const paymentDiscountBase = Math.max(previewTotal, 0);
  const paymentMethodDiscount = getPaymentDiscountAmount(
    selectedPaymentMethod?.id,
    paymentDiscountBase
  );
  const paymentDiscountLabel = getPaymentDiscountLabel(selectedPaymentMethod);

  const bankShippingCost = selectedPaymentMethod?.id === "bank"
    ? Number(selectedShippingMethod?.price || 0)
    : 0;

  const paymentPreviewTotal = Math.max(
    previewTotal - paymentMethodDiscount + bankShippingCost,
    0
  );

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
    const cleanValue = normalizeCoupon(event.target.value);
    setCouponInput(cleanValue);
    setCouponMessage("");

    if (cleanValue !== coupon) {
      setCouponStatus("idle");
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");
    }
  };

  const applyCoupon = async () => {
    const cleanCoupon = normalizeCoupon(couponInput);

    if (!cleanCoupon) {
      saveCoupon("");
      setCoupon("");
      setCouponStatus("error");
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");
      setCouponMessage("Enter a promo or affiliate code first.");
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
      setCouponMessage("Validating coupon...");
      setCouponDiscount(0);
      setCouponData(null);
      setDiscountToken("");

      const token = getAccountToken();
      const checkoutItems = buildCheckoutItems(cartItems);
      const customerEmail = accountUser?.email || session?.customer?.email || "";

      console.log("PHASE ONE COUPON REQUEST:", {
        endpoint: VALIDATE_COUPON_ENDPOINT,
        coupon: cleanCoupon,
        subtotal: cartTotal,
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
          subtotal: cartTotal,
          customerEmail,
          customer_email: customerEmail,
          items: checkoutItems,
          cartItems: checkoutItems,
        }),
      });

      const rawText = await response.text();

      console.log("PHASE ONE COUPON RAW RESPONSE:", {
        status: response.status,
        ok: response.ok,
        rawText,
      });

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
          `Coupon validation failed with status ${response.status}.`;

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

      const serverCoupon = data?.coupon?.code || data?.code || cleanCoupon;
      const savedCoupon = saveCoupon(serverCoupon);
      const couponDetails = data?.coupon || {};

      if (discountAmount <= 0) {
        throw new Error(
          data?.error ||
            data?.message ||
            "This coupon was found, but it returned no discount."
        );
      }

      if (!secureToken) {
        throw new Error(
          "Coupon validated, but the secure discount token was not returned."
        );
      }

      setCoupon(savedCoupon);
      setCouponStatus("valid");
      setCouponDiscount(discountAmount);
      setCouponData({
        ...data,
        ...couponDetails,
        discount_type:
          couponDetails.discount_type ||
          couponDetails.discountType ||
          data.discount_type ||
          data.discountType ||
          "",
      });
      setDiscountToken(secureToken);
      setCouponMessage(
        data?.message || `${savedCoupon} applied: -${formatMoney(discountAmount)}.`
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

  const removeCoupon = () => {
    saveCoupon("");
    setCoupon("");
    setCouponInput("");
    setCouponStatus("idle");
    setCouponDiscount(0);
    setCouponData(null);
    setDiscountToken("");
    setCouponMessage("Coupon removed.");
  };

  const validateBeforePayment = () => {
    setError("");

    if (!hasItems) {
      setError("Your cart is empty.");
      return false;
    }

    const typedCoupon = normalizeCoupon(couponInput);

    if (typedCoupon && couponStatus !== "valid") {
      setError("Please apply and validate the coupon before continuing.");
      return false;
    }

    if (couponStatus === "valid" && !discountToken) {
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

    const checkoutUrl = buildWooCheckoutUrl({
      session,
      cartItems,
      coupon: couponStatus === "valid" ? coupon : "",
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
          shippingMethod: selectedShippingMethod,
          shipping_method: selectedShippingMethod,
          shippingTotal: Number(selectedShippingMethod?.price || 0),
          shipping_total: Number(selectedShippingMethod?.price || 0),

          couponCode: couponStatus === "valid" ? coupon : "",
          coupon: couponStatus === "valid" ? coupon : "",
          discountToken: couponStatus === "valid" ? discountToken : "",
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

  const handleContinuePayment = () => {
    if (selectedPaymentMethod?.id === "bank") {
      createBankTransferOrder();
      return;
    }

    setPaymentNotice("");
    continueToWooCheckout();
  };


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

        <div className="checkout-hero">
          <div className="checkout-hero-copy">
            <p>Phase One Labs</p>
            <h1>Review your order</h1>
            <span>
              Apply savings, choose payment, confirm research-use terms, and continue securely.
            </span>
          </div>

          {isLoggedIn ? (
            <div className="account-chip">
              <span>
                <UserRound size={15} />
              </span>

              <div>
                <strong>{accountDisplayName}</strong>
                <small>
                  {formatMoney(storeCredit)} cashback · {pointsBalance.toLocaleString("en-US")} points
                </small>
              </div>

              <a href="/account#rewards">Rewards</a>
            </div>
          ) : (
            <a href="/account" className="account-chip account-chip-link">
              <span>
                <Gift size={15} />
              </span>

              <div>
                <strong>{accountLoading ? "Checking account..." : "Sign in to earn points"}</strong>
                <small>Earn approx. {estimatedPoints} points with this order.</small>
              </div>
            </a>
          )}
        </div>

        <div className="checkout-grid">
          <div className="checkout-main">
            <section className="checkout-panel savings-panel">
              <div className="panel-title-row">
                <div className="panel-title-icon">
                  <Sparkles size={16} />
                </div>

                <div>
                  <p>Savings & benefits</p>
                  <h2>Promo, cashback, and rewards</h2>
                </div>
              </div>

              <div className="savings-stack">
                <div className="savings-row savings-row-prominent">
                  <div className="savings-row-head">
                    <span>
                      <Tag size={15} />
                    </span>

                    <div>
                      <strong>Coupon or affiliate code</strong>
                      <small>Apply a valid promo before continuing.</small>
                    </div>
                  </div>

                  <div className="coupon-box">
                    <input
                      value={couponInput}
                      onChange={handleCouponInput}
                      placeholder="Enter code"
                      inputMode="text"
                      autoCapitalize="characters"
                    />

                    {couponStatus === "valid" ? (
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

                  {couponStatus === "valid" && coupon && (
                    <div className="inline-message success-message">
                      <BadgeCheck size={15} />
                      <p>
                        <strong>{coupon}</strong> applied · -{formatMoney(validatedCouponDiscount)}
                        {couponData?.discount_type ? ` · ${couponData.discount_type}` : ""}
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

                <div className="savings-row-grid">
                  <div className="savings-row compact-benefit-row">
                    <div className="savings-row-head">
                      <span>
                        <Wallet size={15} />
                      </span>

                      <div>
                        <strong>Cashback</strong>
                        <small>{isLoggedIn ? `${formatMoney(cashbackAvailable)} available` : "Sign in required"}</small>
                      </div>
                    </div>

                    {isLoggedIn ? (
                      canApplyCashback ? (
                        <label className="simple-check">
                          <input
                            type="checkbox"
                            checked={applyCashback}
                            onChange={(event) => setApplyCashback(event.target.checked)}
                          />
                          <span>Apply up to {formatMoney(Math.min(cashbackAvailable, cartTotal))}</span>
                        </label>
                      ) : (
                        <p className="muted-line">No cashback balance available yet.</p>
                      )
                    ) : (
                      <p className="muted-line">Sign in to use cashback.</p>
                    )}
                  </div>

                  <div className="savings-row compact-benefit-row">
                    <div className="savings-row-head">
                      <span>
                        <Gift size={15} />
                      </span>

                      <div>
                        <strong>Rewards</strong>
                        <small>Points and free gifts</small>
                      </div>
                    </div>

                    <div className="mini-stats">
                      <div>
                        <span>Points</span>
                        <strong>{estimatedPoints.toLocaleString("en-US")}</strong>
                      </div>

                      <div>
                        <span>Gifts</span>
                        <strong>{rewardGifts?.length || 0}</strong>
                      </div>
                    </div>

                    {rewardProgress?.nextTier && (
                      <p className="muted-line">
                        {formatMoney(rewardProgress.remaining)} away from {rewardProgress.nextTier.shortTitle || "next reward"}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="checkout-panel payment-panel">
              <div className="panel-title-row">
                <div className="panel-title-icon">
                  <CreditCard size={16} />
                </div>

                <div>
                  <p>Payment</p>
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

              <div className="inline-message payment-note">
                <ShieldCheck size={15} />
                <p>
                  Selected: <strong>{selectedPaymentMethod.title}</strong>. {" "}
                  {paymentMethodDiscount > 0
                    ? `${paymentDiscountLabel} is applied to your estimated total.`
                    : selectedPaymentMethod.id === "bank"
                      ? "You will continue directly to the verified bank transfer portal."
                      : "You will continue through the secure checkout flow."}
                </p>
              </div>

              {["venmo", "zelle"].includes(selectedPaymentMethod.id) && (
                <div className="inline-message warning-message">
                  <AlertTriangle size={15} />
                  <p>
                    Include your order number only. Do not include peptide or product names in the payment note.
                  </p>
                </div>
              )}

              {selectedPaymentMethod.id === "bank" && (
                <div className="bank-checkout-panel">
                  <div className="bank-checkout-intro">
                    <strong>ACH checkout details</strong>
                    <p>
                      Complete contact, delivery, and shipping. Your ACH 5% discount is already reflected in the order summary.
                    </p>
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
                        onChange={(event) => updateCheckoutField("acceptsMarketing", event.target.checked)}
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
                      <small>Select how you want this order shipped.</small>
                    </div>

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
                              <small>{method.description}</small>
                            </div>

                            <em>{formatMoney(method.price)}</em>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {error && <p className="checkout-alert error-alert">{error}</p>}
            {paymentNotice && !error && <p className="checkout-alert success-alert">{paymentNotice}</p>}

            <label className={`compliance-check ${!policyAcknowledged && error ? "has-error" : ""}`}>
              <input
                type="checkbox"
                checked={policyAcknowledged}
                onChange={(event) => {
                  setPolicyAcknowledged(event.target.checked);
                  if (event.target.checked) setError("");
                }}
              />

              <span className="compliance-copy">
                I confirm I am 21 or older, I am acquiring these compounds for in-vitro research or laboratory use only, and I agree to the {" "}
                <a href={POLICY_LINKS.terms}>Terms & Conditions</a>, {" "}
                <a href={POLICY_LINKS.refund}>Refund Policy</a>, and {" "}
                <a href={POLICY_LINKS.researchUse}>Research Use Only policy</a>.
              </span>
            </label>

            <button
              type="button"
              onClick={handleContinuePayment}
              disabled={loading}
              className="checkout-submit"
            >
              <span className="checkout-submit-main">
                <strong>
                  {loading
                    ? "Opening secure checkout"
                    : selectedPaymentMethod?.id === "bank"
                      ? "Continue with ACH Discount"
                      : "Continue to secure checkout"}
                </strong>

                <span>
                  {paymentMethodDiscount > 0
                    ? `${paymentDiscountLabel} applied.`
                    : "Protected payment redirect."}
                </span>
              </span>

              <span className="checkout-submit-icon">→</span>
            </button>

            <div className="security-note">
              <ShieldCheck size={17} />
              <p>
                Venmo, Zelle, and ACH Bank Transfer receive a 5% payment discount. ACH is applied immediately before continuing to the bank portal.
              </p>
            </div>
          </div>

          <aside className="checkout-summary">
            <div className="summary-card">
              <div className="summary-head">
                <div>
                  <p>Order summary</p>
                  <h2>{cartItems.length} item{cartItems.length === 1 ? "" : "s"}</h2>
                </div>

                <PackageCheck size={18} />
              </div>

              <div className="summary-items">
                {cartItems.map((item, index) => {
                  const image = getItemImage(item);
                  const options = getItemOptions(item);
                  const isRewardGift = isRewardGiftItem(item);
                  const quantity = Number(item.quantity || 1);
                  const unitPrice = getCartItemPrice(item);
                  const lineTotal = unitPrice * quantity;
                  const bundleApplied = Boolean(item.bundleApplied || item.bundle_applied || item.bundleDiscountPercent);
                  const originalUnitPrice = Number(item.originalPrice || item.original_price || item.regular_price || 0);
                  const originalLineTotal = originalUnitPrice > unitPrice ? originalUnitPrice * quantity : 0;

                  return (
                    <div key={item.cartKey || `${item.id}-${options}-${index}`} className="summary-item">
                      <div className="summary-image">
                        <img src={image} alt={item.name} />
                        <span>{quantity}</span>
                      </div>

                      <div className="summary-item-copy">
                        <h3>{item.name}</h3>
                        {options && <p>{options}</p>}
                        {isRewardGift && <p className="gift-label">Free reward</p>}
                        {bundleApplied && !isRewardGift && <p className="bundle-label">Bundle discount applied</p>}
                      </div>

                      <strong>
                        {isRewardGift ? (
                          "FREE"
                        ) : (
                          <>
                            {originalLineTotal > 0 && <small>{formatMoney(originalLineTotal)}</small>}
                            {formatMoney(lineTotal)}
                          </>
                        )}
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
                  <div className="saving-line">
                    <span>Coupon {coupon}</span>
                    <strong>-{formatMoney(validatedCouponDiscount)}</strong>
                  </div>
                )}

                {cashbackToApply > 0 && (
                  <div className="saving-line">
                    <span>Cashback selected</span>
                    <strong>-{formatMoney(cashbackToApply)}</strong>
                  </div>
                )}

                {paymentMethodDiscount > 0 && (
                  <div className="saving-line amber-line">
                    <span>{paymentDiscountLabel}</span>
                    <strong>-{formatMoney(paymentMethodDiscount)}</strong>
                  </div>
                )}

                {selectedPaymentMethod?.id === "bank" && (
                  <div>
                    <span>{selectedShippingMethod?.title || "Shipping"}</span>
                    <strong>{formatMoney(bankShippingCost)}</strong>
                  </div>
                )}

                <div className="total due-total">
                  <span>Estimated due</span>
                  <strong>{formatMoney(paymentPreviewTotal)}</strong>
                </div>
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
    padding: 68px 18px 70px;
    color: #ffffff;
    background: transparent;
  }

  .checkout-empty-page {
    display: grid;
    place-items: center;
  }

  .checkout-shell {
    width: min(1160px, 100%);
    margin: 0 auto;
  }

  .checkout-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }

  .checkout-back,
  .checkout-secure {
    display: inline-flex;
    min-height: 38px;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.42);
    padding: 0 14px;
    color: rgba(207, 250, 254, 0.86);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .checkout-secure {
    color: rgba(226, 232, 240, 0.72);
  }

  .checkout-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 18px;
    align-items: end;
    margin-bottom: 22px;
  }

  .checkout-hero-copy p,
  .panel-title-row p,
  .summary-head p,
  .bank-section-title span {
    margin: 0;
    color: rgba(103, 232, 249, 0.72);
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .checkout-hero-copy h1 {
    margin: 6px 0 0;
    color: #ffffff;
    font-size: clamp(40px, 5vw, 62px);
    font-weight: 740;
    letter-spacing: -0.075em;
    line-height: 0.92;
  }

  .checkout-hero-copy span {
    display: block;
    max-width: 620px;
    margin-top: 12px;
    color: rgba(203, 213, 225, 0.65);
    font-size: 13.5px;
    line-height: 1.65;
  }

  .account-chip {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    width: min(420px, 100%);
    border: 1px solid rgba(103, 232, 249, 0.14);
    border-radius: 22px;
    background: rgba(8, 20, 34, 0.68);
    padding: 12px;
    color: inherit;
    text-decoration: none;
  }

  .account-chip > span,
  .panel-title-icon,
  .savings-row-head > span,
  .payment-icon {
    display: grid;
    place-items: center;
    border: 1px solid rgba(103, 232, 249, 0.14);
    background: rgba(103, 232, 249, 0.075);
    color: rgb(165, 243, 252);
  }

  .account-chip > span {
    width: 42px;
    height: 42px;
    border-radius: 15px;
  }

  .account-chip strong {
    display: block;
    overflow: hidden;
    color: #ffffff;
    font-size: 13px;
    font-weight: 850;
    letter-spacing: -0.025em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-chip small {
    display: block;
    margin-top: 4px;
    color: rgba(203, 213, 225, 0.62);
    font-size: 11px;
    line-height: 1.45;
  }

  .account-chip a {
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
    gap: 20px;
    align-items: start;
  }

  .checkout-main {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  .checkout-panel,
  .summary-card {
    border: 1px solid rgba(148, 163, 184, 0.13);
    border-radius: 26px;
    background: rgba(7, 16, 30, 0.74);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.16);
  }

  .checkout-panel {
    padding: 18px;
  }

  .panel-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .panel-title-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    border-radius: 15px;
  }

  .panel-title-row h2,
  .summary-head h2 {
    margin: 4px 0 0;
    color: #ffffff;
    font-size: 21px;
    font-weight: 760;
    letter-spacing: -0.045em;
    line-height: 1.05;
  }

  .savings-stack {
    display: grid;
    gap: 12px;
  }

  .savings-row,
  .inline-message,
  .security-note,
  .summary-note {
    border: 1px solid rgba(103, 232, 249, 0.11);
    border-radius: 18px;
    background: rgba(103, 232, 249, 0.035);
  }

  .savings-row {
    padding: 14px;
  }

  .savings-row-prominent {
    background: rgba(2, 6, 23, 0.32);
  }

  .savings-row-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .savings-row-head {
    display: flex;
    gap: 11px;
    align-items: center;
    margin-bottom: 12px;
  }

  .savings-row-head > span {
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    border-radius: 14px;
  }

  .savings-row-head strong {
    display: block;
    color: #ffffff;
    font-size: 13px;
    font-weight: 860;
    letter-spacing: -0.025em;
  }

  .savings-row-head small,
  .muted-line {
    display: block;
    margin-top: 3px;
    color: rgba(203, 213, 225, 0.58);
    font-size: 11.5px;
    line-height: 1.45;
  }

  .muted-line {
    margin: 0;
  }

  .coupon-box {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }

  input,
  select {
    width: 100%;
    min-height: 50px;
    border: 1px solid rgba(148, 163, 184, 0.17);
    border-radius: 15px;
    background: rgba(2, 6, 23, 0.54);
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
    min-height: 50px;
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

  .inline-message {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-top: 12px;
    padding: 12px;
    color: rgba(226, 232, 240, 0.72);
    font-size: 12px;
    line-height: 1.55;
  }

  .inline-message p,
  .security-note p,
  .summary-note p {
    margin: 0;
  }

  .inline-message strong {
    color: rgb(165, 243, 252);
  }

  .success-message {
    border-color: rgba(103, 232, 249, 0.16);
    background: rgba(103, 232, 249, 0.055);
  }

  .warning-message {
    border-color: rgba(248, 113, 113, 0.24);
    background: rgba(248, 113, 113, 0.075);
    color: rgba(254, 202, 202, 0.94);
    font-weight: 800;
  }

  .warning-message svg {
    color: rgb(252, 165, 165);
  }

  .checkout-soft-message,
  .error-message {
    margin: 11px 0 0;
    color: rgba(203, 213, 225, 0.66);
    font-size: 12px;
    line-height: 1.55;
  }

  .error-message {
    color: rgba(254, 202, 202, 0.9);
  }

  .simple-check {
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgba(226, 232, 240, 0.78);
    cursor: pointer;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.45;
  }

  .simple-check input,
  .bank-marketing-check input,
  .compliance-check input {
    width: 18px;
    height: 18px;
    min-height: 18px;
    flex: 0 0 auto;
    padding: 0;
    accent-color: rgb(103, 232, 249);
  }

  .mini-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .mini-stats div {
    border: 1px solid rgba(148, 163, 184, 0.11);
    border-radius: 14px;
    background: rgba(2, 6, 23, 0.32);
    padding: 10px;
  }

  .mini-stats span {
    display: block;
    color: rgba(203, 213, 225, 0.58);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .mini-stats strong {
    display: block;
    margin-top: 5px;
    color: #ffffff;
    font-size: 19px;
    font-weight: 850;
    letter-spacing: -0.045em;
  }

  .payment-method-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .payment-method {
    position: relative;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    gap: 11px;
    align-items: center;
    min-height: 86px;
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.13);
    border-radius: 19px;
    background: rgba(2, 6, 23, 0.42);
    padding: 13px;
    color: #ffffff;
    cursor: pointer;
    text-align: left;
    transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
  }

  .payment-method:hover {
    transform: translateY(-1px);
    border-color: rgba(103, 232, 249, 0.28);
    background: rgba(8, 24, 46, 0.7);
  }

  .payment-method.is-active {
    border-color: rgba(103, 232, 249, 0.62);
    background: rgba(8, 29, 45, 0.78);
  }

  .payment-icon {
    width: 42px;
    height: 42px;
    border-radius: 15px;
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
    background: linear-gradient(135deg, rgb(253, 224, 71), rgb(245, 158, 11));
    color: rgb(20, 12, 3);
    box-shadow: 0 10px 24px rgba(245, 158, 11, 0.18);
  }

  .bank-checkout-panel {
    display: grid;
    gap: 14px;
    margin-top: 14px;
    border: 1px solid rgba(103, 232, 249, 0.11);
    border-radius: 20px;
    background: rgba(2, 6, 23, 0.3);
    padding: 15px;
  }

  .bank-checkout-intro {
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    padding-bottom: 13px;
  }

  .bank-checkout-intro strong {
    display: block;
    color: #ffffff;
    font-size: 16px;
    font-weight: 850;
    letter-spacing: -0.03em;
  }

  .bank-checkout-intro p,
  .bank-section-title small {
    max-width: 620px;
    margin: 6px 0 0;
    color: rgba(203, 213, 225, 0.58);
    font-size: 12px;
    line-height: 1.55;
  }

  .bank-form-section {
    display: grid;
    gap: 11px;
  }

  .bank-section-title {
    display: grid;
    gap: 4px;
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

  .bank-shipping-method {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    gap: 11px;
    align-items: center;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 17px;
    background: rgba(2, 6, 23, 0.42);
    padding: 12px;
    color: white;
    cursor: pointer;
    text-align: left;
  }

  .bank-shipping-method.is-active {
    border-color: rgba(103, 232, 249, 0.56);
    background: rgba(8, 29, 45, 0.74);
  }

  .bank-shipping-method > span {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    border-radius: 14px;
    background: rgba(103, 232, 249, 0.08);
    color: rgb(165, 243, 252);
  }

  .bank-shipping-method strong {
    display: block;
    font-size: 13px;
    font-weight: 850;
  }

  .bank-shipping-method small {
    display: block;
    margin-top: 3px;
    color: rgba(203, 213, 225, 0.58);
    font-size: 11px;
    line-height: 1.35;
  }

  .bank-shipping-method em {
    color: rgb(165, 243, 252);
    font-size: 13px;
    font-style: normal;
    font-weight: 900;
    white-space: nowrap;
  }

  .checkout-alert {
    margin: 0;
    border-radius: 16px;
    padding: 13px 15px;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.55;
  }

  .error-alert {
    border: 1px solid rgba(248, 113, 113, 0.22);
    background: rgba(248, 113, 113, 0.08);
    color: rgb(254, 202, 202);
  }

  .success-alert {
    border: 1px solid rgba(103, 232, 249, 0.2);
    background: rgba(103, 232, 249, 0.06);
    color: rgba(207, 250, 254, 0.92);
  }

  .compliance-check {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border: 1px solid rgba(103, 232, 249, 0.14);
    border-radius: 18px;
    background: rgba(103, 232, 249, 0.045);
    padding: 14px;
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
    margin-top: 2px;
  }

  .compliance-copy a {
    color: rgb(165, 243, 252);
    font-weight: 900;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .checkout-submit {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 18px;
    min-height: 62px;
    width: 100%;
    border: 1px solid rgba(165, 243, 252, 0.22);
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(103, 232, 249, 0.13), rgba(255, 255, 255, 0.025)), rgba(2, 6, 23, 0.78);
    color: white;
    cursor: pointer;
    padding: 0 14px 0 20px;
    text-align: left;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045), 0 18px 45px rgba(0, 0, 0, 0.18);
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .checkout-submit:hover {
    transform: translateY(-2px);
    border-color: rgba(103, 232, 249, 0.48);
    background: linear-gradient(135deg, rgba(103, 232, 249, 0.18), rgba(255, 255, 255, 0.035)), rgba(4, 16, 30, 0.88);
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
    color: white;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 0.17em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .checkout-submit-main span {
    color: rgba(203, 213, 225, 0.62);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
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
  }

  .security-note,
  .summary-note {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 12px;
    color: rgba(226, 232, 240, 0.7);
    font-size: 12px;
    line-height: 1.55;
  }

  .checkout-summary {
    position: sticky;
    top: 88px;
  }

  .summary-card {
    overflow: hidden;
    padding: 20px;
  }

  .summary-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 15px;
    color: rgb(165, 243, 252);
  }

  .summary-items {
    display: grid;
    gap: 13px;
    max-height: 362px;
    overflow: auto;
    padding-right: 2px;
  }

  .summary-item {
    display: grid;
    grid-template-columns: 58px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .summary-image {
    position: relative;
    display: grid;
    width: 58px;
    height: 58px;
    place-items: center;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 16px;
    background: rgba(2, 6, 23, 0.46);
  }

  .summary-image img {
    max-width: 46px;
    max-height: 46px;
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
  }

  .summary-item-copy {
    min-width: 0;
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

  .summary-item .gift-label,
  .summary-item .bundle-label {
    color: rgb(165, 243, 252);
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .summary-item .bundle-label {
    color: rgb(253, 224, 71);
  }

  .summary-item strong {
    display: grid;
    justify-items: end;
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 900;
    white-space: nowrap;
  }

  .summary-item strong small {
    color: rgba(148, 163, 184, 0.7);
    font-size: 10px;
    font-weight: 800;
    text-decoration: line-through;
  }

  .summary-lines {
    display: grid;
    gap: 11px;
    margin-top: 17px;
    border-top: 1px solid rgba(148, 163, 184, 0.14);
    padding-top: 15px;
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

  .summary-lines .saving-line strong {
    color: rgb(165, 243, 252);
  }

  .summary-lines .amber-line strong {
    color: rgb(253, 224, 71);
  }

  .summary-lines .total {
    margin-top: 4px;
    border-top: 1px solid rgba(148, 163, 184, 0.14);
    padding-top: 13px;
    color: #ffffff;
    font-size: 18px;
    font-weight: 900;
  }

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

    .checkout-hero {
      grid-template-columns: 1fr;
      align-items: start;
    }

    .account-chip {
      width: 100%;
    }
  }

  @media (max-width: 820px) {
    .checkout-page {
      padding: 56px 14px 54px;
    }

    .checkout-topbar {
      align-items: stretch;
      flex-direction: column;
    }

    .checkout-back,
    .checkout-secure {
      width: 100%;
    }

    .checkout-hero-copy h1 {
      font-size: 42px;
    }

    .checkout-panel,
    .summary-card {
      border-radius: 22px;
      padding: 15px;
    }

    .savings-row-grid,
    .payment-method-grid,
    .bank-shipping-options,
    .bank-form-grid.two,
    .bank-form-grid.three {
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
      justify-items: start;
    }
  }

  @media (max-width: 460px) {
    .checkout-hero-copy h1 {
      font-size: 38px;
    }

    .account-chip {
      grid-template-columns: 40px minmax(0, 1fr);
    }

    .account-chip a {
      grid-column: 2;
      width: fit-content;
    }

    .bank-checkout-panel {
      padding: 13px;
    }

    .bank-shipping-method {
      grid-template-columns: 38px minmax(0, 1fr);
    }

    .bank-shipping-method em {
      grid-column: 2;
    }
  }
`;
