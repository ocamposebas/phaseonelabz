import { normalizeCoaCatalog } from "../../lib/coaModel.js";

export const prerender = false;

const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 60_000;
const STALE_TTL_MS = 10 * 60_000;
const state =
  globalThis.__phaseonePublicCoaCatalog ||
  (globalThis.__phaseonePublicCoaCatalog = {
    value: null,
    expiresAt: 0,
    staleUntil: 0,
    inFlight: null,
  });

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control":
        status === 200
          ? "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
          : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function payloadRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.coas)) return payload.coas;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getWordPressBase() {
  const configured = String(
    import.meta.env.WOOCOMMERCE_URL2 ||
      import.meta.env.WOOCOMMERCE_URL ||
      import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
      import.meta.env.PUBLIC_WP_SITE_URL ||
      ""
  ).trim();
  if (configured) return configured.replace(/\/$/, "");

  const endpoint = String(import.meta.env.PUBLIC_WP_COA_API_URL || "").trim();
  if (!endpoint) return "";

  try {
    return new URL(endpoint).origin;
  } catch {
    return "";
  }
}

function getCoaEndpoint(baseUrl) {
  const configured = String(import.meta.env.PUBLIC_WP_COA_API_URL || "").trim();
  return configured || `${baseUrl}/wp-json/phaseone/v1/coas`;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Phase One Public COA Catalog",
    },
    cache: "no-store",
    signal,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Upstream request failed (${response.status}).`);
  }

  return { payload, response };
}

async function fetchWooProducts(baseUrl, signal) {
  if (!baseUrl) return [];

  const firstUrl = new URL(`${baseUrl}/wp-json/wc/store/v1/products`);
  firstUrl.searchParams.set("per_page", "100");
  firstUrl.searchParams.set("page", "1");
  firstUrl.searchParams.set("status", "publish");

  const first = await fetchJson(firstUrl, signal);
  const products = Array.isArray(first.payload) ? first.payload : [];
  const totalPages = Math.min(
    Math.max(Number(first.response.headers.get("x-wp-totalpages") || 1), 1),
    20
  );

  if (totalPages === 1) return products;

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, async (_, index) => {
      const pageUrl = new URL(firstUrl);
      pageUrl.searchParams.set("page", String(index + 2));
      const page = await fetchJson(pageUrl, signal);
      return Array.isArray(page.payload) ? page.payload : [];
    })
  );

  return products.concat(...remaining);
}

async function loadCatalog() {
  const baseUrl = getWordPressBase();
  const coaEndpoint = getCoaEndpoint(baseUrl);
  if (!coaEndpoint) throw new Error("The COA service is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const [coaResult, productResult] = await Promise.allSettled([
      fetchJson(coaEndpoint, controller.signal),
      fetchWooProducts(baseUrl, controller.signal),
    ]);

    if (coaResult.status !== "fulfilled") throw coaResult.reason;

    const rawRecords = payloadRecords(coaResult.value.payload);
    const products =
      productResult.status === "fulfilled" ? productResult.value : [];
    const records = normalizeCoaCatalog(rawRecords, products);

    return {
      records,
      summary: {
        total: records.length,
        current: records.filter((record) => record.isCurrentShippingLot).length,
        historical: records.filter((record) => !record.isCurrentShippingLot)
          .length,
        withProductImage: records.filter((record) => record.product.image?.src)
          .length,
      },
      productEnrichmentAvailable: productResult.status === "fulfilled",
      generatedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getCatalog() {
  const now = Date.now();
  if (state.value && now < state.expiresAt) return state.value;
  if (state.inFlight) return state.inFlight;

  state.inFlight = loadCatalog()
    .then((value) => {
      state.value = value;
      state.expiresAt = Date.now() + CACHE_TTL_MS;
      state.staleUntil = Date.now() + STALE_TTL_MS;
      return value;
    })
    .catch((error) => {
      if (state.value && Date.now() < state.staleUntil) {
        return { ...state.value, stale: true };
      }
      throw error;
    })
    .finally(() => {
      state.inFlight = null;
    });

  return state.inFlight;
}

export async function GET() {
  try {
    return jsonResponse(await getCatalog());
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return jsonResponse(
      {
        error: timedOut
          ? "The COA service took too long to respond."
          : "The COA catalog is temporarily unavailable.",
        records: [],
      },
      502
    );
  }
}
