const CACHE_TTL_MS = 10_000;

const state = globalThis.__phaseoneSiteControlState || {
  value: null,
  expiresAt: 0,
  inFlight: null,
};

globalThis.__phaseoneSiteControlState = state;

function firstValue(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

function wordpressBaseUrl() {
  const raw = String(
    firstValue(
      process.env.WORDPRESS_URL,
      process.env.WP_SITE_URL,
      process.env.WORDPRESS_API_URL,
      process.env.WOOCOMMERCE_URL2,
      process.env.WOOCOMMERCE_URL,
      process.env.PUBLIC_WP_SITE_URL,
      import.meta.env.WORDPRESS_URL,
      import.meta.env.WP_SITE_URL,
      import.meta.env.WORDPRESS_API_URL,
      import.meta.env.WOOCOMMERCE_URL2,
      import.meta.env.WOOCOMMERCE_URL,
      import.meta.env.PUBLIC_WP_SITE_URL,
    ),
  ).trim();

  if (!raw) return "";

  try {
    const url = new URL(raw);
    const restIndex = url.pathname.indexOf("/wp-json");
    if (restIndex >= 0) url.pathname = url.pathname.slice(0, restIndex) || "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

export function getSiteControlEndpoint() {
  const explicit = String(
    firstValue(
      process.env.PHASEONE_SITE_CONTROL_URL,
      import.meta.env.PHASEONE_SITE_CONTROL_URL,
    ),
  ).trim();

  if (explicit) return explicit;
  const base = wordpressBaseUrl();
  return base ? `${base}/wp-json/phaseone/v1/site-control` : "";
}

export function getSiteControlToken() {
  return String(
    firstValue(
      process.env.PHASEONE_SITE_CONTROL_TOKEN,
      import.meta.env.PHASEONE_SITE_CONTROL_TOKEN,
    ),
  ).trim();
}

export function emptySiteControlConfig() {
  return {
    configured: false,
    promo: {
      enabled: false,
      type: "general",
      eyebrow: "Limited time special",
      title: "20% off sitewide",
      info: "Research essentials, available for a limited time.",
      endsAt: null,
      hours: 24,
      durationMinutes: 1440,
      ctaLabel: "Shop promotion",
      ctaUrl: "/shop",
      product: null,
      simpleGifts: null,
    },
    maintenance: {
      enabled: false,
      title: "Precision work in progress.",
      message:
        "We are completing a carefully planned maintenance window and will be back shortly.",
      supportEmail: "support@phaseonelabz.com",
      updatedAt: null,
    },
  };
}

function cleanText(value, fallback, maximum = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, maximum);
}

function normalizeConfig(payload) {
  const fallback = emptySiteControlConfig();
  const promo = payload?.promo && typeof payload.promo === "object" ? payload.promo : {};
  const maintenance =
    payload?.maintenance && typeof payload.maintenance === "object"
      ? payload.maintenance
      : {};
  const product =
    promo.product && typeof promo.product === "object" ? promo.product : null;
  const saleScope = ["product", "all", "single"].includes(product?.sale_scope)
    ? product.sale_scope
    : null;
  const isRemovedGiftPromotion = promo.type === "simple_gifts";

  return {
    configured: true,
    promo: {
      // Product gifts (including H-Recon and Bac Water) are discontinued.
      // Quantity-based bundle discounts are calculated independently.
      enabled: promo.enabled === true && !isRemovedGiftPromotion,
      type: promo.type === "product" && product ? "product" : "general",
      eyebrow: cleanText(promo.eyebrow, fallback.promo.eyebrow, 80),
      title: cleanText(promo.title, fallback.promo.title, 120),
      info: cleanText(promo.info, fallback.promo.info, 220),
      endsAt: promo.ends_at || promo.endsAt || null,
      hours: Math.max(1, Math.min(720, Number(promo.hours) || 24)),
      durationMinutes: Math.max(
        1,
        Math.min(
          43_200,
          Number(promo.duration_minutes || promo.durationMinutes) ||
            fallback.promo.durationMinutes,
        ),
      ),
      ctaLabel: cleanText(promo.cta_label || promo.ctaLabel, fallback.promo.ctaLabel, 60),
      ctaUrl: cleanText(promo.cta_url || promo.ctaUrl, fallback.promo.ctaUrl, 500),
      product: product
        ? {
            id: Number(product.id) || null,
            name: cleanText(product.name, "Featured product", 140),
            slug: cleanText(product.slug, "", 180),
            url: cleanText(product.url, "", 500),
            originalPrice: cleanText(
              product.original_price || product.originalPrice,
              "",
              60,
            ),
            promoPrice: cleanText(product.promo_price || product.promoPrice, "", 60),
            currency: cleanText(product.currency, "USD", 12).toUpperCase(),
            saleScope,
            variationId: Number(product.variation_id || product.variationId) || null,
            variationLabel: cleanText(
              product.variation_label || product.variationLabel,
              "",
              160,
            ),
            salePriceActive:
              product.sale_price_active === true || product.salePriceActive === true,
          }
        : null,
      simpleGifts: null,
    },
    maintenance: {
      enabled: maintenance.enabled === true,
      title: cleanText(maintenance.title, fallback.maintenance.title, 120),
      message: cleanText(maintenance.message, fallback.maintenance.message, 320),
      supportEmail: cleanText(
        maintenance.support_email || maintenance.supportEmail,
        fallback.maintenance.supportEmail,
        180,
      ),
      updatedAt: maintenance.updated_at || maintenance.updatedAt || null,
    },
  };
}

export async function getSiteControlConfig({ force = false } = {}) {
  const endpoint = getSiteControlEndpoint();
  if (!endpoint) return emptySiteControlConfig();

  const now = Date.now();
  if (!force && state.value && now < state.expiresAt) return state.value;
  if (state.inFlight) return state.inFlight;

  state.inFlight = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json", "User-Agent": "Phase One Storefront/1.0" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Site control returned ${response.status}`);
      const value = normalizeConfig(await response.json());
      state.value = value;
      state.expiresAt = Date.now() + CACHE_TTL_MS;
      return value;
    } catch {
      return state.value || emptySiteControlConfig();
    } finally {
      clearTimeout(timeout);
      state.inFlight = null;
    }
  })();

  return state.inFlight;
}

export async function setMaintenanceMode(enabled) {
  const endpoint = getSiteControlEndpoint();
  const token = getSiteControlToken();
  if (!endpoint || !token) throw new Error("Maintenance control is not configured.");

  const response = await fetch(`${endpoint}/maintenance`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "Phase One Status Control/1.0",
    },
    body: JSON.stringify({ enabled: Boolean(enabled) }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Maintenance mode could not be changed.");
  }

  state.value = normalizeConfig(payload);
  state.expiresAt = Date.now() + CACHE_TTL_MS;
  return state.value;
}
