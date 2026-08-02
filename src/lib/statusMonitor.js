import { Buffer } from "node:buffer";

import {
  MONTHLY_MAINTENANCE,
  STATUS_INCIDENT_HISTORY,
  STATUS_MAINTENANCE_HISTORY,
} from "../data/statusConfig.js";

const CACHE_TTL_MS = 60 * 1000;
const SNAPSHOT_BUDGET_MS = 8 * 1000;
const REQUEST_TIMEOUT_MS = 3500;
const MAX_CONCURRENT_REQUESTS = 4;
const MAINTENANCE_PROBE_TTL_MS = 15 * 60 * 1000;
const PLATFORM_MAINTENANCE_CHECK_COUNT = 13;

const CRITICALITY_RANK = {
  medium: 1,
  high: 2,
  critical: 3,
};

const statusState =
  globalThis.__phaseoneStatusMonitorState ||
  {
    snapshot: null,
    expiresAt: 0,
    inFlight: null,
    maintenanceProbe: null,
    maintenanceProbeExpiresAt: 0,
    maintenanceProbeInFlight: null,
  };

globalThis.__phaseoneStatusMonitorState = statusState;
statusState.maintenanceProbe ??= null;
statusState.maintenanceProbeExpiresAt ??= 0;
statusState.maintenanceProbeInFlight ??= null;

function firstValue(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    const restIndex = url.pathname.indexOf("/wp-json");

    if (restIndex >= 0) {
      url.pathname = url.pathname.slice(0, restIndex) || "/";
      url.search = "";
      url.hash = "";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function absoluteEndpoint(value, baseUrl, fallbackPath) {
  const configured = String(value || "").trim();

  if (configured) {
    try {
      return new URL(configured, baseUrl || undefined).toString();
    } catch {
      return "";
    }
  }

  return baseUrl ? `${baseUrl}${fallbackPath}` : "";
}

function getConfiguration() {
  const wordpressBase = normalizeBaseUrl(
    firstValue(
      import.meta.env.WORDPRESS_URL,
      import.meta.env.WP_SITE_URL,
      import.meta.env.WORDPRESS_API_URL,
      import.meta.env.WOOCOMMERCE_URL2,
      import.meta.env.WOOCOMMERCE_URL,
      import.meta.env.PUBLIC_WP_SITE_URL,
      import.meta.env.PUBLIC_WOOCOMMERCE_URL,
    ),
  );

  return {
    wordpressBase,
    coaEndpoint: absoluteEndpoint(
      firstValue(
        import.meta.env.PUBLIC_WP_COA_API_URL,
        import.meta.env.PUBLIC_COA_API_URL,
        import.meta.env.PUBLIC_COA_ENDPOINT,
      ),
      wordpressBase,
      "/wp-json/phaseone/v1/coas",
    ),
    restockEndpoint: absoluteEndpoint(
      import.meta.env.PUBLIC_RESTOCK_API_URL,
      wordpressBase,
      "/wp-json/phase/v1/restocks",
    ),
    wooKey: String(
      firstValue(
        import.meta.env.WOOCOMMERCE_CONSUMER_KEY,
        import.meta.env.CONSUMER_KEY,
      ),
    ).trim(),
    wooSecret: String(
      firstValue(
        import.meta.env.WOOCOMMERCE_CONSUMER_SECRET,
        import.meta.env.CONSUMER_SECRET,
      ),
    ).trim(),
    omnisendKey: String(import.meta.env.OMNISEND_API_KEY || "").trim(),
    maintenanceDay: Number(
      import.meta.env.STATUS_MAINTENANCE_DAY_OF_MONTH || 0,
    ),
    maintenanceHourUtc: Number(
      import.meta.env.STATUS_MAINTENANCE_HOUR_UTC || 9,
    ),
    maintenanceDurationMinutes: Number(
      import.meta.env.STATUS_MAINTENANCE_DURATION_MINUTES || 90,
    ),
    lastMaintenanceAt: String(
      import.meta.env.STATUS_LAST_MAINTENANCE_AT || "",
    ).trim(),
  };
}

function createLimiter(maxConcurrent) {
  let active = 0;
  const queue = [];

  const runNext = () => {
    if (active >= maxConcurrent || queue.length === 0) return;

    const item = queue.shift();
    active += 1;

    Promise.resolve()
      .then(item.task)
      .then(item.resolve, item.reject)
      .finally(() => {
        active -= 1;
        runNext();
      });
  };

  return (task) =>
    new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      runNext();
    });
}

function linkAbortSignal(controller, sharedSignal) {
  if (!sharedSignal) return () => {};

  if (sharedSignal.aborted) {
    controller.abort();
    return () => {};
  }

  const abort = () => controller.abort();
  sharedSignal.addEventListener("abort", abort, { once: true });

  return () => sharedSignal.removeEventListener("abort", abort);
}

