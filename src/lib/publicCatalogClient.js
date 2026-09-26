const PUBLIC_CATALOG_TTL_MS = 5 * 60_000;
const PUBLIC_CATALOG_STALE_MS = 60 * 60_000;

const state = globalThis.__phaseonePublicCatalogClientState || {
  entries: new Map(),
};

globalThis.__phaseonePublicCatalogClientState = state;

function cacheKey(endpoint) {
  if (typeof window === "undefined") return String(endpoint || "");
  return new URL(String(endpoint || "/api/products?limit=100"), window.location.origin)
    .toString();
}

function productsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function loadPublicCatalog(
  endpoint = "/api/products?limit=100",
  { force = false } = {},
) {
  const key = cacheKey(endpoint);
  const now = Date.now();
  const cached = state.entries.get(key);

  if (!force && cached?.products && now < cached.expiresAt) {
    return Promise.resolve(cached.products);
  }

  if (cached?.inFlight) return cached.inFlight;

  const request = fetch(key, {
    method: "GET",
    cache: force ? "reload" : "default",
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Products request failed: ${response.status}`);
      }

      const products = productsFromPayload(payload);
      const refreshedAt = Date.now();
      state.entries.set(key, {
        products,
        expiresAt: refreshedAt + PUBLIC_CATALOG_TTL_MS,
        staleUntil: refreshedAt + PUBLIC_CATALOG_TTL_MS + PUBLIC_CATALOG_STALE_MS,
        inFlight: null,
      });
      return products;
    })
    .catch((error) => {
      if (cached?.products && now < cached.staleUntil) return cached.products;
      state.entries.delete(key);
      throw error;
    });

  state.entries.set(key, {
    products: cached?.products || null,
    expiresAt: cached?.expiresAt || 0,
    staleUntil: cached?.staleUntil || 0,
    inFlight: request,
  });

  return request;
}
