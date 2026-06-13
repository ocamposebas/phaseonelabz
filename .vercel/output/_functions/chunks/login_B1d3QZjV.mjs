const prerender = false;
const COOKIE_NAME = "lab_auth_token";
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 200;
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
async function POST({ request, cookies }) {
  const cleanUrl = getCleanWooUrl();
  if (!cleanUrl) {
    return jsonResponse(
      {
        error: "Login service is not configured."
      },
      500
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
  const password = String(body.password || "");
  if (!email || !password) {
    return jsonResponse(
      {
        error: "Email and password are required."
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
  if (password.length > MAX_PASSWORD_LENGTH) {
    return jsonResponse(
      {
        error: "Invalid email or password."
      },
      401
    );
  }
  try {
    const response = await fetchWithTimeout(`${cleanUrl}/wp-json/lab/v1/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Lab Account Login"
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok || !data?.token) {
      return jsonResponse(
        {
          error: "Invalid email or password."
        },
        401
      );
    }
    cookies.set(COOKIE_NAME, data.token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return jsonResponse(
      {
        success: true,
        user: {
          id: data.user?.id,
          name: data.user?.name || "",
          email: data.user?.email || email,
          points: Number(data.user?.points || 0)
        }
      },
      200
    );
  } catch (error) {
    const isAbortError = error?.name === "AbortError";
    return jsonResponse(
      {
        error: isAbortError ? "Login request timed out. Please try again." : "Login request failed. Please try again."
      },
      500
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
