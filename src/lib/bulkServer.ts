export const BULK_SESSION_COOKIE = "phaseone_bulk_session";
export const BULK_INTENT_COOKIE = "phaseone_bulk_intent";

const MAX_BODY_BYTES = 64 * 1024;

export function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  cookies: string[] = [],
): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  ).slice(0, 100);
}

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = String(import.meta.env.CHECKOUT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.length) return configured.includes(origin);
  return /^https:\/\/(www\.)?phaseonelabz\.com$/i.test(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
}

export function cookieValue(request: Request, name: string): string {
  const cookies = request.headers.get("cookie") || "";
  const match = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return "";
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return "";
  }
}

export function accountToken(request: Request): string {
  const bearer = (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (bearer) return bearer;
  for (const name of ["lab_auth_token", "lab_token", "auth_token"]) {
    const value = cookieValue(request, name);
    if (value) return value;
  }
  return "";
}

export function bulkCookie(
  request: Request,
  name: string,
  value: string,
  maxAge: number,
): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.max(0, Math.floor(maxAge))}; HttpOnly; SameSite=Lax${secure}`;
}

export function clearBulkCookies(request: Request): string[] {
  return [
    bulkCookie(request, BULK_SESSION_COOKIE, "", 0),
    bulkCookie(request, BULK_INTENT_COOKIE, "", 0),
  ];
}

export async function requestJson(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const raw = await request.text();
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

type WordpressOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  session?: boolean;
  intent?: boolean;
  auth?: boolean;
};

export async function wordpressBulkRequest(
  path: string,
  request: Request,
  options: WordpressOptions = {},
): Promise<{ data: Record<string, unknown>; status: number }> {
  const base = String(
    import.meta.env.WORDPRESS_API_URL ||
      import.meta.env.WOOCOMMERCE_URL ||
      import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
      "",
  ).trim().replace(/\/$/, "");
  const secret = String(import.meta.env.PRISM_CHECKOUT_SHARED_SECRET || "").trim();
  if (!base || !secret) {
    throw new Error("Bulk server integration is not configured.");
  }

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-PhaseOne-Checkout-Secret": secret,
    "X-PhaseOne-Client-IP": clientIp(request),
    "User-Agent": (request.headers.get("user-agent") || "Phase One Bulk").slice(0, 500),
  });
  if (options.session) {
    headers.set("X-PhaseOne-Bulk-Session", cookieValue(request, BULK_SESSION_COOKIE));
  }
  if (options.intent) {
    headers.set("X-PhaseOne-Bulk-Intent", cookieValue(request, BULK_INTENT_COOKIE));
  }
  if (options.auth) {
    const token = accountToken(request);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const method = options.method || "GET";
  const response = await fetch(`${base}/wp-json/${path.replace(/^\//, "")}`, {
    method,
    cache: "no-store",
    headers,
    body: method === "GET" ? undefined : JSON.stringify(options.body || {}),
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: "WordPress returned an invalid response." };
  }
  return { data, status: response.status };
}

export function publicBulkData(data: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...data };
  delete clean.token;
  delete clean.session_token;
  delete clean.intent_token;
  return clean;
}
