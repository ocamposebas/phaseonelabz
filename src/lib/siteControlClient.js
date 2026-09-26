const SITE_CONTROL_DEDUPE_MS = 10_000;

const state = globalThis.__phaseoneSiteControlClientState || {
  value: null,
  fetchedAt: 0,
  inFlight: null,
};

globalThis.__phaseoneSiteControlClientState = state;

function publish(value) {
  state.value = value;
  state.fetchedAt = Date.now();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("phaseone:site-control", { detail: value }),
    );
  }
}

export function getLatestSiteControl() {
  return state.value;
}

export function requestSiteControl({ force = false } = {}) {
  const now = Date.now();
  if (!force && state.value && now - state.fetchedAt < SITE_CONTROL_DEDUPE_MS) {
    return Promise.resolve(state.value);
  }
  if (state.inFlight) return state.inFlight;

  state.inFlight = fetch("/api/site-control", {
    headers: { Accept: "application/json" },
    cache: "default",
  })
    .then(async (response) => {
      const value = await response.json().catch(() => null);
      if (!response.ok || !value) {
        throw new Error(`Site control returned ${response.status}.`);
      }
      publish(value);
      return value;
    })
    .finally(() => {
      state.inFlight = null;
    });

  return state.inFlight;
}

export function subscribeSiteControl(listener) {
  if (typeof window === "undefined" || typeof listener !== "function") {
    return () => {};
  }

  const handleUpdate = (event) => listener(event.detail);
  window.addEventListener("phaseone:site-control", handleUpdate);
  if (state.value) listener(state.value);

  return () => window.removeEventListener("phaseone:site-control", handleUpdate);
}
