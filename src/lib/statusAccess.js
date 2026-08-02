import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const STATUS_ACCESS_COOKIE = "phaseone_status_session";

const SESSION_VERSION = "v1";
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const MINIMUM_PASSWORD_LENGTH = 12;

const BUILD_STATUS_ACCESS_PASSWORD = String(
  import.meta.env.STATUS_ACCESS_PASSWORD ||
    import.meta.env.PHASEONE_STATUS_PASSWORD ||
    "",
).trim();
const BUILD_STATUS_SESSION_SECRET = String(
  import.meta.env.STATUS_SESSION_SECRET || "",
).trim();

function getStatusPassword() {
  return String(
    process.env.STATUS_ACCESS_PASSWORD ||
      process.env.PHASEONE_STATUS_PASSWORD ||
      BUILD_STATUS_ACCESS_PASSWORD ||
      "",
  ).trim();
}

function getSessionSecret() {
  const configuredSecret = String(
    process.env.STATUS_SESSION_SECRET ||
      BUILD_STATUS_SESSION_SECRET ||
      "",
  ).trim();

  if (configuredSecret) return configuredSecret;

  const password = getStatusPassword();
  return password
    ? createHash("sha256")
        .update(`phaseone-private-status:${password}`, "utf8")
        .digest("hex")
    : "";
}

function digest(value) {
  return createHash("sha256").update(String(value), "utf8").digest();
}

function sign(payload) {
  return createHmac("sha256", getSessionSecret())
    .update(payload, "utf8")
    .digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isSecureRequest(request) {
  const forwardedProtocol = String(
    request?.headers?.get("x-forwarded-proto") || "",
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (forwardedProtocol === "https") return true;

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return import.meta.env.PROD;
  }
}

export function isStatusAccessConfigured() {
  return (
    getStatusPassword().length >= MINIMUM_PASSWORD_LENGTH &&
    getSessionSecret().length >= MINIMUM_PASSWORD_LENGTH
  );
}

export function verifyStatusPassword(candidate) {
  const expected = getStatusPassword();
  const supplied = String(candidate || "");

  if (!isStatusAccessConfigured() || !supplied) return false;
  return timingSafeEqual(digest(expected), digest(supplied));
}

export function createStatusSessionToken(now = Date.now()) {
  if (!isStatusAccessConfigured()) return "";

  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(18).toString("base64url");
  const payload = `${SESSION_VERSION}.${expiresAt}.${nonce}`;

  return `${payload}.${sign(payload)}`;
}

export function verifyStatusSessionToken(token, now = Date.now()) {
  if (!isStatusAccessConfigured()) return false;

  const parts = String(token || "").split(".");
  if (parts.length !== 4 || parts[0] !== SESSION_VERSION) return false;

  const [version, rawExpiresAt, nonce, suppliedSignature] = parts;
  const expiresAt = Number(rawExpiresAt);
  const nowSeconds = Math.floor(now / 1000);

  if (!Number.isInteger(expiresAt) || !nonce || !suppliedSignature) return false;
  if (expiresAt <= nowSeconds) return false;
  if (expiresAt > nowSeconds + SESSION_TTL_SECONDS + 60) return false;

  const payload = `${version}.${rawExpiresAt}.${nonce}`;
  return safeEqual(sign(payload), suppliedSignature);
}

export function hasPrivateStatusAccess(cookies) {
  return verifyStatusSessionToken(
    cookies.get(STATUS_ACCESS_COOKIE)?.value || "",
  );
}

export function grantPrivateStatusAccess(cookies, request) {
  const token = createStatusSessionToken();
  if (!token) return false;

  cookies.set(STATUS_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return true;
}

export function revokePrivateStatusAccess(cookies, request) {
  cookies.set(STATUS_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
