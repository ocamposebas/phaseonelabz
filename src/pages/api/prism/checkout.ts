import type { APIRoute } from "astro";

export const prerender = false;

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 8;

type RateStore = Map<string, number[]>;
const globalStore = globalThis as typeof globalThis & {
  __phaseonePrismCheckoutRateStore?: RateStore;
};
const rateStore =
  globalStore.__phaseonePrismCheckoutRateStore || new Map<string, number[]>();
globalStore.__phaseonePrismCheckoutRateStore = rateStore;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
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

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const configured = String(import.meta.env.CHECKOUT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  // When configured, enforce the explicit list. Keep local development possible.
  if (configured.length > 0) return configured.includes(origin);
  return /^https:\/\/(www\.)?phaseonelabz\.com$/i.test(origin) ||
    /^https?:\/\/localhost(?::\d+)?$/i.test(origin);
}

export const POST: APIRoute = async ({ request }) => {
  if (!originAllowed(request)) {
    return json({ success: false, error: "Origin not allowed." }, 403);
  }

  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return json(
      { success: false, error: "Too many checkout attempts. Try again shortly." },
      429,
    );
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

  if (!wordpressUrl || !sharedSecret) {
    console.error("PRISM checkout bridge is not configured.");
    return json(
      { success: false, error: "Secure checkout is not configured." },
      503,
    );
  }

  const rawBody = await request.text();
  if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ success: false, error: "Invalid checkout payload." }, 400);
  }

  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
      return json({ success: false, error: "Invalid checkout payload." }, 400);
    }

    const response = await fetch(
      `${wordpressUrl}/wp-json/phaseone/v1/prism-checkout`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-PhaseOne-Checkout-Secret": sharedSecret,
          "X-PhaseOne-Client-IP": ip,
        },
        body: JSON.stringify(parsed),
      },
    );

    const responseText = await response.text();
    let data: Record<string, unknown> | null = null;

    try {
      data = responseText
        ? (JSON.parse(responseText) as Record<string, unknown>)
        : null;
    } catch {
      data = null;
    }

    if (!response.ok || !data) {
      console.error("WordPress PRISM bridge failed", {
        status: response.status,
        responseText: responseText.slice(0, 500),
      });
      return json(
        {
          success: false,
          error:
            String(data?.message || data?.error || "Unable to start checkout."),
        },
        response.status >= 400 && response.status < 600 ? response.status : 502,
      );
    }

    return json(data, response.status);
  } catch (error) {
    console.error("PRISM checkout proxy error", error);
    return json(
      { success: false, error: "Unable to start secure checkout." },
      502,
    );
  }
};