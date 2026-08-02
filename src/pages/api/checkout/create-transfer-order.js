export const prerender = false;

const REQUEST_TIMEOUT_MS = 15000;
const BUNDLE_REQUIRED_QUANTITY = 5;
const BUNDLE_DISCOUNT_RATE = 0.1;

const SHIPPING_METHODS = {
  standard: {
    id: "standard",
    title: "Standard Shipping",
    total: 8,
  },
  express: {
    id: "express",
    title: "Express Shipping",
    total: 18,
  },
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanUrl(value = "") {
  return String(value || "").replace(/\/$/, "");
}

function getCookieValue(cookieHeader = "", name = "") {
  if (!cookieHeader || !name) return "";

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  const target = cookies.find((cookie) =>
    cookie.toLowerCase().startsWith(`${name.toLowerCase()}=`)
  );

  if (!target) return "";

  return decodeURIComponent(target.split("=").slice(1).join("="));
}

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader) return "";

  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function getAuthTokenFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";

  const tokenFromAuthorization = getBearerToken(request);

  const tokenFromCookie =
    getCookieValue(cookieHeader, "lab_auth_token") ||
    getCookieValue(cookieHeader, "lab_token") ||
    getCookieValue(cookieHeader, "auth_token");

  return tokenFromAuthorization || tokenFromCookie;
}

function getEnvConfig() {
  const WOO_URL =
    import.meta.env.WOOCOMMERCE_URL ||
    import.meta.env.WOOCOMMERCE_URL2 ||
    import.meta.env.PUBLIC_WOOCOMMERCE_URL;

  const CONSUMER_KEY =
    import.meta.env.WOOCOMMERCE_CONSUMER_KEY ||
    import.meta.env.CONSUMER_KEY ||
    import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;

  const CONSUMER_SECRET =
    import.meta.env.WOOCOMMERCE_CONSUMER_SECRET ||
    import.meta.env.CONSUMER_SECRET ||
    import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

  return {
    cleanWooUrl: WOO_URL ? cleanUrl(WOO_URL) : "",
    consumerKey: CONSUMER_KEY || "",
    consumerSecret: CONSUMER_SECRET || "",
  };
}

function getBasicAuthHeader(consumerKey, consumerSecret) {
  const credentials = `${consumerKey}:${consumerSecret}`;

  if (typeof Buffer !== "undefined") {
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  return `Basic ${btoa(credentials)}`;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function sanitizeString(value = "") {
  return String(value || "").trim();
}

function sanitizeEmail(value = "") {
  return sanitizeString(value).toLowerCase();
}

function normalizePrice(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Number(number.toFixed(2)));
}

function normalizeMoneyString(value) {
  return normalizePrice(value).toFixed(2);
}

const SHIPPING_PROTECTION_RATE_DOMESTIC = 1.09;
const SHIPPING_PROTECTION_RATE_INTERNATIONAL = 1.39;

function getShippingProtectionRate(country = "US") {
  return String(country || "US").toUpperCase() === "US"
    ? SHIPPING_PROTECTION_RATE_DOMESTIC
    : SHIPPING_PROTECTION_RATE_INTERNATIONAL;
}

function calculateShippingProtectionAmount(baseTotal = 0, country = "US") {
  const cleanBaseTotal = Math.max(Number(baseTotal || 0), 0);
  const rate = getShippingProtectionRate(country);

  if (!cleanBaseTotal || !rate) return 0;

  let fee = 0;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const units = Math.max(1, Math.ceil((cleanBaseTotal + fee) / 100));
    const nextFee = normalizePrice(units * rate);

    if (Math.abs(nextFee - fee) < 0.001) {
      fee = nextFee;
      break;
    }

    fee = nextFee;
  }

  return normalizePrice(fee);
}

function shippingProtectionRequested(body = {}) {
  const shippingProtection =
    body.shippingProtection && typeof body.shippingProtection === "object"
      ? body.shippingProtection
      : body.shipping_protection && typeof body.shipping_protection === "object"
        ? body.shipping_protection
        : {};

  return Boolean(
    body.shippingProtectionSelected ||
      body.shipping_protection_selected ||
      shippingProtection.selected
  );
}

