import {
  fetchWooCatalog,
  fetchWooProductVariations,
  getCatalogThumbnailUrl,
} from "./wooCatalog.js";
import { selectSuggestedProducts } from "./productRecommendations.js";

const PRODUCT_CACHE_TTL_MS = 15 * 60_000;
const PRODUCT_STALE_TTL_MS = 24 * 60 * 60_000;
const NOT_FOUND_CACHE_TTL_MS = 2 * 60_000;
const WOO_REQUEST_TIMEOUT_MS = 10_000;

const productPageState = globalThis.__phaseoneProductPageState || {
  entries: new Map(),
  inFlight: new Map(),
};

globalThis.__phaseoneProductPageState = productPageState;

function firstValue(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

export function getWooProductConfig() {
  const baseUrl = String(
    firstValue(
      process.env.WOOCOMMERCE_URL,
      import.meta.env.WOOCOMMERCE_URL,
    ),
  ).replace(/\/$/, "");
  const consumerKey = String(
    firstValue(
      process.env.WOOCOMMERCE_CONSUMER_KEY,
      import.meta.env.WOOCOMMERCE_CONSUMER_KEY,
    ),
  ).trim();
  const consumerSecret = String(
    firstValue(
      process.env.WOOCOMMERCE_CONSUMER_SECRET,
      import.meta.env.WOOCOMMERCE_CONSUMER_SECRET,
    ),
  ).trim();

  return baseUrl && consumerKey && consumerSecret
    ? { baseUrl, consumerKey, consumerSecret }
    : null;
}

function createWooUrl(config, path, params = {}) {
  const url = new URL(`${config.baseUrl}/wp-json/wc/v3/${path}`);

  url.searchParams.set("consumer_key", config.consumerKey);
  url.searchParams.set("consumer_secret", config.consumerSecret);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function fetchWooJson(url, userAgent) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WOO_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.message || `WooCommerce request failed (${response.status}).`,
      );
    }

    return Array.isArray(payload) ? payload : [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchProductBySlug(config, slug) {
  const url = createWooUrl(config, "products", {
    slug,
    status: "publish",
    per_page: 1,
  });

  const products = await fetchWooJson(url, "Phase One Product Detail/2.0");
  const product = products[0] || null;
  if (!product) return null;

  return {
    ...product,
    images: Array.isArray(product.images)
      ? product.images.map((image) => ({
          ...image,
          thumbnail:
            image?.thumbnail || getCatalogThumbnailUrl(image?.src || image?.url),
        }))
      : [],
  };
}

async function hydrateProductVariations(config, product) {
  if (!product?.id) return product;

  const productType = String(product.type || "").toLowerCase();
  const variations = Array.isArray(product.variations) ? product.variations : [];
  const hasVariationObjects = variations.some(
    (variation) => variation && typeof variation === "object",
  );

  if ((productType !== "variable" && variations.length === 0) || hasVariationObjects) {
    return product;
  }

  try {
    const hydratedVariations = await fetchWooProductVariations({
      ...config,
      productId: product.id,
      expectedCount: variations.length,
    });

    return {
      ...product,
      variations: hydratedVariations.map((variation) => ({
        ...variation,
        image:
          variation?.image && typeof variation.image === "object"
            ? {
                ...variation.image,
                thumbnail:
                  variation.image.thumbnail ||
                  getCatalogThumbnailUrl(
                    variation.image.src || variation.image.url,
                  ),
              }
            : variation?.image,
      })),
    };
  } catch (error) {
    console.error("Could not load product variations:", error);
    return {
      ...product,
      variations: [],
      variation_load_error:
        error?.message || "Could not load product variations.",
    };
  }
}

async function loadFreshProductPageData(config, slug) {
  const catalogPromise = fetchWooCatalog({
    baseUrl: config.baseUrl,
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
  }).catch((error) => {
    console.error("Could not load recommended products:", error);
    return [];
  });
  const product = await fetchProductBySlug(config, slug);

  if (!product) {
    return { product: null, recommendedProducts: [] };
  }

  const [hydratedProduct, catalogProducts] = await Promise.all([
    hydrateProductVariations(config, product),
    catalogPromise,
  ]);

  return {
    product: hydratedProduct,
    recommendedProducts: selectSuggestedProducts(
      catalogProducts,
      hydratedProduct.id,
    ),
  };
}

export async function getProductPageData(slug, { force = false } = {}) {
  const config = getWooProductConfig();

  if (!config) throw new Error("Missing WooCommerce environment variables.");

  const cacheKey = String(slug || "").trim().toLowerCase();
  if (!cacheKey) return { product: null, recommendedProducts: [] };

  const now = Date.now();
  const cached = productPageState.entries.get(cacheKey);

  if (!force && cached && now < cached.expiresAt) return cached.value;

  if (productPageState.inFlight.has(cacheKey)) {
    if (!force && cached && now < cached.staleUntil) return cached.value;
    return productPageState.inFlight.get(cacheKey);
  }

  const inFlight = loadFreshProductPageData(config, cacheKey)
    .then((value) => {
      const refreshedAt = Date.now();
      const freshTtl = value.product
        ? PRODUCT_CACHE_TTL_MS
        : NOT_FOUND_CACHE_TTL_MS;

      productPageState.entries.set(cacheKey, {
        value,
        expiresAt: refreshedAt + freshTtl,
        staleUntil: refreshedAt + freshTtl + PRODUCT_STALE_TTL_MS,
      });

      return value;
    })
    .catch((error) => {
      if (cached && now < cached.staleUntil) {
        console.warn(`Product refresh failed for ${cacheKey}; serving stale data.`);
        return cached.value;
      }
      throw error;
    })
    .finally(() => {
      productPageState.inFlight.delete(cacheKey);
    });

  productPageState.inFlight.set(cacheKey, inFlight);

  // Stale-while-revalidate keeps a temporary WooCommerce outage or a slow
  // refresh away from the page-rendering path.
  if (!force && cached && now < cached.staleUntil) return cached.value;

  return inFlight;
}
