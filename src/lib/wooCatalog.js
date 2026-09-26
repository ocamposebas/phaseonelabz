const DEFAULT_PRODUCTS_PER_PAGE = 100;
const MAX_PRODUCTS_PER_REQUEST = 50;
const DEFAULT_CATALOG_CACHE_TTL_MS = 5 * 60_000;
const DEFAULT_CATALOG_STALE_TTL_MS = 60 * 60_000;
const MAX_CATALOG_CACHE_TTL_MS = 30 * 60_000;
const MAX_CATALOG_STALE_TTL_MS = 24 * 60 * 60_000;
const WOO_REQUEST_TIMEOUT_MS = 10_000;

const catalogState = globalThis.__phaseoneWooCatalogState || {
  entries: new Map(),
  inFlight: new Map(),
  variationInFlight: new Map(),
};

catalogState.variationInFlight ||= new Map();

globalThis.__phaseoneWooCatalogState = catalogState;

const CATALOG_PRODUCT_FIELDS = [
  "id",
  "name",
  "slug",
  "sku",
  "type",
  "status",
  "permalink",
  "price",
  "regular_price",
  "sale_price",
  "price_html",
  "on_sale",
  "purchasable",
  "stock_status",
  "stock_quantity",
  "manage_stock",
  "date_created",
  "short_description",
  "description",
  "categories",
  "tags",
  "attributes",
  "default_attributes",
  "variations",
  "images",
  "meta_data",
  "low_stock_remaining",
].join(",");

const CATALOG_DISCOUNT_META_KEYS = new Set([
  "_discount_percent",
  "discount_percent",
  "_discount_percentage",
  "discount_percentage",
  "_sale_percent",
  "sale_percent",
  "_sale_percentage",
  "sale_percentage",
  "_active_discount_percent",
  "active_discount_percent",
  "_active_discount_percentage",
  "active_discount_percentage",
  "_percent_off",
  "percent_off",
]);

function toPositivePrice(value) {
  if (value === null || value === undefined || value === "") return 0;

  const price = Number(String(value).replace(/,/g, "").trim());

  return Number.isFinite(price) && price > 0 ? price : 0;
}

function getFirstPositivePrice(source = {}, keys = []) {
  for (const key of keys) {
    const price = toPositivePrice(source?.[key]);

    if (price > 0) return price;
  }

  return 0;
}

function compactText(value, maximum = 4000) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function compactTerm(term) {
  if (typeof term === "string") return term;
  if (!term || typeof term !== "object") return null;

  return {
    id: term.id,
    name: term.name,
    slug: term.slug,
  };
}

