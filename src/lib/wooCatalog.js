const DEFAULT_PRODUCTS_PER_PAGE = 100;

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
  const response = await fetchImpl(url.toString(), {
    headers: {
      "User-Agent": "Research Catalog Astro",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`WooCommerce request failed (${response.status}).`);
  }

  return response.json();
}

export async function fetchWooCatalog({
  baseUrl,
  consumerKey,
  consumerSecret,
  fetchImpl = fetch,
  perPage = DEFAULT_PRODUCTS_PER_PAGE,
}) {
  if (!baseUrl || !consumerKey || !consumerSecret) {
    throw new Error("Missing WooCommerce environment variables.");
  }

  const productsUrl = createWooUrl(
    baseUrl,
    "products",
    consumerKey,
    consumerSecret
  );

  productsUrl.searchParams.set("per_page", String(perPage));
  productsUrl.searchParams.set("page", "1");
  productsUrl.searchParams.set("status", "publish");

  const products = await fetchWooJson(productsUrl, fetchImpl);

  if (!Array.isArray(products)) {
    throw new Error("WooCommerce returned an invalid product catalog.");
  }

  const enrichedProducts = await Promise.all(
    products.map(async (product) => {
      if (!productNeedsVariationPrice(product)) return product;

      const variationsUrl = createWooUrl(
        baseUrl,
        `products/${product.id}/variations`,
        consumerKey,
        consumerSecret
      );

      variationsUrl.searchParams.set("per_page", "100");
      variationsUrl.searchParams.set("status", "publish");

      try {
        const variations = await fetchWooJson(variationsUrl, fetchImpl);

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

  return enrichedProducts;
}