const RECON_WATER_IDENTIFIERS = new Set([
  "h-recon-water",
  "recon-water-30ml",
]);
const RECON_WATER_PROMO_THRESHOLD = 100;
const RECON_WATER_PROMO_PRICE = 15;
const RECON_WATER_PURCHASE_LIMIT = 2;

function getShippingFromRequest(shipping = {}) {
  const method = sanitizeString(shipping.method || "standard").toLowerCase();

  return SHIPPING_METHODS[method] || SHIPPING_METHODS.standard;
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];

  const normalized = items
    .map((item) => {
      const productId = Number(item.product_id || item.productId || item.id || 0);

      const variationId = Number(
        item.variation_id || item.variationId || item.selectedVariationId || 0
      );

      const quantity = Number(item.quantity || 1);

      return {
        product_id: productId,
        variation_id: variationId,
        quantity: Math.max(1, Math.floor(quantity)),
        variation:
          item.variation ||
          item.variation_attributes ||
          item.selectedAttributes ||
          item.selectedOptions ||
          {},
      };
    })
    .filter((item) => item.product_id > 0 && item.quantity > 0);

  const byProduct = new Map();

  for (const item of normalized) {
    const key = `${item.product_id}:${item.variation_id || 0}`;
    const existing = byProduct.get(key);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      byProduct.set(key, { ...item });
    }
  }

  return Array.from(byProduct.values());
}

function buildWooLineItems(items = []) {
  return items.map((item) => {
    const lineItem = {
      product_id: item.product_id,
      quantity: item.quantity,
    };

    if (item.variation_id > 0) {
      lineItem.variation_id = item.variation_id;
    }

    // WooCommerce accepts order-line totals on creation. Sending the verified
    // promotional unit price here is important because fulfilment/Prims reads
    // the line item itself, not only order-level fees.
    if (Number.isFinite(item.lineUnitPrice)) {
      const lineTotal = normalizeMoneyString(item.lineUnitPrice * item.quantity);
      lineItem.subtotal = lineTotal;
      lineItem.total = lineTotal;
    }

    return lineItem;
  });
}

