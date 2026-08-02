import {
  grantPrivateStatusAccess,
  hasPrivateStatusAccess,
  isStatusAccessConfigured,
  revokePrivateStatusAccess,
  verifyStatusPassword,
} from "../../../lib/statusAccess.js";

export const prerender = false;

const MAX_BODY_BYTES = 4 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;

const accessAttempts =
  globalThis.__phaseoneStatusAccessAttempts || new Map();
globalThis.__phaseoneStatusAccessAttempts = accessAttempts;

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders,
    },
  });
}

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function pruneAttempts(now) {
  if (accessAttempts.size < 500) return;

  for (const [key, timestamps] of accessAttempts.entries()) {
    const recent = timestamps.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
    );

    if (recent.length) accessAttempts.set(key, recent);
    else accessAttempts.delete(key);
  }
}

function registerAttempt(request) {
  const now = Date.now();
  const key = getClientIp(request);
  const recent = (accessAttempts.get(key) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    accessAttempts.set(key, recent);
    return false;
  }

  recent.push(now);
  accessAttempts.set(key, recent);
  pruneAttempts(now);
  return true;
}

function clearAttempts(request) {
  accessAttempts.delete(getClientIp(request));
}

export async function GET({ cookies }) {
  return jsonResponse({
    configured: isStatusAccessConfigured(),
    authenticated: hasPrivateStatusAccess(cookies),
  });
}

export async function POST({ request, cookies }) {
  if (!isStatusAccessConfigured()) {
    return jsonResponse(
      {
        success: false,
        error: "Private status access is temporarily unavailable.",
      },
      503,
    );
  }

  if (!registerAttempt(request)) {
    return jsonResponse(
      {
        success: false,
        error: "Too many access attempts. Try again later.",
      },
      429,
      { "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) },
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse(
      { success: false, error: "Invalid request format." },
      415,
    );
  }

  const rawBody = await request.text();
  if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonResponse(
      { success: false, error: "Invalid access request." },
      400,
    );
  }

  let body = null;

  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }

  const password = typeof body?.password === "string" ? body.password : "";

  if (!verifyStatusPassword(password)) {
    return jsonResponse(
      { success: false, error: "Invalid access password." },
      401,
    );
  }

  if (!grantPrivateStatusAccess(cookies, request)) {
    return jsonResponse(
      {
        success: false,
        error: "Private status access is temporarily unavailable.",
      },
      503,
    );
  }

  clearAttempts(request);
  return jsonResponse({ success: true });
}

export async function DELETE({ request, cookies }) {
  revokePrivateStatusAccess(cookies, request);
  return jsonResponse({ success: true });
}
