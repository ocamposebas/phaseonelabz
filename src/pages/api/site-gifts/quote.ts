import type { APIRoute } from "astro";

export const prerender = false;

const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 60;

type RateStore = Map<string, number[]>;
const globalStore = globalThis as typeof globalThis & {
  __phaseoneGiftQuoteRateStore?: RateStore;
};
const rateStore =
  globalStore.__phaseoneGiftQuoteRateStore || new Map<string, number[]>();
globalStore.__phaseoneGiftQuoteRateStore = rateStore;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (rateStore.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    rateStore.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateStore.set(ip, recent);
  return false;
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const configured = String(import.meta.env.CHECKOUT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (configured.length > 0) return configured.includes(origin);
  return (
    /^https:\/\/(www\.)?phaseonelabz\.com$/i.test(origin) ||
    /^https?:\/\/localhost(?::\d+)?$/i.test(origin)
  );
}

function positiveInteger(value: unknown, maximum = Number.MAX_SAFE_INTEGER): number {
  const number = Math.trunc(Number(value || 0));
  return Number.isSafeInteger(number) && number > 0
    ? Math.min(number, maximum)
    : 0;
}

export const POST: APIRoute = async ({ request }) => {
  if (!originAllowed(request)) {
    return json({ success: false, error: "Origin not allowed." }, 403);
  }

  if (rateLimited(clientIp(request))) {
    return json({ success: false, error: "Too many quote requests." }, 429);
  }

  const wordpressUrl = cleanBaseUrl(
    String(
      import.meta.env.WORDPRESS_API_URL ||
        import.meta.env.WOOCOMMERCE_URL ||
        import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
        "",
    ),
  );
  const sharedSecret = String(
    import.meta.env.PRISM_CHECKOUT_SHARED_SECRET || "",
  ).trim();
  const consumerKey = String(
    import.meta.env.WOOCOMMERCE_CONSUMER_KEY || "",
  ).trim();
  const consumerSecret = String(
    import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || "",
  ).trim();

  if (
    !wordpressUrl ||
    (!sharedSecret && (!consumerKey || !consumerSecret))
  ) {
    return json(
      { success: false, error: "Gift eligibility is not configured." },
      503,
    );
  }

  const rawBody = await request.text();
  if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ success: false, error: "Invalid quote request." }, 400);
  }

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    if (!Array.isArray(payload.items) || payload.items.length > 50) {
      return json({ success: false, error: "Invalid quote request." }, 400);
    }

    const items = payload.items
      .map((raw) => {
        const item = raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : {};
        return {
          product_id: positiveInteger(item.product_id ?? item.productId),
          variation_id: positiveInteger(
            item.variation_id ?? item.variationId,
          ),
          quantity: positiveInteger(item.quantity, 99),
        };
      })
      .filter((item) => item.product_id > 0 && item.quantity > 0);

    const couponCodes = Array.isArray(payload.coupon_codes)
      ? payload.coupon_codes
      : Array.isArray(payload.couponCodes)
        ? payload.couponCodes
        : [];
    const coupons = couponCodes
      .map((code) => String(code || "").trim().slice(0, 64))
      .filter(Boolean)
      .slice(0, 3);

    const quotePayload = JSON.stringify({ items, coupon_codes: coupons });
    const useSharedSecret = Boolean(sharedSecret);
    const targetUrl = useSharedSecret
      ? `${wordpressUrl}/wp-json/phaseone/v1/site-gifts/evaluate`
      : `${wordpressUrl}/wp-json/wc-phaseone/v1/site-gifts/evaluate?payload=${encodeURIComponent(quotePayload)}`;
    let response = await fetch(targetUrl, {
      method: useSharedSecret ? "POST" : "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(useSharedSecret
          ? {
              "Content-Type": "application/json",
              "X-PhaseOne-Checkout-Secret": sharedSecret,
            }
          : {
              Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
            }),
      },
      ...(useSharedSecret ? { body: quotePayload } : {}),
    });

    // Some WordPress/Nginx combinations strip the Authorization header. Match
    // the catalog integration's established WooCommerce fallback only when
    // Basic authentication was explicitly rejected.
    if (!useSharedSecret && response.status === 401) {
      const fallbackUrl = new URL(targetUrl);
      fallbackUrl.searchParams.set("consumer_key", consumerKey);
      fallbackUrl.searchParams.set("consumer_secret", consumerSecret);
      response = await fetch(fallbackUrl, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
    }

    const responseText = await response.text();
    const data = responseText
      ? (JSON.parse(responseText) as Record<string, unknown>)
      : null;

    if (!response.ok || !data) {
      return json(
        {
          success: false,
          error: String(
            data?.message || data?.error || "Gift eligibility is unavailable.",
          ),
        },
        response.status >= 400 && response.status < 600 ? response.status : 502,
      );
    }

    return json({ success: true, ...data }, 200);
  } catch (error) {
    console.error("Site Gifts quote proxy error", error);
    return json(
      { success: false, error: "Gift eligibility is unavailable." },
      502,
    );
  }
};