function normalizeProductIdentifier(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isReconWaterProduct(product = {}) {
  return [product.slug, product.sku, product.name]
    .map(normalizeProductIdentifier)
    .some((identifier) => RECON_WATER_IDENTIFIERS.has(identifier));
}

function getPurchaseLimit(product = {}, variation = {}, isReconWater = false) {
  const limits = [];

  if (product.sold_individually || variation.sold_individually) {
    limits.push(1);
  }

  const explicitLimit = Number(
    variation.max_purchase_quantity ??
      variation.maxPurchaseQuantity ??
      product.max_purchase_quantity ??
      product.maxPurchaseQuantity ??
      0
  );

  if (Number.isFinite(explicitLimit) && explicitLimit > 0) {
    limits.push(Math.floor(explicitLimit));
  }

  if (isReconWater) {
    limits.push(RECON_WATER_PURCHASE_LIMIT);
  }

  if (!limits.length) return null;

  return Math.max(1, Math.min(...limits));
}

function getAvailabilitySource(product = {}, variation = {}, hasVariation = false) {
  return hasVariation ? variation || {} : product || {};
}

function assertPurchasableStock({ product = {}, variation = {}, item, isReconWater }) {
  const hasVariation = Number(item.variation_id || 0) > 0;
  const source = getAvailabilitySource(product, variation, hasVariation);
  const productName =
    source.name || product.name || variation.name || "A product in your cart";

  if (product.purchasable === false || source.purchasable === false) {
    throw new Error(`${productName} is no longer available.`);
  }

  const stockStatus = String(
    source.stock_status || product.stock_status || ""
  ).toLowerCase();

  if (stockStatus && stockStatus !== "instock") {
    throw new Error(`${productName} is sold out. Please remove it from your cart.`);
  }

  const purchaseLimit = getPurchaseLimit(product, variation, isReconWater);
  if (purchaseLimit && Number(item.quantity || 0) > purchaseLimit) {
    throw new Error(
      `${productName} is limited to ${purchaseLimit} per order. Please update your cart.`
    );
  }

  const stockQuantity = Number(
    source.stock_quantity ?? product.stock_quantity ?? NaN
  );
  const backordersAllowed =
    source.backorders_allowed === true ||
    product.backorders_allowed === true ||
    source.backorders === "yes" ||
    product.backorders === "yes";

  if (
    Number.isFinite(stockQuantity) &&
    stockQuantity >= 0 &&
    !backordersAllowed &&
    Number(item.quantity || 0) > stockQuantity
  ) {
    throw new Error(`${productName} does not have enough stock for that quantity.`);
  }
}

function getCustomerPayload(customer = {}) {
  const firstName = sanitizeString(customer.firstName || customer.first_name);
  const lastName = sanitizeString(customer.lastName || customer.last_name);
  const email = sanitizeEmail(customer.email);
  const phone = sanitizeString(customer.phone);

  const address1 = sanitizeString(customer.address1 || customer.address_1);
  const address2 = sanitizeString(customer.address2 || customer.address_2);
  const city = sanitizeString(customer.city);
  const state = sanitizeString(customer.state);
  const postcode = sanitizeString(customer.postcode || customer.zip);
  const country = sanitizeString(customer.country || "US") || "US";

  const billing = {
    first_name: firstName,
    last_name: lastName,
    company: "",
    address_1: address1,
    address_2: address2,
    city,
    state,
    postcode,
    country,
    email,
    phone,
  };

  const shipping = {
    first_name: firstName,
    last_name: lastName,
    company: "",
    address_1: address1,
    address_2: address2,
    city,
    state,
    postcode,
    country,
  };

  return {
    billing,
    shipping,
    email,
    firstName,
    lastName,
    phone,
    address1,
    city,
    state,
    postcode,
  };
}

function validateCustomer(customerPayload) {
  const required = [
    ["email", customerPayload.email],
    ["first name", customerPayload.firstName],
    ["last name", customerPayload.lastName],
    ["phone", customerPayload.phone],
    ["address", customerPayload.address1],
    ["city", customerPayload.city],
    ["state", customerPayload.state],
    ["ZIP", customerPayload.postcode],
  ];

  const missing = required.find(([, value]) => !String(value || "").trim());

  if (missing) {
    return `Missing required field: ${missing[0]}.`;
  }

  if (!customerPayload.email.includes("@")) {
    return "Please enter a valid email address.";
  }

  return "";
}

async function wooFetch({
  cleanWooUrl,
  consumerKey,
  consumerSecret,
  path,
  method = "GET",
  body,
}) {
  const url = `${cleanWooUrl}/wp-json/wc/v3${path}`;

  const response = await fetchWithTimeout(url, {
    method,
    headers: {
      Authorization: getBasicAuthHeader(consumerKey, consumerSecret),
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Phase One Labs Checkout",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.code ||
      `WooCommerce request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return data;
}

async function getProductPricingFromWoo(config, item) {
  // Always load the parent product: variable products do not reliably expose
  // the parent slug in their variation response.
  const product = await wooFetch({
    ...config,
    path: `/products/${item.product_id}`,
  });

  const isReconWater = isReconWaterProduct(product);

  if (item.variation_id > 0) {
    const variation = await wooFetch({
      ...config,
      path: `/products/${item.product_id}/variations/${item.variation_id}`,
    });

    assertPurchasableStock({ product, variation, item, isReconWater });

    return {
      unitPrice: normalizePrice(
        variation.price || variation.sale_price || variation.regular_price || 0
      ),
      isReconWater,
      purchaseLimit: getPurchaseLimit(product, variation, isReconWater),
      purchaseLimitKey: String(product.id || item.product_id),
      productName: variation.name || product.name || "A product in your cart",
    };
  }

  assertPurchasableStock({ product, variation: {}, item, isReconWater });

  return {
    unitPrice: normalizePrice(
      product.price || product.sale_price || product.regular_price || 0
    ),
    isReconWater,
    purchaseLimit: getPurchaseLimit(product, {}, isReconWater),
    purchaseLimitKey: String(product.id || item.product_id),
    productName: product.name || "A product in your cart",
  };
}

function validateAggregatePurchaseLimits(items = []) {
  const totals = new Map();

  for (const item of items) {
    if (!item.purchaseLimit) continue;

    const key = item.purchaseLimitKey || `${item.product_id}:${item.variation_id || 0}`;
    const current =
      totals.get(key) || {
        quantity: 0,
        limit: item.purchaseLimit,
        name: item.productName || "This product",
      };

    current.quantity += Number(item.quantity || 0);
    current.limit = Math.min(current.limit, item.purchaseLimit);
    totals.set(key, current);
  }

  for (const total of totals.values()) {
    if (total.quantity > total.limit) {
      throw new Error(
        `${total.name} is limited to ${total.limit} per order. Please update your cart.`
      );
    }
  }
}

async function calculateVerifiedSubtotal(config, items = []) {
  const pricedItems = [];

  for (const item of items) {
    const pricing = await getProductPricingFromWoo(config, item);
    pricedItems.push({ ...item, ...pricing });
  }

  validateAggregatePurchaseLimits(pricedItems);

  const qualifyingSubtotal = normalizePrice(
    pricedItems.reduce(
      (total, item) =>
        item.isReconWater
          ? total
          : total + item.unitPrice * item.quantity,
      0
    )
  );
  const reconWaterPromoActive = qualifyingSubtotal >= RECON_WATER_PROMO_THRESHOLD;

  const regularSubtotal = normalizePrice(
    pricedItems.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0
    )
  );

  const reconWaterDiscount = reconWaterPromoActive
    ? normalizePrice(
        pricedItems.reduce((total, item) => {
          if (!item.isReconWater) return total;

          return (
            total +
            Math.max(0, item.unitPrice - RECON_WATER_PROMO_PRICE) * item.quantity
          );
        }, 0)
      )
    : 0;
  const itemsWithPromotion = pricedItems.map((item) => ({
    ...item,
    lineUnitPrice:
      reconWaterPromoActive && item.isReconWater
        ? Math.min(item.unitPrice, RECON_WATER_PROMO_PRICE)
        : item.unitPrice,
  }));
  const quantity = items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
  const bundleActive = quantity >= BUNDLE_REQUIRED_QUANTITY;
  const subtotalAfterProductPromotions = normalizePrice(
    regularSubtotal - reconWaterDiscount
  );
  const bundleDiscount = bundleActive
    ? normalizePrice(
        itemsWithPromotion.reduce(
          (total, item) =>
            item.isReconWater
              ? total
              : total + item.lineUnitPrice * item.quantity,
          0
        ) * BUNDLE_DISCOUNT_RATE
      )
    : 0;

  return {
    subtotal: normalizePrice(subtotalAfterProductPromotions - bundleDiscount),
    regularSubtotal,
    qualifyingSubtotal,
    reconWaterPromoActive,
    reconWaterDiscount,
    bundleActive,
    bundleDiscount,
    items: itemsWithPromotion,
  };
}

async function getAccountFromToken(cleanWooUrl, token) {
  if (!token) {
    return {
      authenticated: false,
      user: null,
      error: "Missing token in checkout request.",
    };
  }

  const response = await fetchWithTimeout(
    `${cleanWooUrl}/wp-json/lab/v1/account-token`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Phase One Labs Checkout Account",
      },
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      authenticated: false,
      user: null,
      details: data,
    };
  }

  const user = data?.user || data?.customer || data;

  return {
    authenticated: true,
    user,
  };
}

function getStoreCreditFromUser(user = {}) {
  return normalizePrice(
    user.storeCredit ||
      user.store_credit ||
      user.credit ||
      user.cashback ||
      user.cashback_balance ||
      0
  );
}

function getUserId(user = {}) {
  return Number(user.id || user.customer_id || user.user_id || 0);
}

async function applyStoreCreditInWordPress({
  cleanWooUrl,
  token,
  orderId,
  amount,
}) {
  if (!token || amount <= 0) {
    return {
      applied: false,
      remaining: null,
    };
  }

  const response = await fetchWithTimeout(
    `${cleanWooUrl}/wp-json/lab/v1/apply-store-credit`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Phase One Labs Checkout Store Credit",
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: normalizePrice(amount),
        note: `Store credit applied to order #${orderId}`,
      }),
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.code ||
      "Could not apply store credit.";

    throw new Error(message);
  }

  return {
    applied: true,
    remaining: normalizePrice(
      data?.remaining_store_credit ??
        data?.store_credit ??
        data?.storeCredit ??
        data?.credit ??
        0
    ),
    data,
  };
}

async function markOrderStoreCreditFailed(config, orderId, reason) {
  try {
    await wooFetch({
      ...config,
      path: `/orders/${orderId}`,
      method: "PUT",
      body: {
        status: "failed",
        customer_note:
          "Store credit could not be applied. Please contact support.",
        meta_data: [
          {
            key: "_lab_store_credit_failed",
            value: "yes",
          },
          {
            key: "_lab_store_credit_failed_reason",
            value: String(reason || "Unknown error"),
          },
        ],
      },
    });
  } catch {
    // Best-effort only.
  }
}

export async function POST({ request }) {
  const config = getEnvConfig();

  if (!config.cleanWooUrl || !config.consumerKey || !config.consumerSecret) {
    return jsonResponse(
      {
        error:
          "Checkout service is not configured. Missing WooCommerce URL or API keys.",
      },
      500
    );
  }

  const body = await readJsonBody(request);

  if (!body) {
    return jsonResponse(
      {
        error: "Invalid request body.",
      },
      400
    );
  }

  const token = getAuthTokenFromRequest(request);
  const items = normalizeItems(body.items);
  const customerPayload = getCustomerPayload(body.customer || {});
  const shippingMethod = getShippingFromRequest(body.shipping || {});
  const wantsStoreCredit = Boolean(body.store_credit?.apply);

  if (items.length === 0) {
    return jsonResponse(
      {
        error: "Your cart is empty.",
      },
      400
    );
  }

  const customerError = validateCustomer(customerPayload);

  if (customerError) {
    return jsonResponse(
      {
        error: customerError,
      },
      400
    );
  }

  try {
    const account = await getAccountFromToken(config.cleanWooUrl, token);
    const user = account.user || null;
    const isLoggedIn = Boolean(account.authenticated && user);
    const customerId = isLoggedIn ? getUserId(user) : 0;

    if (!isLoggedIn || customerId <= 0) {
      return jsonResponse(
        {
          error: "You must be signed in to place an order.",
        },
        401
      );
    }

    const verifiedCart = await calculateVerifiedSubtotal(config, items);
    const verifiedSubtotal = verifiedCart.subtotal;
    const verifiedShipping = normalizePrice(shippingMethod.total);
    const shippingProtectionAmount = shippingProtectionRequested(body)
      ? calculateShippingProtectionAmount(
          verifiedSubtotal + verifiedShipping,
          customerPayload.billing.country
        )
      : 0;
    const totalBeforeCredit = normalizePrice(
      verifiedSubtotal + verifiedShipping + shippingProtectionAmount
    );

    const realStoreCredit = isLoggedIn ? getStoreCreditFromUser(user) : 0;

    const storeCreditToApply =
      wantsStoreCredit && realStoreCredit > 0
        ? Math.min(realStoreCredit, totalBeforeCredit)
        : 0;

    const finalTotal = normalizePrice(totalBeforeCredit - storeCreditToApply);
    const displayedCheckoutTotal = finalTotal;

    const metaData = [
      {
        key: "_lab_checkout_source",
        value: "astro_custom_checkout",
      },
      {
        key: "_lab_store_credit_requested",
        value: wantsStoreCredit ? "yes" : "no",
      },
      {
        key: "_lab_store_credit_applied",
        value: storeCreditToApply > 0 ? "yes" : "no",
      },
      {
        key: "_lab_store_credit_amount",
        value: normalizeMoneyString(storeCreditToApply),
      },
      {
        key: "_lab_total_before_credit",
        value: normalizeMoneyString(totalBeforeCredit),
      },
      {
        key: "_lab_total_due",
        value: normalizeMoneyString(displayedCheckoutTotal),
      },
      {
        key: "_phaseone_recon_water_promo",
        value: verifiedCart.reconWaterPromoActive ? "yes" : "no",
      },
      {
        key: "_phaseone_recon_water_discount",
        value: normalizeMoneyString(verifiedCart.reconWaterDiscount),
      },
      {
        key: "_phaseone_recon_water_promo_price",
        value: normalizeMoneyString(RECON_WATER_PROMO_PRICE),
      },
      {
        key: "_phaseone_bundle_promo",
        value: verifiedCart.bundleActive ? "yes" : "no",
      },
      {
        key: "_phaseone_bundle_discount",
        value: normalizeMoneyString(verifiedCart.bundleDiscount),
      },
      {
        key: "_phaseone_shipping_protection_selected",
        value: shippingProtectionAmount > 0 ? "yes" : "no",
      },
      {
        key: "_phaseone_shipping_protection_provider",
        value: shippingProtectionAmount > 0 ? "parcelguard" : "none",
      },
      {
        key: "_phaseone_shipping_protection_amount",
        value: normalizeMoneyString(shippingProtectionAmount),
      },
    ];

    if (customerId > 0) {
      metaData.push({
        key: "_lab_customer_id",
        value: String(customerId),
      });
    }

    const feeLines = [];

    if (verifiedCart.bundleDiscount > 0) {
      feeLines.push({
        name: "5-Product Bundle (10% Off)",
        total: `-${normalizeMoneyString(verifiedCart.bundleDiscount)}`,
        tax_status: "none",
      });
    }

    if (storeCreditToApply > 0) {
      feeLines.push({
        name: "Store Credit / Cashback",
        total: `-${normalizeMoneyString(storeCreditToApply)}`,
        tax_status: "none",
      });
    }

    if (shippingProtectionAmount > 0) {
      feeLines.push({
        name: "Shipping Protection",
        total: normalizeMoneyString(shippingProtectionAmount),
        tax_status: "none",
      });
    }

    const orderPayload = {
      status: "on-hold",
      customer_id: customerId || 0,
      billing: customerPayload.billing,
      shipping: customerPayload.shipping,
      line_items: buildWooLineItems(verifiedCart.items),
      shipping_lines: [
        {
          method_id: shippingMethod.id,
          method_title: shippingMethod.title,
          total: normalizeMoneyString(verifiedShipping),
        },
      ],
      fee_lines: feeLines,
      payment_method: body.payment_method || "zelle_transfer",
      payment_method_title: body.payment_title || "Zelle / Bank Transfer",
      set_paid: false,
      customer_note: sanitizeString(body.notes || ""),
      meta_data: metaData,
    };

    const order = await wooFetch({
      ...config,
      path: "/orders",
      method: "POST",
      body: orderPayload,
    });

    let storeCreditResult = {
      applied: false,
      remaining: realStoreCredit,
    };

    if (storeCreditToApply > 0) {
      try {
        storeCreditResult = await applyStoreCreditInWordPress({
          cleanWooUrl: config.cleanWooUrl,
          token,
          orderId: order.id,
          amount: storeCreditToApply,
        });

        await wooFetch({
          ...config,
          path: `/orders/${order.id}`,
          method: "PUT",
          body: {
            meta_data: [
              {
                key: "_lab_store_credit_deducted",
                value: "yes",
              },
              {
                key: "_lab_store_credit_remaining",
                value: normalizeMoneyString(storeCreditResult.remaining),
              },
            ],
          },
        });
      } catch (creditError) {
        await markOrderStoreCreditFailed(config, order.id, creditError.message);

        return jsonResponse(
          {
            error:
              "Order was created, but cashback could not be applied. Please try again or contact support.",
            details: creditError.message,
            order_id: order.id,
          },
          500
        );
      }
    }

    return jsonResponse(
      {
        success: true,
        order_id: order.id,
        order_number: order.number,
        status: order.status,
        currency: order.currency || "USD",

        subtotal: verifiedSubtotal,
        shipping: verifiedShipping,
        shipping_protection: shippingProtectionAmount,
        total_before_credit: totalBeforeCredit,
        store_credit_applied: storeCreditToApply,
        total: displayedCheckoutTotal,

        remaining_store_credit: storeCreditResult.remaining,

        payment_method: order.payment_method,
        payment_title: order.payment_method_title,
        checkout_mode: "transfer",
      },
      200
    );
  } catch (error) {
    const isAbortError = error?.name === "AbortError";

    return jsonResponse(
      {
        error: isAbortError
          ? "Checkout request timed out. Please try again."
          : error?.message || "Could not create your order.",
      },
      500
    );
  }
}