export function getCatalogThumbnailUrl(source, size = 300) {
  const src = String(source || "").trim();

  if (!src || !/\/wp-content\/uploads\//i.test(src)) return src;

  try {
    const url = new URL(src);
    const match = url.pathname.match(/^(.*?)(?:-\d+x\d+)?(\.[a-z0-9]+)$/i);

    if (!match) return src;

    url.pathname = `${match[1]}-${size}x${size}${match[2]}`;
    return url.toString();
  } catch {
    return src.replace(
      /(?:-\d+x\d+)?(\.[a-z0-9]+)(\?.*)?$/i,
      `-${size}x${size}$1$2`
    );
  }
}

function compactImage(image) {
  if (typeof image === "string") {
    return {
      src: image,
      thumbnail: getCatalogThumbnailUrl(image),
    };
  }
  if (!image || typeof image !== "object") return null;

  const src = image.src || image.url || "";
  const thumbnail =
    image.thumbnail ||
    image.sizes?.thumbnail ||
    image.sizes?.woocommerce_thumbnail ||
    getCatalogThumbnailUrl(src);

  return {
    id: image.id,
    src,
    thumbnail,
    alt: compactText(image.alt, 180),
  };
}

function compactAttribute(attribute) {
  if (!attribute || typeof attribute !== "object") return null;

  return {
    id: attribute.id,
    name: attribute.name,
    slug: attribute.slug,
    label: attribute.label,
    value: attribute.value,
    option: attribute.option,
    variation: attribute.variation,
    options: Array.isArray(attribute.options)
      ? attribute.options.map((option) =>
          typeof option === "string"
            ? option
            : {
                id: option?.id,
                name: option?.name,
                label: option?.label,
                value: option?.value,
                variation_id: option?.variation_id,
              }
        )
      : [],
  };
}

function compactVariation(variation) {
  if (Number.isInteger(Number(variation))) return Number(variation);
  if (!variation || typeof variation !== "object") return null;

  const image = compactImage(variation.image || variation.images?.[0]);

  return {
    id: variation.id,
    variation_id: variation.variation_id,
    sku: variation.sku,
    name: variation.name,
    price: variation.price,
    regular_price: variation.regular_price,
    sale_price: variation.sale_price,
    on_sale: variation.on_sale,
    stock_status: variation.stock_status,
    stock_quantity: variation.stock_quantity,
    manage_stock: variation.manage_stock,
    purchasable: variation.purchasable,
    in_stock: variation.in_stock,
    attributes: Array.isArray(variation.attributes)
      ? variation.attributes.map(compactAttribute).filter(Boolean)
      : [],
    image,
  };
}

function getCatalogCacheTtlMs(value) {
  const configured = Number(
    value ?? process.env.WOOCOMMERCE_CATALOG_CACHE_TTL_MS
  );

  if (!Number.isFinite(configured)) return DEFAULT_CATALOG_CACHE_TTL_MS;

  return Math.min(Math.max(Math.round(configured), 0), MAX_CATALOG_CACHE_TTL_MS);
}

function getCatalogStaleTtlMs(value) {
  const configured = Number(
    value ?? process.env.WOOCOMMERCE_CATALOG_STALE_TTL_MS
  );

  if (!Number.isFinite(configured)) return DEFAULT_CATALOG_STALE_TTL_MS;

  return Math.min(Math.max(Math.round(configured), 0), MAX_CATALOG_STALE_TTL_MS);
}

function getCatalogCacheKey(baseUrl, perPage) {
  return `${String(baseUrl || "").replace(/\/$/, "")}::${perPage}`;
}

export function compactWooCatalogProduct(product = {}, baseUrl = "") {
  const firstImage = compactImage(product.images?.[0] || product.image);
  const shortDescription = compactText(
    product.short_description || product.description,
    600
  );
  const catalogSearchText = compactText(
    [product.short_description, product.description].filter(Boolean).join(" "),
    800
  );
  const discountMeta = Array.isArray(product.meta_data)
    ? product.meta_data.filter((entry) =>
        CATALOG_DISCOUNT_META_KEYS.has(String(entry?.key || "").toLowerCase())
      )
    : [];
  const cleanBaseUrl = String(baseUrl || "").replace(/\/$/, "");

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    type: product.type,
    status: product.status,
    permalink: product.permalink,
    price: product.price,
    regular_price: product.regular_price,
    sale_price: product.sale_price,
    price_html: product.price_html,
    on_sale: product.on_sale,
    purchasable: product.purchasable,
    stock_status: product.stock_status,
    stock_quantity: product.stock_quantity,
    manage_stock: product.manage_stock,
    in_stock: product.in_stock,
    date_created: product.date_created,
    short_description: shortDescription,
    catalog_search_text: catalogSearchText,
    categories: Array.isArray(product.categories)
      ? product.categories.map(compactTerm).filter(Boolean)
      : [],
    tags: Array.isArray(product.tags)
      ? product.tags.map(compactTerm).filter(Boolean)
      : [],
    attributes: Array.isArray(product.attributes)
      ? product.attributes.map(compactAttribute).filter(Boolean)
      : [],
    default_attributes: Array.isArray(product.default_attributes)
      ? product.default_attributes.map(compactAttribute).filter(Boolean)
      : [],
    variations: Array.isArray(product.variations)
      ? product.variations.map(compactVariation).filter(Boolean)
      : [],
    variation_ids: Array.isArray(product.variation_ids)
      ? product.variation_ids.map(Number).filter((id) => id > 0)
      : [],
    images: firstImage ? [firstImage] : [],
    meta_data: discountMeta,
    add_to_cart: product.add_to_cart,
    low_stock_remaining: product.low_stock_remaining,
    phaseone_price_source: product.phaseone_price_source,
    store_api_url: cleanBaseUrl
      ? `${cleanBaseUrl}/wp-json/wc/store/v1/products`
      : undefined,
  };
}

