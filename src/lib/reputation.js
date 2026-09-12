import { normalizeReputationPayload } from "./reputationModel.js";

const CACHE_TTL_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 3_500;

const state = globalThis.__phaseoneReputationState || {
  value: null,
  expiresAt: 0,
  inFlight: null,
};

globalThis.__phaseoneReputationState = state;

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

export function getReputationEndpoint() {
  const explicit = String(
    firstValue(
      process.env.PHASEONE_REPUTATION_URL,
      import.meta.env.PHASEONE_REPUTATION_URL,
    ),
  ).trim();
  if (explicit) return explicit;

  const base = wordpressBaseUrl();
  return base ? `${base}/wp-json/phaseone/v1/reputation` : "";
}

export function emptyReputationPayload() {
  return normalizeReputationPayload({ sources: [] });
}

export async function getReputation({ force = false } = {}) {
  const endpoint = getReputationEndpoint();
  if (!endpoint) return emptyReputationPayload();

  const now = Date.now();
  if (!force && state.value && now < state.expiresAt) return state.value;
  if (state.inFlight) return state.value || state.inFlight;

  state.inFlight = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "Phase One Storefront Reputation/1.0",
        },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Reputation endpoint returned ${response.status}`);
      const value = normalizeReputationPayload(await response.json());
      state.value = value;
      state.expiresAt = Date.now() + CACHE_TTL_MS;
      return value;
    } catch {
      return state.value || emptyReputationPayload();
    } finally {
      clearTimeout(timeout);
      state.inFlight = null;
    }
  })();

  return state.value || state.inFlight;
}

