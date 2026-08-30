import {
  classifyPresenceSection,
  type PresenceSection,
} from "./presenceSections";

const STORAGE_KEY = "phaseone_presence_session";
const GLOBAL_KEY = "__phaseOnePresenceTracker";
const HEARTBEAT_MS = 15_000;
const INACTIVITY_MS = 120_000;
const HIDDEN_GRACE_MS = 30_000;
const MAX_RECONNECT_MS = 15_000;

interface TrackerHandle {
  stop: () => void;
}

interface StartOptions {
  endpoint: string;
}

function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getVisitorId(): string {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-f0-9-]{16,64}$/i.test(existing)) return existing;
    const created = randomId();
    sessionStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return randomId();
  }
}

function normalizeEndpoint(value: string): string | null {
  try {
    const endpoint = new URL(value);
    if (endpoint.protocol === "https:") endpoint.protocol = "wss:";
    if (endpoint.protocol === "http:") endpoint.protocol = "ws:";
    if (endpoint.protocol !== "wss:" && endpoint.protocol !== "ws:") return null;
    endpoint.pathname = "/ws/presence";
    endpoint.search = "";
    endpoint.hash = "";
    return endpoint.toString();
  } catch {
    return null;
  }
}

export function startPresenceTracker(options: StartOptions): TrackerHandle | null {
  const globalState = window as typeof window & {
    [GLOBAL_KEY]?: TrackerHandle;
  };
  if (globalState[GLOBAL_KEY]) return globalState[GLOBAL_KEY];

  const endpoint = normalizeEndpoint(options.endpoint);
  if (!endpoint) return null;

  const visitorId = getVisitorId();
  let socket: WebSocket | undefined;
  let connectionId = "";
  let cartOpen = document.documentElement.classList.contains("phase-cart-open");
  let currentSection = classifyPresenceSection(location.pathname, cartOpen);
  let active = document.visibilityState === "visible";
  let stopped = false;
  let reconnectAttempt = 0;
  let reconnectTimer: number | undefined;
  let hiddenTimer: number | undefined;
  let lastActivity = Date.now();

  const send = (payload: Record<string, unknown>): void => {
    if (socket?.readyState !== WebSocket.OPEN) return;
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      // Presence must never affect the storefront.
    }
  };

  const sendSection = (): void => {
    const nextSection = classifyPresenceSection(location.pathname, cartOpen);
    if (nextSection === currentSection) return;
    currentSection = nextSection;
    send({ type: "presence:section", section: currentSection });
  };

  const clearReconnect = (): void => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  };

  const scheduleReconnect = (): void => {
    if (stopped || !active || reconnectTimer) return;
    const delay = Math.min(MAX_RECONNECT_MS, 750 * 2 ** reconnectAttempt);
    const jitter = Math.floor(Math.random() * 350);
    reconnectAttempt += 1;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay + jitter);
  };

  const connect = (): void => {
    if (
      stopped ||
      !active ||
      socket?.readyState === WebSocket.OPEN ||
      socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    connectionId = randomId();
    try {
      socket = new WebSocket(endpoint);
    } catch {
      socket = undefined;
      scheduleReconnect();
      return;
    }

    socket.addEventListener("open", () => {
      reconnectAttempt = 0;
      currentSection = classifyPresenceSection(location.pathname, cartOpen);
      send({
        type: "presence:hello",
        visitorId,
        connectionId,
        section: currentSection,
      });
    });

    socket.addEventListener("close", () => {
      socket = undefined;
      scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      // The socket's close event owns reconnection.
    });
  };

  const deactivate = (): void => {
    if (!active) return;
    active = false;
    clearReconnect();
    send({ type: "presence:inactive" });
    socket?.close(1000, "Inactive");
  };

  const markActivity = (): void => {
    lastActivity = Date.now();
    if (document.visibilityState !== "visible") return;
    if (!active) {
      active = true;
      connect();
    }
  };

  const onVisibilityChange = (): void => {
    if (hiddenTimer) window.clearTimeout(hiddenTimer);
    hiddenTimer = undefined;

    if (document.visibilityState === "hidden") {
      hiddenTimer = window.setTimeout(deactivate, HIDDEN_GRACE_MS);
      return;
    }

    markActivity();
  };

  const onCartState = (event: Event): void => {
    const detail = (event as CustomEvent<{ open?: boolean }>).detail;
    cartOpen = Boolean(detail?.open);
    sendSection();
  };

  const onRouteChange = (): void => sendSection();
  const activityEvents: Array<keyof WindowEventMap> = [
    "pointerdown",
    "keydown",
    "scroll",
    "touchstart",
  ];
  for (const eventName of activityEvents) {
    window.addEventListener(eventName, markActivity, { passive: true });
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("phase-cart-state", onCartState);
  window.addEventListener("popstate", onRouteChange);
  document.addEventListener("astro:page-load", onRouteChange);

  const heartbeatTimer = window.setInterval(() => {
    if (Date.now() - lastActivity >= INACTIVITY_MS) {
      deactivate();
      return;
    }
    if (!active || document.visibilityState !== "visible") return;
    if (socket?.readyState !== WebSocket.OPEN) {
      connect();
      return;
    }
    send({ type: "presence:heartbeat", section: currentSection });
  }, HEARTBEAT_MS);

  const handle: TrackerHandle = {
    stop: () => {
      stopped = true;
      clearReconnect();
      if (hiddenTimer) window.clearTimeout(hiddenTimer);
      window.clearInterval(heartbeatTimer);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, markActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("phase-cart-state", onCartState);
      window.removeEventListener("popstate", onRouteChange);
      document.removeEventListener("astro:page-load", onRouteChange);
      socket?.close(1000, "Stopped");
      delete globalState[GLOBAL_KEY];
    },
  };

  globalState[GLOBAL_KEY] = handle;
  connect();
  return handle;
}