export function getMinimumVariationPrice(variations = []) {
  if (!Array.isArray(variations)) return 0;

  const prices = variations
    .map((variation) =>
      getFirstPositivePrice(variation, [
        "price",
        "sale_price",
        "regular_price",
      ])
    )
    .filter((price) => price > 0);

  return prices.length > 0 ? Math.min(...prices) : 0;
}

export function productNeedsVariationPrice(product = {}) {
  const productPrice = getFirstPositivePrice(product, [
    "price",
    "sale_price",
    "regular_price",
  ]);
  const variationIds = Array.isArray(product?.variations)
    ? product.variations
    : [];

  return (
    String(product?.type || "").toLowerCase() === "variable" &&
    productPrice <= 0 &&
    variationIds.length > 0
  );
}

export function enrichProductWithVariationPrices(product = {}, variations = []) {
  if (!Array.isArray(variations) || variations.length === 0) return product;

  const originalVariationIds = Array.isArray(product?.variations)
    ? product.variations
        .map((variation) =>
          Number(
            typeof variation === "object"
              ? variation?.id || variation?.variation_id
              : variation
          )
        )
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const minimumVariationPrice = getMinimumVariationPrice(variations);
  const currentProductPrice = getFirstPositivePrice(product, [
    "price",
    "sale_price",
    "regular_price",
  ]);

  return {
    ...product,
    // The v3 parent response only contains variation IDs. Keeping the IDs in a
    // separate field preserves that information while making the real prices
    // available to the catalog price resolver.
    variation_ids: originalVariationIds,
    variations,
    price:
      currentProductPrice > 0
        ? product.price
        : minimumVariationPrice > 0
          ? String(minimumVariationPrice)
          : product.price,
    phaseone_price_source:
      currentProductPrice <= 0 && minimumVariationPrice > 0
        ? "variation-fallback"
        : product.phaseone_price_source,
  };
}

