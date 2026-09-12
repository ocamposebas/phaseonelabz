export const prerender = false;

const REQUEST_TIMEOUT_MS = 10000;
const PRODUCT_CACHE_TTL_MS = 30000;
const productCache =
  globalThis.__phaseoneProductSearchCache ||
  (globalThis.__phaseoneProductSearchCache = new Map());

function jsonResponse(
  payload,
  status = 200,
  cacheControl = "no-store, no-cache, must-revalidate, private"
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanProductText(value, maxLength = 800) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeStoreApiPrice(value, prices) {
  if (value === null || value === undefined || value === "") return "";

  const numericValue = Number(value);
  const minorUnit = Number(prices?.currency_minor_unit);

  if (!Number.isFinite(numericValue)) return String(value);

  const divisor = Number.isInteger(minorUnit) && minorUnit > 0
    ? 10 ** minorUnit
    : 1;

  return String(numericValue / divisor);
}

function getCleanWooUrl() {
  const WOO_URL = import.meta.env.WOOCOMMERCE_URL2;

  if (!WOO_URL) return null;

  return WOO_URL.replace(/\/$/, "");
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

function normalizeProduct(product) {
  const firstImage = product.images?.[0];
  const storePrices = product.prices || {};
  const categories = Array.isArray(product.categories)
    ? product.categories.map(({ id, name, slug }) => ({ id, name, slug }))
    : [];
  const tags = Array.isArray(product.tags)
    ? product.tags.map(({ id, name, slug }) => ({ id, name, slug }))
    : [];

  return {
    id: product.id,
    name: product.name || "",
    slug: product.slug || "",
    sku: product.sku || "",
    price:
      product.price ||
      normalizeStoreApiPrice(storePrices.price, storePrices) ||
      product.regular_price ||
      product.sale_price ||
      "",
    regular_price:
      product.regular_price ||
      normalizeStoreApiPrice(storePrices.regular_price, storePrices),
    sale_price:
      product.sale_price ||
      normalizeStoreApiPrice(storePrices.sale_price, storePrices),
    stock_status:
      product.stock_status || (product.is_in_stock ? "instock" : "outofstock"),
    in_stock:
      typeof product.is_in_stock === "boolean"
        ? product.is_in_stock
        : product.stock_status === "instock",
    permalink: product.permalink || `/products/${product.slug}`,
    image:
      firstImage?.src ||
      product.image ||
      "/placeholder-product.png",
    images: firstImage
      ? [{ src: firstImage.src, alt: firstImage.alt || product.name || "" }]
      : [],
    categories,
    tags,
    search_text: cleanProductText(
      [product.short_description, product.description]
        .filter(Boolean)
        .join(" ")
    ),
  };
}

async function fetchProducts(cleanUrl, params) {
  const cacheKey = `${cleanUrl}?${params.toString()}`;
  const cached = productCache.get(cacheKey);

  if (cached?.products && cached.expiresAt > Date.now()) {
    return cached.products;
  }

  if (cached?.inFlight) return cached.inFlight;

  const inFlight = (async () => {
    const response = await fetchWithTimeout(
      `${cleanUrl}/wp-json/wc/store/v1/products?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Lab Product Search",
        },
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || !Array.isArray(data)) {
      throw new Error("Unable to load products.");
    }

    const products = data.map(normalizeProduct);
    productCache.set(cacheKey, {
      products,
      expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS,
      inFlight: null,
    });

    return products;
  })();

  productCache.set(cacheKey, {
    products: cached?.products || null,
    expiresAt: cached?.expiresAt || 0,
    inFlight,
  });

  try {
    return await inFlight;
  } catch (error) {
    if (cached?.products) return cached.products;
    productCache.delete(cacheKey);
    throw error;
  }
}

export async function GET({ url }) {
  const cleanUrl = getCleanWooUrl();

  if (!cleanUrl) {
    return jsonResponse(
      {
        error: "Product service is not configured.",
        products: [],
      },
      500
    );
  }

  const search = url.searchParams.get("search") || "";
  const limit = Number(url.searchParams.get("limit") || 50);

  try {
    const params = new URLSearchParams();

    params.set("per_page", String(Math.min(Math.max(limit, 1), 100)));
    params.set("status", "publish");

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const products = await fetchProducts(cleanUrl, params);

    return jsonResponse(
      {
        success: true,
        products,
      },
      200,
      "private, max-age=30, stale-while-revalidate=30"
    );
  } catch (error) {
    const isAbortError = error?.name === "AbortError";

    return jsonResponse(
      {
        error: isAbortError
          ? "Product request timed out."
          : "Product request failed.",
        products: [],
      },
      500
    );
  }
}
