export const prerender = false;

const REQUEST_TIMEOUT_MS = 12000;

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

function sanitizeString(value = "") {
  return String(value || "").trim();
}

function sanitizeEmail(value = "") {
  return sanitizeString(value).toLowerCase();
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

function formatDate(value = "") {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getOrderMeta(order = {}, keys = []) {
  const meta = Array.isArray(order.meta_data) ? order.meta_data : [];

  for (const key of keys) {
    const found = meta.find((item) => item?.key === key);

    if (found?.value !== undefined && found?.value !== null && found?.value !== "") {
      return found.value;
    }
  }

  return "";
}

function safeJsonParse(value) {
  if (!value || typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeTrackingItem(item = {}) {
  if (!item || typeof item !== "object") return null;

  const provider =
    item.tracking_provider ||
    item.provider ||
    item.carrier ||
    item.carrier_name ||
    item.shipping_provider ||
    item.custom_tracking_provider ||
    item.custom_provider_name ||
    item.shipment_provider ||
    item.service ||
    "";

  const number =
    item.tracking_number ||
    item.number ||
    item.trackingNumber ||
    item.tracking_code ||
    item.trackingCode ||
    item.shipment_id ||
    "";

  const url =
    item.tracking_link ||
    item.tracking_url ||
    item.trackingUrl ||
    item.url ||
    item.link ||
    item.carrier_tracking_url ||
    "";

  const date =
    item.date_shipped ||
    item.shipped_date ||
    item.date ||
    item.created_at ||
    "";

  if (!number && !url) return null;

  return {
    carrier: String(provider || "").trim(),
    tracking_number: String(number || "").trim(),
    tracking_url: String(url || "").trim(),
    shipped_date: date ? formatDate(date) : "",
  };
}

function normalizeTrackingValue(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(normalizeTrackingItem).filter(Boolean);
  }

  if (typeof value === "object") {
    const direct = normalizeTrackingItem(value);

    if (direct) return [direct];

    return Object.values(value).map(normalizeTrackingItem).filter(Boolean);
  }

  if (typeof value === "string") {
    const clean = value.trim();

    if (!clean) return [];

    const parsed = safeJsonParse(clean);

    if (parsed) {
      return normalizeTrackingValue(parsed);
    }

    return [
      {
        carrier: "",
        tracking_number: clean,
        tracking_url: "",
        shipped_date: "",
      },
    ];
  }

  return [];
}

function getTrackingItems(order = {}) {
  const astTracking = getOrderMeta(order, [
    "_wc_shipment_tracking_items",
    "wc_shipment_tracking_items",
    "_shipment_tracking_items",
    "shipment_tracking_items",
  ]);

  const astItems = normalizeTrackingValue(astTracking);

  if (astItems.length > 0) {
    return astItems;
  }

  const trackingNumber = getOrderMeta(order, [
    "_tracking_number",
    "tracking_number",
    "_lab_tracking_number",
    "lab_tracking_number",
    "_aftership_tracking_number",
    "aftership_tracking_number",
    "_shipstation_tracking_number",
    "shipstation_tracking_number",
    "_ss_tracking_number",
    "ss_tracking_number",
  ]);

  const trackingUrl = getOrderMeta(order, [
    "_tracking_url",
    "tracking_url",
    "_lab_tracking_url",
    "lab_tracking_url",
    "_aftership_tracking_url",
    "aftership_tracking_url",
    "_shipstation_tracking_url",
    "shipstation_tracking_url",
    "_ss_tracking_url",
    "ss_tracking_url",
  ]);

  const carrier = getOrderMeta(order, [
    "_tracking_provider",
    "tracking_provider",
    "_tracking_carrier",
    "tracking_carrier",
    "_lab_tracking_carrier",
    "lab_tracking_carrier",
    "_aftership_tracking_provider_name",
    "aftership_tracking_provider_name",
    "_shipstation_carrier",
    "shipstation_carrier",
    "_shipstation_service",
    "shipstation_service",
    "_ss_carrier",
    "ss_carrier",
  ]);

  if (trackingNumber || trackingUrl) {
    return [
      {
        carrier: String(carrier || "").trim(),
        tracking_number: String(trackingNumber || "").trim(),
        tracking_url: String(trackingUrl || "").trim(),
        shipped_date: "",
      },
    ];
  }

  return [];
}

function getCustomerVisibleStatus(order = {}, trackingItems = []) {
  const status = String(order.status || "").toLowerCase();
  const hasTracking = trackingItems.length > 0;

  if (hasTracking && !["cancelled", "failed", "refunded"].includes(status)) {
    return {
      key: "shipped",
      label: "Shipped",
      message:
        "Your order has shipping details attached. Use the tracking link or number below for carrier updates.",
      step: 4,
    };
  }

  if (status === "pending") {
    return {
      key: "pending",
      label: "Pending payment",
      message: "Your order was received and is waiting for payment confirmation.",
      step: 1,
    };
  }

  if (status === "on-hold") {
    return {
      key: "on-hold",
      label: "Payment review",
      message:
        "Your order is on hold while payment is manually verified. Once confirmed, it will move into processing.",
      step: 2,
    };
  }

  if (status === "processing") {
    return {
      key: "processing",
      label: "Processing",
      message:
        "Payment has been confirmed and your order is being prepared for shipment.",
      step: 3,
    };
  }

  if (status === "completed") {
    return {
      key: "completed",
      label: "Completed",
      message: "Your order has been completed.",
      step: 5,
    };
  }

  if (status === "cancelled") {
    return {
      key: "cancelled",
      label: "Cancelled",
      message: "This order was cancelled.",
      step: 0,
    };
  }

  if (status === "failed") {
    return {
      key: "failed",
      label: "Failed",
      message:
        "This order failed. Please contact support if this looks incorrect.",
      step: 0,
    };
  }

  if (status === "refunded") {
    return {
      key: "refunded",
      label: "Refunded",
      message: "This order has been refunded.",
      step: 0,
    };
  }

  return {
    key: status || "unknown",
    label: status ? status.replaceAll("-", " ") : "Pending",
    message: "Your order status is currently being updated.",
    step: 1,
  };
}

function normalizeOrder(order = {}) {
  const trackingItems = getTrackingItems(order);
  const visibleStatus = getCustomerVisibleStatus(order, trackingItems);
  const primaryTracking = trackingItems[0] || null;

  return {
    id: order.id,
    number: order.number || order.id,
    status: order.status,
    status_label: visibleStatus.label,
    status_key: visibleStatus.key,
    status_message: visibleStatus.message,
    status_step: visibleStatus.step,

    currency: order.currency || "USD",
    total: order.total,
    subtotal: order.subtotal || "",
    shipping_total: order.shipping_total || "",
    discount_total: order.discount_total || "",

    payment_method: order.payment_method,
    payment_title: order.payment_method_title,
    date: formatDate(order.date_created),
    date_created: order.date_created,
    date_modified: order.date_modified,

    tracking_number: primaryTracking?.tracking_number || "",
    tracking_url: primaryTracking?.tracking_url || "",
    tracking_carrier: primaryTracking?.carrier || "",
    shipped_date: primaryTracking?.shipped_date || "",
    tracking_items: trackingItems,

    items: Array.isArray(order.line_items)
      ? order.line_items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          variation_id: item.variation_id,
          name: item.name,
          quantity: item.quantity,
          total: item.total,
          image: item.image?.src || "",
        }))
      : [],
  };
}