async function performJsonRequest(url, options, sharedSignal) {
  if (!url) {
    return {
      ok: false,
      configured: false,
      latencyMs: null,
      data: null,
      reason: "not_configured",
    };
  }

  const controller = new AbortController();
  const unlinkAbort = linkAbortSignal(controller, sharedSignal);
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      ...options,
      headers: {
        Accept: "application/json",
        "User-Agent": "Phase One Status Monitor/1.0",
        ...(options?.headers || {}),
      },
      signal: controller.signal,
    });

    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.toLowerCase().includes("json")
      ? await response.json().catch(() => null)
      : null;

    return {
      ok: response.ok,
      configured: true,
      latencyMs,
      data,
      statusCode: response.status,
      reason: response.ok ? "ok" : "http_error",
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
      data: null,
      reason:
        error?.name === "AbortError" ? "timeout" : "network_error",
    };
  } finally {
    clearTimeout(timeout);
    unlinkAbort();
  }
}

async function requestJson(url, options, sharedSignal) {
  const firstAttempt = await performJsonRequest(url, options, sharedSignal);

  if (
    firstAttempt.ok ||
    sharedSignal?.aborted ||
    (firstAttempt.statusCode && firstAttempt.statusCode < 500)
  ) {
    return firstAttempt;
  }

  return performJsonRequest(url, options, sharedSignal);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return null;
}

function getRoutes(probe) {
  return probe?.ok && isObject(probe?.data?.routes)
    ? probe.data.routes
    : null;
}

function hasRoutes(routeMap, requiredRoutes) {
  if (!routeMap) return { passed: 0, total: requiredRoutes.length };

  return {
    passed: requiredRoutes.filter((route) => Boolean(routeMap[route])).length,
    total: requiredRoutes.length,
  };
}

function maxLatency(...probes) {
  const values = probes
    .flat()
    .map((probe) => probe?.latencyMs)
    .filter((value) => Number.isFinite(value));

  return values.length ? Math.max(...values) : null;
}

function service({
  id,
  name,
  group,
  status,
  message,
  latencyMs = null,
  criticality = "medium",
  monitorType = "live",
  scope = "",
  checks = null,
  checkedAt,
}) {
  return {
    id,
    name,
    group,
    status,
    message,
    latencyMs,
    checkedAt,
    criticality,
    monitorType,
    ...(scope ? { scope } : {}),
    ...(checks ? { checks } : {}),
  };
}

function unavailableStatus(probe) {
  if (!probe?.configured) return "unknown";
  return "outage";
}

async function getCachedMaintenanceProbe(factory) {
  if (
    statusState.maintenanceProbe &&
    Date.now() < statusState.maintenanceProbeExpiresAt
  ) {
    return statusState.maintenanceProbe;
  }

  if (statusState.maintenanceProbeInFlight) {
    return statusState.maintenanceProbeInFlight;
  }

  statusState.maintenanceProbeInFlight = factory()
    .then((probe) => {
      statusState.maintenanceProbe = probe;
      statusState.maintenanceProbeExpiresAt =
        Date.now() + (probe.ok ? MAINTENANCE_PROBE_TTL_MS : CACHE_TTL_MS);
      return probe;
    })
    .finally(() => {
      statusState.maintenanceProbeInFlight = null;
    });

  return statusState.maintenanceProbeInFlight;
}

function analyzePlatformMaintenance(probe, configured) {
  if (!configured || !probe?.configured) {
    return {
      status: "unknown",
      pendingUpdates: null,
      checks: { passed: 0, total: PLATFORM_MAINTENANCE_CHECK_COUNT },
    };
  }

  if (!probe.ok || !isObject(probe.data)) {
    return {
      status: "outage",
      pendingUpdates: null,
      checks: { passed: 0, total: PLATFORM_MAINTENANCE_CHECK_COUNT },
    };
  }

  const environment = probe.data.environment;
  const database = probe.data.database;
  const security = probe.data.security;
  const plugins = Array.isArray(probe.data.active_plugins)
    ? probe.data.active_plugins
    : [];
  const pluginSignatures = plugins
    .map((plugin) => `${plugin?.plugin || ""} ${plugin?.name || ""}`)
    .join(" ")
    .toLowerCase();
  const checks = [
    environment?.wp_cron === true,
    environment?.log_directory_writable === true,
    environment?.remote_get_successful === true,
    environment?.remote_post_successful === true,
    isObject(database?.database_tables),
    security?.secure_connection === true,
    security?.hide_errors === true,
    pluginSignatures.includes("woocommerce"),
    pluginSignatures.includes("wordfence"),
    /updraft|wpvivid/.test(pluginSignatures),
    /wp.?mail.?smtp/.test(pluginSignatures),
    pluginSignatures.includes("shipstation"),
    /stock.?guard/.test(pluginSignatures),
  ];
  const passed = checks.filter(Boolean).length;
  const pendingUpdates = plugins.filter((plugin) => {
    const current = String(plugin?.version || "").trim();
    const latest = String(plugin?.version_latest || "").trim();
    return current && latest && current !== latest;
  }).length;

  return {
    status: passed === checks.length ? "operational" : "degraded",
    pendingUpdates,
    checks: { passed, total: checks.length },
  };
}

