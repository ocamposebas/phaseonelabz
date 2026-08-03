import { createHmac, randomBytes } from "node:crypto";

import { recordClientIssue } from "../../../lib/clientIssueStore.js";

export const prerender = false;

const MAX_BODY_BYTES = 4 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REPORTS = 30;

const rateState =
  globalThis.__phaseoneClientIssueRateState || {
    salt: randomBytes(24),
    reports: new Map(),
  };

globalThis.__phaseoneClientIssueRateState = rateState;

function response(status) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function getExpectedOrigin(request) {
  const forwardedProtocol = String(
    request.headers.get("x-forwarded-proto") || "",
  )
    .split(",")[0]
    .trim();
  const forwardedHost = String(
    request.headers.get("x-forwarded-host") || "",
  )
    .split(",")[0]
    .trim();

  try {
    const requestUrl = new URL(request.url);
    const protocol = forwardedProtocol || requestUrl.protocol.replace(":", "");
    const host = forwardedHost || request.headers.get("host") || requestUrl.host;
    return `${protocol}://${host}`.toLowerCase();
  } catch {
    return "";
  }
}

function isSameOrigin(request) {
  const origin = String(request.headers.get("origin") || "").toLowerCase();
  if (!origin || origin !== getExpectedOrigin(request)) return false;

  const fetchSite = String(request.headers.get("sec-fetch-site") || "")
    .trim()
    .toLowerCase();
  return !fetchSite || fetchSite === "same-origin";
}

function getRateKey(request) {
  const clientAddress =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return createHmac("sha256", rateState.salt)
    .update(clientAddress, "utf8")
    .digest("hex")
    .slice(0, 24);
}

function withinRateLimit(request, now) {
  const key = getRateKey(request);
  const recent = (rateState.reports.get(key) || []).filter(
    (timestamp) => now - timestamp <= RATE_WINDOW_MS,
  );

  if (recent.length >= RATE_MAX_REPORTS) {
    rateState.reports.set(key, recent);
    return false;
  }

  recent.push(now);
  rateState.reports.set(key, recent);

  if (rateState.reports.size > 500) {
    for (const [storedKey, timestamps] of rateState.reports.entries()) {
      if (!timestamps.some((timestamp) => now - timestamp <= RATE_WINDOW_MS)) {
        rateState.reports.delete(storedKey);
      }
    }
  }

  return true;
}

export async function POST({ request }) {
  if (!isSameOrigin(request)) return response(403);

  const contentType = String(request.headers.get("content-type") || "")
    .toLowerCase();
  if (!contentType.includes("application/json")) return response(415);

  const rawLength = Number(request.headers.get("content-length") || 0);
  if (rawLength > MAX_BODY_BYTES) return response(413);

  const rawBody = await request.text();
  if (
    !rawBody ||
    new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES
  ) {
    return response(400);
  }

  let payload = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = null;
  }

  if (!payload || typeof payload !== "object") return response(400);

  const now = Date.now();
  if (!withinRateLimit(request, now)) return response(429);
  if (!recordClientIssue(payload, now)) return response(400);

  return response(202);
}
