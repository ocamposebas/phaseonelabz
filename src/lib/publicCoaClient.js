const PUBLIC_COA_TTL_MS = 5 * 60_000;
const PUBLIC_COA_STALE_MS = 24 * 60 * 60_000;

const state = globalThis.__phaseonePublicCoaClientState || {
  entries: new Map(),
};

globalThis.__phaseonePublicCoaClientState = state;

function cacheKey(endpoint) {
  if (typeof window === "undefined") return String(endpoint || "");
  return new URL(String(endpoint || "/api/coas"), window.location.origin).toString();
}

export function loadPublicCoaCatalog(
  endpoint = "/api/coas",
  { force = false } = {},
) {
  const key = cacheKey(endpoint);
  const now = Date.now();
  const cached = state.entries.get(key);

  if (!force && cached?.payload && now < cached.expiresAt) {
    return Promise.resolve(cached.payload);
  }

  if (cached?.inFlight) return cached.inFlight;

  const request = fetch(key, {
    headers: { Accept: "application/json" },
    cache: force ? "reload" : "default",
    credentials: "same-origin",
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "The certificate catalog could not be loaded.");
      }

      const normalizedPayload = payload && typeof payload === "object"
        ? payload
        : { records: [] };
      const refreshedAt = Date.now();
      state.entries.set(key, {
        payload: normalizedPayload,
        expiresAt: refreshedAt + PUBLIC_COA_TTL_MS,
        staleUntil: refreshedAt + PUBLIC_COA_TTL_MS + PUBLIC_COA_STALE_MS,
        inFlight: null,
      });
      return normalizedPayload;
    })
    .catch((error) => {
      if (cached?.payload && now < cached.staleUntil) {
        return { ...cached.payload, stale: true };
      }
      state.entries.delete(key);
      throw error;
    });

  state.entries.set(key, {
    payload: cached?.payload || null,
    expiresAt: cached?.expiresAt || 0,
    staleUntil: cached?.staleUntil || 0,
    inFlight: request,
  });

  return request;
}