async function wooFetch(config, path) {
  const url = `${config.cleanWooUrl}/wp-json/wc/v3${path}`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Authorization: getBasicAuthHeader(
        config.consumerKey,
        config.consumerSecret
      ),
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Phase One Labs Order Tracking",
    },
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
      "Could not load order tracking.";

    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function findOrder(config, orderNumber) {
  const cleanOrderNumber = String(orderNumber || "").trim();

  if (/^\d+$/.test(cleanOrderNumber)) {
    try {
      const directOrder = await wooFetch(config, `/orders/${cleanOrderNumber}`);

      if (directOrder?.id) {
        return directOrder;
      }
    } catch {
      // Some stores use order number different from ID.
      // If direct lookup fails, fallback to search below.
    }
  }

  const orders = await wooFetch(
    config,
    `/orders?search=${encodeURIComponent(cleanOrderNumber)}&per_page=20`
  );

  if (!Array.isArray(orders)) return null;

  return (
    orders.find((order) => {
      const orderId = String(order.id || "");
      const orderNum = String(order.number || "");

      return orderId === cleanOrderNumber || orderNum === cleanOrderNumber;
    }) || null
  );
}

export async function POST({ request }) {
  const config = getEnvConfig();

  if (!config.cleanWooUrl || !config.consumerKey || !config.consumerSecret) {
    return jsonResponse(
      {
        error:
          "Order tracking service is not configured. Missing WooCommerce URL or API keys.",
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

  const orderNumber = sanitizeString(body.orderNumber || body.order_number);
  const email = sanitizeEmail(body.email);

  if (!orderNumber || !email) {
    return jsonResponse(
      {
        error: "Order number and email are required.",
      },
      400
    );
  }

  if (!email.includes("@")) {
    return jsonResponse(
      {
        error: "Please enter a valid email address.",
      },
      400
    );
  }

  try {
    const order = await findOrder(config, orderNumber);

    if (!order) {
      return jsonResponse(
        {
          error:
            "We could not find an order matching that number and email address.",
        },
        404
      );
    }

    const billingEmail = sanitizeEmail(order.billing?.email || "");

    if (billingEmail !== email) {
      return jsonResponse(
        {
          error:
            "We could not find an order matching that number and email address.",
        },
        404
      );
    }

    return jsonResponse(
      {
        success: true,
        order: normalizeOrder(order),
      },
      200
    );
  } catch (error) {
    const isAbortError = error?.name === "AbortError";

    return jsonResponse(
      {
        error: isAbortError
          ? "Order lookup timed out. Please try again."
          : error?.message || "Could not load order tracking.",
      },
      error?.status || 500
    );
  }
}