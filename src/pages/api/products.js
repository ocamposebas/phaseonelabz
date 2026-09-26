import {
  fetchWooCatalog,
  getCatalogThumbnailUrl,
  getResponsiveImageCandidate,
} from "../../lib/wooCatalog.js";

export const prerender = false;

const REQUEST_TIMEOUT_MS = 10000;
const PRODUCT_CACHE_TTL_MS = 5 * 60_000;
const PRODUCT_STALE_TTL_MS = 60 * 60_000;
const BROWSER_CACHE_CONTROL =
  "public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400";
const EDGE_CACHE_CONTROL =
  "public, s-maxage=900, stale-while-revalidate=86400, stale-if-error=604800";
const productCache =
  globalThis.__phaseoneProductSearchCache ||
  (globalThis.__phaseoneProductSearchCache = new Map());

function jsonResponse(
  payload,
  status = 200,
  cacheControl = "no-store, no-cache, must-revalidate, private"
) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  };

  if (status === 200 && cacheControl.startsWith("public")) {
    headers["CDN-Cache-Control"] = EDGE_CACHE_CONTROL;
    headers["Vercel-CDN-Cache-Control"] = EDGE_CACHE_CONTROL;
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers,
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
  const fullSizeImage = firstImage?.src || product.image || "";
  const thumbnail =
    firstImage?.thumbnail || getCatalogThumbnailUrl(fullSizeImage);
  const searchThumbnail =
    firstImage?.searchThumbnail ||
    firstImage?.search_thumbnail ||
    getResponsiveImageCandidate(firstImage?.srcset || firstImage?.srcSet, 160) ||
    thumbnail;
  const storePrices = product.prices || {};
  const categories = Array.isArray(product.categories)
    ? product.categories.map(({ id, name, slug }) => ({ id, name, slug }))
    : [];
  const tags = Array.isArray(product.tags)
    ? product.tags.map(({ id, name, slug }) => ({ id, name, slug }))
    : [];
  const attributes = Array.isArray(product.attributes)
    ? product.attributes.map((attribute) => ({
        id: attribute?.id,
        name: attribute?.name || "",
        taxonomy: attribute?.taxonomy || "",
        variation:
          attribute?.variation === true || attribute?.has_variations === true,
        options: Array.isArray(attribute?.terms)
          ? attribute.terms
              .map((term) => term?.name || term?.slug || "")
              .filter(Boolean)
          : [],
      }))
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
    type: product.type || (product.has_options ? "variable" : "simple"),
    has_options: product.has_options === true,
    attributes,
    permalink: product.permalink || `/products/${product.slug}`,
    image: thumbnail || fullSizeImage || "/tarro.webp",
    images: firstImage
      ? [{
          src: fullSizeImage,
          thumbnail,
          searchThumbnail,
          alt: firstImage.alt || product.name || "",
        }]
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

function getPrivateCatalogConfig() {
  const baseUrl = import.meta.env.WOOCOMMERCE_URL;
  const consumerKey = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!baseUrl || !consumerKey || !consumerSecret) return null;

  return { baseUrl, consumerKey, consumerSecret };
}

function productMatchesSearch(product, search) {
  const terms = String(search || "")
    .toLowerCase()
    .replace(/[^a-z0-9+\-\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return true;

  const categoryText = Array.isArray(product?.categories)
    ? product.categories
        .map((category) =>
          typeof category === "string"
            ? category
            : category?.name || category?.slug || ""
        )
        .join(" ")
    : "";
  const tagText = Array.isArray(product?.tags)
    ? product.tags
        .map((tag) =>
          typeof tag === "string" ? tag : tag?.name || tag?.slug || ""
        )
        .join(" ")
    : "";
  const searchable = [
    product?.name,
    product?.slug,
    product?.sku,
    product?.catalog_search_text,
    product?.short_description,
    categoryText,
    tagText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return terms.every((term) => searchable.includes(term));
}

async function fetchProducts(cleanUrl, params) {
  const cacheKey = `${cleanUrl}?${params.toString()}`;
  const cached = productCache.get(cacheKey);

  if (cached?.products && cached.expiresAt > Date.now()) {
    return cached.products;
  }

  if (cached?.inFlight) {
    if (cached?.products && cached.staleUntil > Date.now()) {
      return cached.products;
    }

    return cached.inFlight;
  }

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
      staleUntil:
        Date.now() + PRODUCT_CACHE_TTL_MS + PRODUCT_STALE_TTL_MS,
      inFlight: null,
    });

    return products;
  })();

  productCache.set(cacheKey, {
    products: cached?.products || null,
    expiresAt: cached?.expiresAt || 0,
    staleUntil: cached?.staleUntil || 0,
    inFlight,
  });

  if (cached?.products && cached.staleUntil > Date.now()) {
    return cached.products;
  }

  try {
    return await inFlight;
  } catch (error) {
    if (cached?.products) return cached.products;
    productCache.delete(cacheKey);
    throw error;
  }
}

export async function GET({ url }) {
  const privateCatalogConfig = getPrivateCatalogConfig();
  const cleanUrl = getCleanWooUrl();

  if (!privateCatalogConfig && !cleanUrl) {
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
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(limit, 1), 100)
      : 50;
    let products = [];

    if (privateCatalogConfig) {
      const fullCatalog = await fetchWooCatalog({
        ...privateCatalogConfig,
        perPage: safeLimit,
      });

      products = search.trim()
        ? fullCatalog.filter((product) => productMatchesSearch(product, search))
        : fullCatalog;
    } else {
      const params = new URLSearchParams();

      params.set("per_page", String(safeLimit));
      params.set("status", "publish");

      if (search.trim()) params.set("search", search.trim());

      products = await fetchProducts(cleanUrl, params);
    }

    return jsonResponse(
      {
        success: true,
        products,
      },
      200,
      BROWSER_CACHE_CONTROL
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