function getFirstSunday(year, month, hourUtc) {
  const first = new Date(Date.UTC(year, month, 1, hourUtc, 0, 0));
  const daysUntilSunday = (7 - first.getUTCDay()) % 7;
  first.setUTCDate(first.getUTCDate() + daysUntilSunday);
  return first;
}

function getMonthlyWindow(now, config, platformMaintenance = {}) {
  const validHour = Math.min(
    23,
    Math.max(0, Number.isFinite(config.maintenanceHourUtc)
      ? config.maintenanceHourUtc
      : 9),
  );
  const durationMinutes = Math.min(
    12 * 60,
    Math.max(
      15,
      Number.isFinite(config.maintenanceDurationMinutes)
        ? config.maintenanceDurationMinutes
        : 90,
    ),
  );
  const configuredDay = Number.isInteger(config.maintenanceDay)
    ? Math.min(28, Math.max(0, config.maintenanceDay))
    : 0;

  const candidateFor = (year, month) => {
    if (configuredDay > 0) {
      return new Date(Date.UTC(year, month, configuredDay, validHour, 0, 0));
    }

    return getFirstSunday(year, month, validHour);
  };

  let startsAt = candidateFor(now.getUTCFullYear(), now.getUTCMonth());
  let endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
  let status = "scheduled";

  if (now >= startsAt && now < endsAt) {
    status = "in_progress";
  } else if (now >= endsAt) {
    const nextMonth = now.getUTCMonth() + 1;
    startsAt = candidateFor(now.getUTCFullYear(), nextMonth);
    endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
  }

  const lastCompletedDate = config.lastMaintenanceAt
    ? new Date(config.lastMaintenanceAt)
    : null;
  const hasValidCompletion = Boolean(
    lastCompletedDate && !Number.isNaN(lastCompletedDate.getTime()),
  );
  const completionAgeDays = hasValidCompletion
    ? Math.floor((now.getTime() - lastCompletedDate.getTime()) / 86400000)
    : null;

  return {
    ...MONTHLY_MAINTENANCE,
    cadence:
      configuredDay > 0
        ? `Day ${configuredDay} of every month`
        : MONTHLY_MAINTENANCE.cadence,
    summary:
      platformMaintenance.pendingUpdates > 0
        ? `${platformMaintenance.pendingUpdates} routine software ${
            platformMaintenance.pendingUpdates === 1 ? "update is" : "updates are"
          } queued for the next maintenance window.`
        : MONTHLY_MAINTENANCE.summary,
    status,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    timezone: "UTC",
    durationMinutes,
    lastCompletedAt: hasValidCompletion
      ? lastCompletedDate.toISOString()
      : null,
    recordStatus: !hasValidCompletion
      ? "not_recorded"
      : completionAgeDays > 40
        ? "due"
        : "up_to_date",
    platformCheckStatus: platformMaintenance.status || "unknown",
    pendingUpdates: Number.isFinite(platformMaintenance.pendingUpdates)
      ? platformMaintenance.pendingUpdates
      : null,
    platformChecks: platformMaintenance.checks || null,
  };
}

function makeOverallStatus(services, maintenance) {
  const criticalOutages = services.filter(
    (item) => item.status === "outage" && item.criticality === "critical",
  ).length;
  const highOutages = services.filter(
    (item) =>
      item.status === "outage" && CRITICALITY_RANK[item.criticality] >= 2,
  ).length;
  const outages = services.filter((item) => item.status === "outage").length;
  const degraded = services.filter(
    (item) => item.status === "degraded",
  ).length;
  const unknown = services.filter((item) => item.status === "unknown").length;

  if (criticalOutages >= 2) {
    return {
      status: "major_outage",
      title: "Major service disruption",
      message: "Multiple essential services are currently unavailable.",
    };
  }

  if (criticalOutages === 1 || highOutages >= 1) {
    return {
      status: "partial_outage",
      title: "Service disruption",
      message: "An essential service is currently unavailable.",
    };
  }

  if (outages > 0 || degraded > 0) {
    return {
      status: "degraded",
      title: "Degraded performance",
      message: "One or more supporting services need attention.",
    };
  }

  if (unknown > 0) {
    return {
      status: "unknown",
      title: "Verification incomplete",
      message: "Some services could not be fully verified.",
    };
  }

  if (maintenance.status === "in_progress") {
    return {
      status: "maintenance",
      title: "Scheduled maintenance",
      message: "Routine monthly maintenance is currently in progress.",
    };
  }

  return {
    status: "operational",
    title: "All systems operational",
    message: "All monitored Phase One services are responding normally.",
  };
}

