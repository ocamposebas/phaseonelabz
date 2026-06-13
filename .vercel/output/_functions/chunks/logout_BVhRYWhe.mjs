const prerender = false;
const COOKIE_NAME = "lab_auth_token";
const REQUEST_TIMEOUT_MS = 8e3;
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
function clearAuthCookie(cookies) {
  cookies.delete(COOKIE_NAME, {
    path: "/"
  });
  cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0
  });
}
async function POST({ cookies }) {
  const token = cookies.get(COOKIE_NAME)?.value;
  const cleanUrl = getCleanWooUrl();
  clearAuthCookie(cookies);
  if (token && cleanUrl) {
    try {
      await fetchWithTimeout(`${cleanUrl}/wp-json/lab/v1/logout-token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Lab Account Logout"
        }
      });
    } catch (error) {
    }
  }
  return jsonResponse({
    success: true
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
