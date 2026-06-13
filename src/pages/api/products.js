export const prerender = false;

const REQUEST_TIMEOUT_MS = 10000;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
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
  return {
    id: product.id,
    name: product.name || "",
    slug: product.slug || "",
    sku: product.sku || "",
    price: product.price || product.regular_price || product.sale_price || "",
    regular_price: product.regular_price || "",
    sale_price: product.sale_price || "",
    stock_status: product.stock_status || "",
    in_stock: product.stock_status === "instock",
    permalink: product.permalink || `/products/${product.slug}`,
    image:
      product.images?.[0]?.src ||
      product.image ||
      "/placeholder-product.png",
    images: product.images || [],
    categories: product.categories || [],
    tags: product.tags || [],
    short_description: product.short_description || "",
    description: product.description || "",
  };
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
      return jsonResponse(
        {
          error: "Unable to load products.",
          products: [],
        },
        500
      );
    }

    const products = data.map(normalizeProduct);

    return jsonResponse(
      {
        success: true,
        products,
      },
      200
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