function buildAutomaticIncidents(services, checkedAt) {
  return services
    .filter((item) => item.status === "outage")
    .map((item) => ({
      id: `monitor-${item.id}`,
      title: `${item.name} disruption`,
      status: "investigating",
      severity:
        item.criticality === "critical" ? "critical" : "service_disruption",
      startedAt: checkedAt,
      affectedComponents: [item.id],
      summary: item.message,
      updates: [
        {
          status: "investigating",
          message: "The automated monitor detected an availability issue.",
          createdAt: checkedAt,
        },
      ],
      automated: true,
    }));
}

function summarize(services, activeIncidents) {
  const summary = {
    total: services.length,
    operational: 0,
    degraded: 0,
    outage: 0,
    maintenance: 0,
    unknown: 0,
    activeIncidents: activeIncidents.length,
  };

  for (const item of services) {
    if (Object.hasOwn(summary, item.status)) {
      summary[item.status] += 1;
    }
  }

  return summary;
}

async function buildStatusSnapshot() {
  const config = getConfiguration();
  const checkedAt = new Date().toISOString();
  const budgetController = new AbortController();
  const budgetTimeout = setTimeout(
    () => budgetController.abort(),
    SNAPSHOT_BUDGET_MS,
  );
  const limit = createLimiter(MAX_CONCURRENT_REQUESTS);
  const request = (url, options = {}) =>
    limit(() => requestJson(url, options, budgetController.signal));
  const wp = config.wordpressBase;

  const wordpressProbe = request(
    wp ? `${wp}/wp-json/wp/v2/types/post?context=view` : "",
  );
  const catalogProbe = request(
    wp
      ? `${wp}/wp-json/wc/store/v1/products?per_page=1&_fields=id,name,is_in_stock`
      : "",
  );
  const phaseoneNamespaceProbe = request(
    wp ? `${wp}/wp-json/phaseone/v1` : "",
  );
  const phaseNamespaceProbe = request(wp ? `${wp}/wp-json/phase/v1` : "");
  const labNamespaceProbe = request(wp ? `${wp}/wp-json/lab/v1` : "");
  const shipstationNamespaceProbe = request(
    wp ? `${wp}/wp-json/wc-shipstation/v1` : "",
  );
  const paymentHealthProbe = request(
    wp ? `${wp}/wp-json/phase/v1/health` : "",
  );
  const paymentGatewaysProbe = request(
    wp ? `${wp}/wp-json/phase/v1/payment-gateways` : "",
  );

  const coaUrl = config.coaEndpoint
    ? new URL(config.coaEndpoint)
    : null;
  if (coaUrl) coaUrl.searchParams.set("currentShippingLot", "true");
  const coaHistoryUrl = config.coaEndpoint
    ? new URL(config.coaEndpoint)
    : null;
  if (coaHistoryUrl) {
    coaHistoryUrl.searchParams.set("currentShippingLot", "false");
  }

  const coaProbe = request(coaUrl?.toString() || "");
  const coaHistoryProbe = request(coaHistoryUrl?.toString() || "");
  const restockProbe = request(config.restockEndpoint);
  const affiliateProbe = request(
    wp ? `${wp}/wp-json/phaseone/v1/coupon-affiliate/ping` : "",
  );
  const couponProbe = request(
    wp ? `${wp}/wp-json/phaseone/v1/validate-coupon` : "",
  );
  const agreementsProbe = request(
    wp ? `${wp}/wp-json/phaseone/v1/signed-agreements/status` : "",
  );
  const feedProbe = request(
    wp ? `${wp}/wp-json/phaseone/v1/feed` : "",
  );
  const verifyPassProbe = request("https://verifypass.com/auth/b08f6507d1", {
    headers: { Accept: "text/html,application/xhtml+xml" },
  });
  const googleAdsProbe = request(
    "https://www.googletagmanager.com/gtag/js?id=AW-18266891349",
    { headers: { Accept: "application/javascript,*/*;q=0.8" } },
  );
  const omnisendLauncherProbe = request(
    "https://omnisnippet1.com/inshop/launcher-v2.js",
    { headers: { Accept: "application/javascript,*/*;q=0.8" } },
  );

  const wooAuthReady = Boolean(config.wooKey && config.wooSecret);
  const wooAuthHeader = wooAuthReady
    ? `Basic ${Buffer.from(`${config.wooKey}:${config.wooSecret}`).toString("base64")}`
    : "";
  const orderProbe = request(
    wooAuthReady && wp
      ? `${wp}/wp-json/wc/v3/orders?per_page=1&_fields=id,status`
      : "",
    wooAuthReady
      ? {
          headers: {
            Authorization: wooAuthHeader,
          },
        }
      : {},
  );
  const systemStatusProbe = getCachedMaintenanceProbe(() =>
    request(
      wooAuthReady && wp ? `${wp}/wp-json/wc/v3/system_status` : "",
      wooAuthReady
        ? {
            headers: {
              Authorization: wooAuthHeader,
            },
          }
        : {},
    ),
  );
  const omnisendProbe = request(
    config.omnisendKey
      ? "https://api.omnisend.com/v3/contacts?limit=1"
      : "",
    config.omnisendKey
      ? {
          headers: {
            "X-API-KEY": config.omnisendKey,
          },
        }
      : {},
  );

  const probes = await Promise.all([
    wordpressProbe,
    catalogProbe,
    phaseoneNamespaceProbe,
    phaseNamespaceProbe,
    labNamespaceProbe,
    shipstationNamespaceProbe,
    paymentHealthProbe,
    paymentGatewaysProbe,
    coaProbe,
    coaHistoryProbe,
    restockProbe,
    affiliateProbe,
    couponProbe,
    agreementsProbe,
    feedProbe,
    verifyPassProbe,
    googleAdsProbe,
    omnisendLauncherProbe,
    orderProbe,
    systemStatusProbe,
    omnisendProbe,
  ]);

  clearTimeout(budgetTimeout);

  const [
    wordpress,
    catalog,
    phaseoneNamespace,
    phaseNamespace,
    labNamespace,
    shipstationNamespace,
    paymentHealth,
    paymentGateways,
    coa,
    coaHistory,
    restocks,
    affiliate,
    coupon,
    agreements,
    feed,
    verifyPass,
    googleAds,
    omnisendLauncher,
    orders,
    systemStatus,
    omnisend,
  ] = probes;

  const phaseoneRoutes = getRoutes(phaseoneNamespace);
  const phaseRoutes = getRoutes(phaseNamespace);
  const labRoutes = getRoutes(labNamespace);
  const shipstationRoutes = getRoutes(shipstationNamespace);

  const services = [
    service({
      id: "website",
      name: "Website & status API",
      group: "Core platform",
      status: "operational",
      message: "The storefront runtime and public status API are responding.",
      criticality: "critical",
      monitorType: "self_check",
      scope:
        "A separate external monitor is still recommended for full hosting coverage.",
      checkedAt,
    }),
  ];

  const wordpressValid =
    wordpress.ok && isObject(wordpress.data) && wordpress.data.slug === "post";
  services.push(
    service({
      id: "wordpress",
      name: "WordPress & WooCommerce",
      group: "Core platform",
      status: wordpressValid ? "operational" : unavailableStatus(wordpress),
      message: wordpressValid
        ? "WordPress REST and the commerce database are responding."
        : wordpress.configured
          ? "WordPress is not responding normally."
          : "WordPress monitoring is not configured.",
      latencyMs: wordpress.latencyMs,
      criticality: "critical",
      checkedAt,
    }),
  );

  const platformMaintenance = analyzePlatformMaintenance(
    systemStatus,
    wooAuthReady,
  );
  services.push(
    service({
      id: "safeguards",
      name: "Operational safeguards",
      group: "Core platform",
      status: platformMaintenance.status,
      message:
        platformMaintenance.status === "operational"
          ? platformMaintenance.pendingUpdates > 0
            ? `Core platform checks passed; ${platformMaintenance.pendingUpdates} routine ${
                platformMaintenance.pendingUpdates === 1 ? "update is" : "updates are"
              } scheduled.`
            : "Scheduled jobs, logs, remote requests and database tables are healthy."
          : platformMaintenance.status === "unknown"
            ? "Private maintenance monitoring is not configured."
            : "One or more platform maintenance checks need attention.",
      latencyMs: systemStatus.latencyMs,
      criticality: "high",
      monitorType: "private_read_only",
      scope:
        "Checks operational prerequisites and expected safeguards without exposing private diagnostics.",
      checks: platformMaintenance.checks,
      checkedAt,
    }),
  );

  const catalogProducts = extractArray(catalog.data, ["products", "items"]);
  const catalogValid = catalog.ok && Array.isArray(catalogProducts);
  services.push(
    service({
      id: "catalog",
      name: "Product catalog & inventory",
      group: "Commerce",
      status: catalogValid ? "operational" : unavailableStatus(catalog),
      message: catalogValid
        ? "Product and stock availability data are accessible."
        : catalog.configured
          ? "Catalog or inventory data could not be verified."
          : "Catalog monitoring is not configured.",
      latencyMs: catalog.latencyMs,
      criticality: "critical",
      checkedAt,
    }),
  );

  const checkoutPhaseoneRoutes = hasRoutes(phaseoneRoutes, [
    "/phaseone/v1/prism-checkout",
    "/phaseone/v1/prism-order-status",
    "/phaseone/v1/validate-coupon",
  ]);
  const checkoutPhaseRoutes = hasRoutes(phaseRoutes, [
    "/phase/v1/create-edebit-order",
    "/phase/v1/manual-payment-order",
  ]);
  const enabledGatewayIds = new Set(
    extractArray(paymentGateways.data, ["gateways"])
      ?.filter((gateway) => gateway?.enabled === "yes")
      .map((gateway) => String(gateway?.id || "")) || [],
  );
  const gatewaysReady =
    paymentGateways.ok &&
    enabledGatewayIds.has("prism_simple_checkout") &&
    enabledGatewayIds.has("edd_draft_yodlee_gateway");
  const paymentPluginReady =
    paymentHealth.ok && paymentHealth.data?.success === true;
  const checkoutRoutesPassed =
    checkoutPhaseoneRoutes.passed + checkoutPhaseRoutes.passed;
  const checkoutRoutesTotal =
    checkoutPhaseoneRoutes.total + checkoutPhaseRoutes.total;
  const checkoutStatus =
    gatewaysReady && paymentPluginReady && checkoutRoutesPassed === checkoutRoutesTotal
      ? "operational"
      : checkoutRoutesPassed > 0 || gatewaysReady || paymentPluginReady
        ? "degraded"
        : "outage";
  services.push(
    service({
      id: "checkout",
      name: "Checkout & payments",
      group: "Commerce",
      status: wp ? checkoutStatus : "unknown",
      message:
        checkoutStatus === "operational"
          ? "Card, bank transfer, Zelle and coupon routes are ready."
          : wp
            ? "One or more checkout routes or gateways need attention."
            : "Checkout monitoring is not configured.",
      latencyMs: maxLatency(
        phaseoneNamespace,
        phaseNamespace,
        paymentHealth,
        paymentGateways,
      ),
      criticality: "critical",
      monitorType: "readiness",
      scope:
        "Validates gateway configuration and safe endpoints without creating a charge or order.",
      checks: {
        passed:
          checkoutRoutesPassed + Number(gatewaysReady) + Number(paymentPluginReady),
        total: checkoutRoutesTotal + 2,
      },
      checkedAt,
    }),
  );

  const orderDataValid = orders.ok && Array.isArray(orders.data);
  const shipstationReady = Boolean(
    shipstationRoutes && Object.keys(shipstationRoutes).length > 1,
  );
  const orderStatus = !wooAuthReady
    ? "unknown"
    : orderDataValid && shipstationReady
      ? "operational"
      : orderDataValid || shipstationReady
        ? "degraded"
        : "outage";
  services.push(
    service({
      id: "orders",
      name: "Orders, tracking & shipping",
      group: "Commerce",
      status: orderStatus,
      message:
        orderStatus === "operational"
          ? "Order access, tracking and shipping integration routes are ready."
          : orderStatus === "unknown"
            ? "Secure order monitoring credentials are not configured."
            : "Order or shipping integration readiness needs attention.",
      latencyMs: maxLatency(orders, shipstationNamespace),
      criticality: "high",
      monitorType: "readiness",
      scope:
        "Validates WooCommerce and shipping handoff readiness; carrier networks require independent monitoring.",
      checkedAt,
    }),
  );

  const accountRouteCheck = hasRoutes(labRoutes, [
    "/lab/v1/login",
    "/lab/v1/register",
    "/lab/v1/account-token",
    "/lab/v1/redeem-points",
    "/lab/v1/store-credit",
    "/lab/v1/forgot-password",
  ]);
  const accountPasswordCheck = hasRoutes(phaseoneRoutes, [
    "/phaseone/v1/account/request-password-reset",
    "/phaseone/v1/account/set-password",
  ]);
  const accountPassed = accountRouteCheck.passed + accountPasswordCheck.passed;
  const accountTotal = accountRouteCheck.total + accountPasswordCheck.total;
  services.push(
    service({
      id: "accounts",
      name: "Accounts & rewards",
      group: "Customer services",
      status:
        accountPassed === accountTotal
          ? "operational"
          : accountPassed > 0
            ? "degraded"
            : labNamespace.configured
              ? "outage"
              : "unknown",
      message:
        accountPassed === accountTotal
          ? "Login, password recovery, rewards and store-credit routes are ready."
          : "One or more customer account routes need attention.",
      latencyMs: maxLatency(labNamespace, phaseoneNamespace),
      criticality: "high",
      monitorType: "readiness",
      checks: { passed: accountPassed, total: accountTotal },
      checkedAt,
    }),
  );

  const coaRecords = extractArray(coa.data, ["records", "coas", "data"]);
  const coaHistoryRecords = extractArray(coaHistory.data, [
    "records",
    "coas",
    "data",
  ]);
  const coaCurrentValid = coa.ok && Array.isArray(coaRecords);
  const coaHistoryValid =
    coaHistory.ok && Array.isArray(coaHistoryRecords);
  const coaStatus =
    coaCurrentValid && coaHistoryValid
      ? "operational"
      : coaCurrentValid || coaHistoryValid
        ? "degraded"
        : unavailableStatus(coa);
  services.push(
    service({
      id: "coa",
      name: "COA document library",
      group: "Customer services",
      status: coaStatus,
      message: coaStatus === "operational"
        ? "Current and archived certificate data are accessible."
        : coa.configured
          ? "COA data could not be verified."
          : "COA monitoring is not configured.",
      latencyMs: maxLatency(coa, coaHistory),
      monitorType: "live",
      checks: {
        passed: Number(coaCurrentValid) + Number(coaHistoryValid),
        total: 2,
      },
      checkedAt,
    }),
  );

  services.push(
    service({
      id: "verification",
      name: "Military verification",
      group: "Customer services",
      status: verifyPass.ok ? "operational" : unavailableStatus(verifyPass),
      message: verifyPass.ok
        ? "The external eligibility verification portal is reachable."
        : "The eligibility verification portal could not be reached.",
      latencyMs: verifyPass.latencyMs,
      monitorType: "external_availability",
      checkedAt,
    }),
  );

  const restockItems = extractArray(restocks.data, ["items", "restocks", "data"]);
  const subscribeRoute = hasRoutes(phaseRoutes, [
    "/phase/v1/restock-subscribe",
  ]);
  const restockDataValid = restocks.ok && Array.isArray(restockItems);
  const restockStatus =
    restockDataValid && subscribeRoute.passed === subscribeRoute.total
      ? "operational"
      : restockDataValid || subscribeRoute.passed > 0
        ? "degraded"
        : unavailableStatus(restocks);
  services.push(
    service({
      id: "restocks",
      name: "Restocks & alerts",
      group: "Customer services",
      status: restockStatus,
      message:
        restockStatus === "operational"
          ? "Restock updates and alert subscriptions are ready."
          : "Restock updates or alert subscriptions need attention.",
      latencyMs: maxLatency(restocks, phaseNamespace),
      monitorType: "live_and_readiness",
      checkedAt,
    }),
  );

  const storefrontScriptsReady = googleAds.ok && omnisendLauncher.ok;
  const storefrontScriptsStatus = storefrontScriptsReady
    ? "operational"
    : googleAds.ok || omnisendLauncher.ok
      ? "degraded"
      : "outage";
  services.push(
    service({
      id: "storefront-scripts",
      name: "Storefront integrations",
      group: "Communications & growth",
      status: storefrontScriptsStatus,
      message: storefrontScriptsReady
        ? "Analytics and customer messaging scripts are reachable."
        : "One or more supporting storefront scripts could not be reached.",
      latencyMs: maxLatency(googleAds, omnisendLauncher),
      monitorType: "external_availability",
      criticality: "medium",
      checkedAt,
    }),
  );

  const agreementsReady =
    agreements.ok &&
    agreements.data?.active === true &&
    agreements.data?.woocommerce === true &&
    agreements.data?.wp_mail === true;
  services.push(
    service({
      id: "agreements",
      name: "Signed agreements",
      group: "Customer services",
      status: agreementsReady
        ? "operational"
        : unavailableStatus(agreements),
      message: agreementsReady
        ? "Agreement storage and WordPress email capability are ready."
        : "Signed-agreement processing could not be verified.",
      latencyMs: agreements.latencyMs,
      monitorType: "readiness",
      scope: "Email capability is checked without sending a customer message.",
      checkedAt,
    }),
  );

  const omnisendReady =
    omnisend.ok &&
    isObject(omnisend.data) &&
    Array.isArray(omnisend.data.contacts);
  services.push(
    service({
      id: "communications",
      name: "Email & notifications",
      group: "Communications & growth",
      status: omnisendReady ? "operational" : unavailableStatus(omnisend),
      message: omnisendReady
        ? "The email provider is reachable with read-only access."
        : omnisend.configured
          ? "The email provider could not be verified."
          : "Email provider monitoring is not configured.",
      latencyMs: omnisend.latencyMs,
      monitorType: "live_read_only",
      checkedAt,
    }),
  );

  const affiliateReady =
    affiliate.ok &&
    affiliate.data?.ok === true &&
    affiliate.data?.post_type_exists === true &&
    affiliate.data?.tracking_endpoint_exists === true;
  const couponReady = coupon.ok && coupon.data?.success === true;
  const affiliateStatus =
    affiliateReady && couponReady
      ? "operational"
      : affiliateReady || couponReady
        ? "degraded"
        : unavailableStatus(affiliate);
  services.push(
    service({
      id: "affiliates",
      name: "Affiliates & coupons",
      group: "Communications & growth",
      status: affiliateStatus,
      message:
        affiliateStatus === "operational"
          ? "Affiliate tracking and coupon validation are ready."
          : "Affiliate or coupon services need attention.",
      latencyMs: maxLatency(affiliate, coupon),
      monitorType: "live_and_readiness",
      checkedAt,
    }),
  );

  const feedItems = extractArray(feed.data, ["products", "items", "data"]);
  const feedValid = feed.ok && (Array.isArray(feedItems) || isObject(feed.data));
  const customOrderRoute = hasRoutes(phaseRoutes, [
    "/phase/v1/custom-order-request",
  ]);
  const automationStatus =
    feedValid && customOrderRoute.passed === customOrderRoute.total
      ? "operational"
      : feedValid || customOrderRoute.passed > 0
        ? "degraded"
        : unavailableStatus(feed);
  services.push(
    service({
      id: "automations",
      name: "Product feed & custom requests",
      group: "Communications & growth",
      status: automationStatus,
      message:
        automationStatus === "operational"
          ? "Product feed and custom-order request routes are ready."
          : "Product feed or custom-order request readiness needs attention.",
      latencyMs: maxLatency(feed, phaseNamespace),
      monitorType: "live_and_readiness",
      checkedAt,
    }),
  );

  const maintenance = getMonthlyWindow(
    new Date(checkedAt),
    config,
    platformMaintenance,
  );
  const automaticIncidents = buildAutomaticIncidents(services, checkedAt);
  const configuredActiveIncidents = STATUS_INCIDENT_HISTORY.filter(
    (incident) => incident.status !== "resolved",
  );
  const incidentHistory = STATUS_INCIDENT_HISTORY.filter(
    (incident) => incident.status === "resolved",
  );
  const activeIncidents = [
    ...configuredActiveIncidents,
    ...automaticIncidents,
  ];
  const overall = makeOverallStatus(services, maintenance);

  return {
    status: overall.status,
    overall,
    generatedAt: checkedAt,
    refreshAfterSeconds: Math.round(CACHE_TTL_MS / 1000),
    stale: false,
    summary: summarize(services, activeIncidents),
    services,
    components: services,
    activeIncidents,
    incidents: {
      active: activeIncidents,
      history: incidentHistory,
    },
    maintenance,
    scheduledMaintenances: [maintenance],
    maintenanceHistory: STATUS_MAINTENANCE_HISTORY,
    monitoringNotice:
      "Readiness checks never create orders, charges, subscriptions or customer messages.",
  };
}

