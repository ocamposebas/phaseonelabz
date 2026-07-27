import { timingSafeEqual } from "node:crypto";
import type { APIRoute } from "astro";
import { cleanText, getClientIp, wooRequest } from "../../../lib/contractServer.js";

export const prerender = false;

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 40;

type RateStore = Map<string, number[]>;
const globalStore = globalThis as typeof globalThis & {
  __phaseonePrismOrderStatusRateStore?: RateStore;
};
const rateStore =
  globalStore.__phaseonePrismOrderStatusRateStore ||
  new Map<string, number[]>();
globalStore.__phaseonePrismOrderStatusRateStore = rateStore;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (rateStore.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateStore.set(ip, recent);
  return false;
}

function keysMatch(supplied: string, actual: string) {
  const suppliedBuffer = Buffer.from(supplied);
  const actualBuffer = Buffer.from(actual);

  return (
    suppliedBuffer.length === actualBuffer.length &&
    timingSafeEqual(suppliedBuffer, actualBuffer)
  );
}

function safeAddress(address: Record<string, unknown> = {}) {
  return {
    first_name: cleanText(address?.first_name, 100),
    last_name: cleanText(address?.last_name, 100),
    address_1: cleanText(address?.address_1, 200),
    address_2: cleanText(address?.address_2, 200),
    city: cleanText(address?.city, 120),
    state: cleanText(address?.state, 80),
    postcode: cleanText(address?.postcode, 40),
    country: cleanText(address?.country, 10),
    email: cleanText(address?.email, 254),
    phone: cleanText(address?.phone, 50),
  };
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return json(
      { success: false, error: "Too many status checks. Try again shortly." },
      429,
    );
  }

  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return json({ success: false, error: "Invalid order status request." }, 400);
  }

  try {
    const body = JSON.parse(rawBody);
    const orderId = Number(body?.orderId || body?.order_id || 0);
    const orderKey = cleanText(body?.orderKey || body?.order_key || "", 160);

    if (!Number.isInteger(orderId) || orderId <= 0 || !orderKey) {
      return json(
        { success: false, error: "Order ID and order key are required." },
        400,
      );
    }

    const order = await wooRequest(`/orders/${orderId}`);
    const actualOrderKey = cleanText(order?.order_key || "", 160);

    if (!actualOrderKey || !keysMatch(orderKey, actualOrderKey)) {
      return json({ success: false, error: "Order verification failed." }, 403);
    }

    const status = cleanText(order?.status, 40).toLowerCase();
    const isPaid = ["processing", "completed"].includes(status);

    return json({
      success: true,
      order: {
        id: Number(order?.id || orderId),
        number: cleanText(order?.number || String(orderId), 80),
        status,
        isPaid,
        currency: cleanText(order?.currency || "USD", 10),
        total: Number(order?.total || 0),
        subtotal: Number(order?.subtotal || 0),
        shippingTotal: Number(order?.shipping_total || 0),
        paymentMethod: cleanText(order?.payment_method, 80),
        paymentMethodTitle: cleanText(order?.payment_method_title, 120),
        billing: safeAddress(order?.billing || {}),
        shipping: safeAddress(order?.shipping || {}),
        items: Array.isArray(order?.line_items)
          ? order.line_items.map((item: Record<string, unknown>) => ({
              id: Number(item?.id || 0),
              product_id: Number(item?.product_id || 0),
              variation_id: Number(item?.variation_id || 0),
              name: cleanText(item?.name, 180),
              quantity: Number(item?.quantity || 1),
              total: Number(item?.total || 0),
              image:
                item?.image && typeof item.image === "object"
                  ? {
                      src: cleanText(
                        (item.image as Record<string, unknown>)?.src,
                        500,
                      ),
                    }
                  : null,
            }))
          : [],
      },
    });
  } catch (error) {
    console.error("PRISM order status check failed", error);
    return json(
      {
        success: false,
        error: "We could not verify the order status yet.",
      },
      502,
    );
  }
};
