const prerender = false;
const MAX_EMAIL_LENGTH = 254;
const REQUEST_TIMEOUT_MS = 1e4;
function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  if (email.length > MAX_EMAIL_LENGTH) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isLikelyJson(request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType.toLowerCase().includes("application/json");
}
async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
function getCleanWooUrl() {
  const WOO_URL = "http://labone.local:10007";
  return WOO_URL.replace(/\/$/, "");
}
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
async function POST({ request }) {
  const cleanUrl = getCleanWooUrl();
  if (!cleanUrl) {
    return jsonResponse(
      {
        success: true,
        message: "If an account exists for this email, reset instructions will be sent."
      },
      200
    );
  }
  if (!isLikelyJson(request)) {
    return jsonResponse(
      {
        error: "Invalid request format."
      },
      415
    );
  }
  const body = await readJsonBody(request);
  if (!body) {
    return jsonResponse(
      {
        error: "Invalid request body."
      },
      400
    );
  }
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) {
    return jsonResponse(
      {
        error: "Email is required."
      },
      400
    );
  }
  if (!isValidEmail(email)) {
    return jsonResponse(
      {
        error: "Please enter a valid email address."
      },
      400
    );
  }
  try {
    await fetchWithTimeout(`${cleanUrl}/wp-json/lab/v1/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Lab Account Password Reset"
      },
      body: JSON.stringify({
        email
      })
    });
    return jsonResponse(
      {
        success: true,
        message: "If an account exists for this email, reset instructions will be sent."
      },
      200
    );
  } catch {
    return jsonResponse(
      {
        success: true,
        message: "If an account exists for this email, reset instructions will be sent."
      },
      200
    );
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