function staleSnapshot(snapshot) {
  const generatedAt = new Date(snapshot?.generatedAt || 0).getTime();
  const ageSeconds = Number.isFinite(generatedAt)
    ? Math.max(0, Math.round((Date.now() - generatedAt) / 1000))
    : null;

  return {
    ...snapshot,
    status: "unknown",
    overall: {
      status: "unknown",
      title: "Status data temporarily delayed",
      message: "The last verified snapshot is being shown while checks recover.",
    },
    stale: true,
    staleAgeSeconds: ageSeconds,
  };
}

export async function getStatusSnapshot({ force = false } = {}) {
  const now = Date.now();

  if (!force && statusState.snapshot && now < statusState.expiresAt) {
    return statusState.snapshot;
  }

  if (statusState.inFlight) return statusState.inFlight;

  statusState.inFlight = buildStatusSnapshot()
    .then((snapshot) => {
      statusState.snapshot = snapshot;
      statusState.expiresAt = Date.now() + CACHE_TTL_MS;
      return snapshot;
    })
    .catch(() => {
      if (statusState.snapshot) return staleSnapshot(statusState.snapshot);

      const generatedAt = new Date().toISOString();
      return {
        status: "unknown",
        overall: {
          status: "unknown",
          title: "Status temporarily unavailable",
          message: "The monitor could not complete its checks.",
        },
        generatedAt,
        stale: true,
        summary: {
          total: 0,
          operational: 0,
          degraded: 0,
          outage: 0,
          maintenance: 0,
          unknown: 0,
          activeIncidents: 0,
        },
        services: [],
        components: [],
        activeIncidents: [],
        incidents: { active: [], history: [] },
        maintenance: getMonthlyWindow(new Date(), getConfiguration()),
        scheduledMaintenances: [],
        maintenanceHistory: STATUS_MAINTENANCE_HISTORY,
      };
    })
    .finally(() => {
      statusState.inFlight = null;
    });

  return statusState.inFlight;
}
