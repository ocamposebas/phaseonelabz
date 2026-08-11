export const prerender = false;

const AUTH_COOKIE_NAMES = ["lab_auth_token", "lab_token", "auth_token"];
const REQUEST_TIMEOUT_MS = 3000;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getCleanWooUrl() {
  const WOO_URL =
    import.meta.env.WOOCOMMERCE_URL2 ||
    import.meta.env.WOOCOMMERCE_URL ||
    import.meta.env.PUBLIC_WOOCOMMERCE_URL;

  if (!WOO_URL) {
    return null;
  }

  return WOO_URL.replace(/\/$/, "");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function clearAuthCookie(cookies) {
  for (const cookieName of AUTH_COOKIE_NAMES) {
    cookies.delete(cookieName, { path: "/" });

    /**
     * Extra defensive delete using the same attributes as login/register.
     */
    cookies.set(cookieName, "", {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

export async function POST({ request, cookies }) {
  const token =
    getBearerToken(request) ||
    AUTH_COOKIE_NAMES.map((name) => cookies.get(name)?.value).find(Boolean) ||
    "";
  const cleanUrl = getCleanWooUrl();

  /**
   * Always delete the local Astro cookie first.
   * Even if WordPress is down, the user should be logged out from Astro.
   */
  clearAuthCookie(cookies);

  if (token && cleanUrl) {
    try {
      await fetchWithTimeout(`${cleanUrl}/wp-json/lab/v1/logout-token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Lab Account Logout",
        },
      });
    } catch (error) {
      /**
       * Do not fail the logout if WordPress is unreachable.
       * Local cookie was already deleted.
       */
    }
  }

  return jsonResponse({
    success: true,
  });
}
