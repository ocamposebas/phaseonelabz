import crypto from "node:crypto";

const MAX_TOKEN_AGE_SECONDS = 15 * 60;

function getEnv(key) {
  return (
    process.env?.[key] ||
    import.meta.env?.[key] ||
    ""
  );
}

function getWooUrl() {
  return (
    getEnv("WOOCOMMERCE_URL") ||
    getEnv("PUBLIC_WOOCOMMERCE_URL") ||
    getEnv("WOOCOMMERCE_URL2") ||
    getEnv("WORDPRESS_URL") ||
    getEnv("PUBLIC_WP_SITE_URL") ||
    ""
  );
}

function getWooConsumerKey() {
  return getEnv("WOOCOMMERCE_CONSUMER_KEY");
}

function getWooConsumerSecret() {
  return getEnv("WOOCOMMERCE_CONSUMER_SECRET");
}

function getDiscountSecret() {
  return getEnv("PHASEONE_DISCOUNT_SECRET");
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function cleanBaseUrl(value = "") {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
}

function normalizeCoupon(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 40);
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundMoney(value) {
  return Number(toNumber(value, 0).toFixed(2));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCartItems(items = []) {
  return safeArray(items)
    .map((item) => ({
      product_id: Number(item.product_id || item.parent_id || item.id || 0),
      variation_id: Number(
        item.variation_id || item.variationId || item.selectedVariationId || 0
      ),
      quantity: Math.max(1, Number(item.quantity || 1)),
      price: Number(
        item.price || item.sale_price || item.regular_price || item.total || 0
      ),
      is_reward_gift: Boolean(item.is_reward_gift || item.isRewardGift),
    }))
    .filter((item) => item.product_id && item.quantity > 0);
}

function calculateSubtotal(items = []) {
  return roundMoney(
    items.reduce((total, item) => {
      if (item.is_reward_gift) return total;

      return total + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0)
  );
}

function createSignature(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

function createSignedDiscountToken(payload, secret) {
  const signature = createSignature(payload, secret);

  return Buffer.from(
    JSON.stringify({
      payload,
      signature,
    })
  ).toString("base64url");
}

function couponIsExpired(coupon = {}) {
  if (!coupon.date_expires && !coupon.date_expires_gmt) return false;

  const rawDate = coupon.date_expires_gmt || coupon.date_expires;
  const expiresAt = new Date(rawDate);

  if (Number.isNaN(expiresAt.getTime())) return false;

  return expiresAt.getTime() < Date.now();
}

function couponUsageExceeded(coupon = {}) {
  const usageLimit = Number(coupon.usage_limit || 0);
  const usageCount = Number(coupon.usage_count || 0);

  if (!usageLimit) return false;

  return usageCount >= usageLimit;
}

function couponMinimumNotMet(coupon = {}, subtotal = 0) {
  const minimumAmount = Number(coupon.minimum_amount || 0);

  if (!minimumAmount) return false;

  return subtotal < minimumAmount;
}

function couponMaximumExceeded(coupon = {}, subtotal = 0) {
  const maximumAmount = Number(coupon.maximum_amount || 0);

  if (!maximumAmount) return false;

  return subtotal > maximumAmount;
}

function itemMatchesProductRestrictions(item, coupon = {}) {
  const productIds = safeArray(coupon.product_ids).map(Number).filter(Boolean);

  const excludedProductIds = safeArray(coupon.excluded_product_ids)
    .map(Number)
    .filter(Boolean);

  const productId = Number(item.product_id || 0);
  const variationId = Number(item.variation_id || 0);

  if (
    excludedProductIds.includes(productId) ||
    excludedProductIds.includes(variationId)
  ) {
    return false;
  }

  if (!productIds.length) return true;

  return productIds.includes(productId) || productIds.includes(variationId);
}

function calculateCouponDiscount(coupon = {}, items = [], subtotal = 0) {
  const discountType = String(coupon.discount_type || "").toLowerCase();
  const couponAmount = Number(coupon.amount || 0);

  if (!couponAmount || subtotal <= 0) {
    return {
      discountAmount: 0,
      eligibleSubtotal: 0,
    };
  }

  const paidItems = items.filter((item) => !item.is_reward_gift);

  const eligibleItems = paidItems.filter((item) =>
    itemMatchesProductRestrictions(item, coupon)
  );

  const eligibleSubtotal = roundMoney(
    eligibleItems.reduce((total, item) => {
      return total + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0)
  );

  if (eligibleSubtotal <= 0) {
    return {
      discountAmount: 0,
      eligibleSubtotal: 0,
    };
  }

  if (discountType === "percent") {
    return {
      discountAmount: roundMoney((eligibleSubtotal * couponAmount) / 100),
      eligibleSubtotal,
    };
  }

  if (discountType === "fixed_cart") {
    return {
      discountAmount: roundMoney(Math.min(couponAmount, subtotal)),
      eligibleSubtotal,
    };
  }

  if (discountType === "fixed_product") {
    const discount = eligibleItems.reduce((total, item) => {
      return total + couponAmount * Number(item.quantity || 1);
    }, 0);

    return {
      discountAmount: roundMoney(Math.min(discount, eligibleSubtotal)),
      eligibleSubtotal,
    };
  }

  return {
    discountAmount: 0,
    eligibleSubtotal,
  };
}

async function fetchWooCouponByCode(code) {
  const wooUrl = cleanBaseUrl(getWooUrl());
  const consumerKey = String(getWooConsumerKey() || "").replace(/^["']|["']$/g, "");
  const consumerSecret = String(getWooConsumerSecret() || "").replace(/^["']|["']$/g, "");

  if (!wooUrl || !consumerKey || !consumerSecret) {
    throw new Error(
      `Missing WooCommerce env vars. wooUrl=${Boolean(
        wooUrl
      )}, key=${Boolean(consumerKey)}, secret=${Boolean(consumerSecret)}`
    );
  }

  const url = new URL(`${wooUrl}/wp-json/wc/v3/coupons`);
  url.searchParams.set("code", code);
  url.searchParams.set("consumer_key", consumerKey);
  url.searchParams.set("consumer_secret", consumerSecret);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || `WooCommerce coupon lookup failed: ${response.status}`
    );
  }

  const coupons = Array.isArray(data) ? data : [];

  return coupons[0] || null;
}

export const POST = async ({ request }) => {
  try {
    const secret = String(getDiscountSecret() || "").replace(/^["']|["']$/g, "");

    if (!secret) {
      return jsonResponse(
        {
          valid: false,
          error: "Missing PHASEONE_DISCOUNT_SECRET.",
        },
        500
      );
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return jsonResponse(
        {
          valid: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const couponCode = normalizeCoupon(body.coupon || body.code || "");
    const items = normalizeCartItems(body.items || body.cartItems || []);

    const customerEmail = String(body.customerEmail || body.email || "")
      .trim()
      .toLowerCase();

    if (!couponCode) {
      return jsonResponse(
        {
          valid: false,
          error: "Enter a coupon code.",
        },
        400
      );
    }

    if (!items.length) {
      return jsonResponse(
        {
          valid: false,
          error: "Cart is empty.",
        },
        400
      );
    }

    const subtotal = calculateSubtotal(items);

    if (subtotal <= 0) {
      return jsonResponse(
        {
          valid: false,
          error:
            "Cart subtotal is 0. The API is receiving products without price.",
          debug_items: items,
        },
        400
      );
    }

    const coupon = await fetchWooCouponByCode(couponCode);

    if (!coupon) {
      return jsonResponse(
        {
          valid: false,
          error: "Coupon not found in WooCommerce.",
        },
        404
      );
    }

    if (couponIsExpired(coupon)) {
      return jsonResponse(
        {
          valid: false,
          error: "This coupon has expired.",
        },
        400
      );
    }

    if (couponUsageExceeded(coupon)) {
      return jsonResponse(
        {
          valid: false,
          error: "This coupon has reached its usage limit.",
        },
        400
      );
    }

    if (couponMinimumNotMet(coupon, subtotal)) {
      return jsonResponse(
        {
          valid: false,
          error: `This coupon requires a minimum subtotal of $${coupon.minimum_amount}.`,
        },
        400
      );
    }

    if (couponMaximumExceeded(coupon, subtotal)) {
      return jsonResponse(
        {
          valid: false,
          error: `This coupon only applies below $${coupon.maximum_amount}.`,
        },
        400
      );
    }

    const { discountAmount, eligibleSubtotal } = calculateCouponDiscount(
      coupon,
      items,
      subtotal
    );

    if (discountAmount <= 0) {
      return jsonResponse(
        {
          valid: false,
          error:
            "This coupon exists, but it does not apply to the current cart.",
          debug: {
            coupon_type: coupon.discount_type,
            coupon_amount: coupon.amount,
            product_ids: coupon.product_ids,
            excluded_product_ids: coupon.excluded_product_ids,
            subtotal,
            eligibleSubtotal,
            items,
          },
        },
        400
      );
    }

    const finalSubtotal = roundMoney(Math.max(subtotal - discountAmount, 0));

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + MAX_TOKEN_AGE_SECONDS;

    const tokenPayload = {
      type: "phaseone_discount",
      coupon_code: couponCode,
      coupon_id: coupon.id,
      discount_type: coupon.discount_type,
      coupon_amount: String(coupon.amount),
      discount_amount: discountAmount,
      subtotal,
      final_subtotal: finalSubtotal,
      eligible_subtotal: eligibleSubtotal,
      customer_email: customerEmail,
      items: items.map((item) => ({
        product_id: item.product_id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        price: item.price,
      })),
      issued_at: issuedAt,
      expires_at: expiresAt,
    };

    const discountToken = createSignedDiscountToken(tokenPayload, secret);

    return jsonResponse({
      valid: true,
      coupon: {
        id: coupon.id,
        code: couponCode,
        discount_type: coupon.discount_type,
        amount: coupon.amount,
        description: coupon.description || "",
      },
      subtotal,
      discountAmount,
      finalSubtotal,
      eligibleSubtotal,
      discountToken,
      expiresAt,
      message: `${couponCode} applied. Discount: -$${discountAmount.toFixed(
        2
      )}.`,
    });
  } catch (error) {
    return jsonResponse(
      {
        valid: false,
        error: error?.message || "Could not validate coupon.",
      },
      500
    );
  }
};