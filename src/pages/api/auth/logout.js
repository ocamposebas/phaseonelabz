export const prerender = false;

const COOKIE_NAME = "lab_auth_token";
const REQUEST_TIMEOUT_MS = 8000;

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
  const WOO_URL = import.meta.env.WOOCOMMERCE_URL2;

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
  cookies.delete(COOKIE_NAME, {
    path: "/",
  });

  /**
   * Extra defensive delete:
   * Some browsers/envs can be picky if cookie attributes changed between versions.
   */
  cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function POST({ cookies }) {
  const token = cookies.get(COOKIE_NAME)?.value;
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