function createWooUrl(baseUrl, path, consumerKey, consumerSecret) {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/${path}`);

  url.searchParams.set("consumer_key", consumerKey);
  url.searchParams.set("consumer_secret", consumerSecret);

  return url;
}

async function fetchWooJson(url, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WOO_REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetchImpl(url.toString(), {
      headers: {
        "User-Agent": "Research Catalog Astro",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`WooCommerce request failed (${response.status}).`);
  }

  return response.json();
}

export function fetchWooProductVariations({
  baseUrl,
  consumerKey,
  consumerSecret,
  productId,
  expectedCount = 0,
  fetchImpl = fetch,
}) {
  const cleanProductId = Number(productId);
  if (!Number.isInteger(cleanProductId) || cleanProductId <= 0) {
    return Promise.resolve([]);
  }

  const cacheEnabled = fetchImpl === fetch;
  const cacheKey = `${String(baseUrl || "").replace(/\/$/, "")}::${cleanProductId}`;

  if (cacheEnabled && catalogState.variationInFlight.has(cacheKey)) {
    return catalogState.variationInFlight.get(cacheKey);
  }

  const variationsUrl = createWooUrl(
    baseUrl,
    `products/${cleanProductId}/variations`,
    consumerKey,
    consumerSecret
  );
  const requestedCount = Number(expectedCount);
  const safeCount = Number.isFinite(requestedCount) && requestedCount > 0
    ? Math.min(Math.max(Math.ceil(requestedCount), 1), 100)
    : 50;

  variationsUrl.searchParams.set("per_page", String(safeCount));
  variationsUrl.searchParams.set("status", "publish");

  const request = fetchWooJson(variationsUrl, fetchImpl).then((variations) =>
    Array.isArray(variations) ? variations : []
  );

  if (!cacheEnabled) return request;

  const sharedRequest = request.finally(() => {
    catalogState.variationInFlight.delete(cacheKey);
  });
  catalogState.variationInFlight.set(cacheKey, sharedRequest);

  return sharedRequest;
}

export async function fetchWooCatalog({
  baseUrl,
  consumerKey,
  consumerSecret,
  fetchImpl = fetch,
  perPage = DEFAULT_PRODUCTS_PER_PAGE,
  cacheTtlMs,
  staleTtlMs,
}) {
  if (!baseUrl || !consumerKey || !consumerSecret) {
    throw new Error("Missing WooCommerce environment variables.");
  }

  const ttlMs = getCatalogCacheTtlMs(cacheTtlMs);
  const staleWindowMs = getCatalogStaleTtlMs(staleTtlMs);
  const cacheEnabled = fetchImpl === fetch && ttlMs > 0;
  const cacheKey = getCatalogCacheKey(baseUrl, perPage);
  const cached = cacheEnabled ? catalogState.entries.get(cacheKey) : null;
  const now = Date.now();

  if (cached && now < cached.expiresAt) return cached.products;

  const loadCatalog = async () => {
    const maximumProducts = Math.min(Math.max(Number(perPage) || 1, 1), 100);
    const pageSize = Math.min(maximumProducts, MAX_PRODUCTS_PER_REQUEST);
    const productsUrl = createWooUrl(
      baseUrl,
      "products",
      consumerKey,
      consumerSecret
    );

    productsUrl.searchParams.set("per_page", String(pageSize));
    productsUrl.searchParams.set("page", "1");
    productsUrl.searchParams.set("status", "publish");
    productsUrl.searchParams.set("_fields", CATALOG_PRODUCT_FIELDS);

    const firstPage = await fetchWooJson(productsUrl, fetchImpl);

    if (!Array.isArray(firstPage)) {
      throw new Error("WooCommerce returned an invalid product catalog.");
    }

    let products = firstPage;

    // Most catalogs fit in the first compact page. Only request the second
    // page when the first one is full, avoiding a 100-product response for
    // small catalogs without truncating larger ones.
    if (firstPage.length === pageSize && maximumProducts > pageSize) {
      const nextUrl = new URL(productsUrl);
      nextUrl.searchParams.set("page", "2");
      const secondPage = await fetchWooJson(nextUrl, fetchImpl);
      if (Array.isArray(secondPage)) products = firstPage.concat(secondPage);
    }

    products = products.slice(0, maximumProducts);

    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        if (!productNeedsVariationPrice(product)) return product;

        try {
          const variations = await fetchWooProductVariations({
            baseUrl,
            consumerKey,
            consumerSecret,
            productId: product.id,
            expectedCount: product.variations?.length,
            fetchImpl,
          });

          return enrichProductWithVariationPrices(product, variations);
        } catch (error) {
          // A variation lookup must not take down the complete catalog. The UI
          // retains its existing fallback if WooCommerce has a transient failure.
          console.error(
            `Could not resolve variation prices for WooCommerce product ${product.id}:`,
            error
          );
          return product;
        }
      })
    );

    return enrichedProducts.map((product) =>
      compactWooCatalogProduct(product, baseUrl)
    );
  };

  if (!cacheEnabled) return loadCatalog();

  if (catalogState.inFlight.has(cacheKey)) {
    if (cached?.products?.length && now < (cached.staleUntil || 0)) {
      return cached.products;
    }

    return catalogState.inFlight.get(cacheKey);
  }

  const inFlight = loadCatalog()
    .then((products) => {
      const refreshedAt = Date.now();

      catalogState.entries.set(cacheKey, {
        products,
        expiresAt: refreshedAt + ttlMs,
        staleUntil: refreshedAt + ttlMs + staleWindowMs,
      });
      return products;
    })
    .catch((error) => {
      if (cached?.products?.length) {
        console.warn("WooCommerce catalog refresh failed; serving cached products.");
        return cached.products;
      }
      throw error;
    })
    .finally(() => {
      catalogState.inFlight.delete(cacheKey);
    });

  catalogState.inFlight.set(cacheKey, inFlight);

  if (cached?.products?.length && now < (cached.staleUntil || 0)) {
    return cached.products;
  }

  return inFlight;
}
