export const prerender = false;

const COOKIE_NAME = "lab_auth_token";
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 200;
const REQUEST_TIMEOUT_MS = 10000;

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

export async function POST({ request, cookies }) {
  const cleanUrl = getCleanWooUrl();

  if (!cleanUrl) {
    return jsonResponse(
      {
        success: false,
        error: "Login service is not configured.",
      },
      500
    );
  }

  if (!isLikelyJson(request)) {
    return jsonResponse(
      {
        success: false,
        error: "Invalid request format.",
      },
      415
    );
  }

  const body = await readJsonBody(request);

  if (!body) {
    return jsonResponse(
      {
        success: false,
        error: "Invalid request body.",
      },
      400
    );
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  const password = String(body.password || "");

  if (!email || !password) {
    return jsonResponse(
      {
        success: false,
        error: "Email and password are required.",
      },
      400
    );
  }

  if (!isValidEmail(email)) {
    return jsonResponse(
      {
        success: false,
        error: "Please enter a valid email address.",
      },
      400
    );
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return jsonResponse(
      {
        success: false,
        error: "Invalid email or password.",
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
        "User-Agent": "Lab Account Login",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    const token =
      data?.token ||
      data?.auth_token ||
      data?.access_token ||
      data?.jwt ||
      data?.session_token ||
      "";

    if (!response.ok || !token) {
      return jsonResponse(
        {
          success: false,
          error:
            data?.message ||
            data?.error ||
            "Invalid email or password.",
        },
        401
      );
    }

    cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return jsonResponse(
      {
        success: true,

        /*
          IMPORTANT:
          We return the token so the React account page can save it in localStorage.
          The cookie is also set server-side for API routes.
        */
        token,

        user: {
          id: data.user?.id,
          name: data.user?.name || data.user?.displayName || "",
          displayName: data.user?.displayName || data.user?.name || "",
          email: data.user?.email || email,

          firstName:
            data.user?.firstName ||
            data.user?.first_name ||
            data.user?.billing_first_name ||
            "",
          first_name:
            data.user?.first_name ||
            data.user?.firstName ||
            data.user?.billing_first_name ||
            "",

          lastName:
            data.user?.lastName ||
            data.user?.last_name ||
            data.user?.billing_last_name ||
            "",
          last_name:
            data.user?.last_name ||
            data.user?.lastName ||
            data.user?.billing_last_name ||
            "",

          phone:
            data.user?.phone ||
            data.user?.billing_phone ||
            "",

          address1:
            data.user?.address1 ||
            data.user?.address_1 ||
            data.user?.billing_address_1 ||
            "",
          address_1:
            data.user?.address_1 ||
            data.user?.address1 ||
            data.user?.billing_address_1 ||
            "",

          address2:
            data.user?.address2 ||
            data.user?.address_2 ||
            data.user?.billing_address_2 ||
            "",
          address_2:
            data.user?.address_2 ||
            data.user?.address2 ||
            data.user?.billing_address_2 ||
            "",

          city:
            data.user?.city ||
            data.user?.billing_city ||
            "",
          state:
            data.user?.state ||
            data.user?.billing_state ||
            "",
          postcode:
            data.user?.postcode ||
            data.user?.zip ||
            data.user?.billing_postcode ||
            "",
          zip:
            data.user?.zip ||
            data.user?.postcode ||
            data.user?.billing_postcode ||
            "",
          country:
            data.user?.country ||
            data.user?.billing_country ||
            "US",

          points: Number(
            data.user?.points ||
              data.user?.pointsBalance ||
              data.user?.points_balance ||
              0
          ),
          pointsBalance: Number(
            data.user?.pointsBalance ||
              data.user?.points ||
              data.user?.points_balance ||
              0
          ),
          points_balance: Number(
            data.user?.points_balance ||
              data.user?.pointsBalance ||
              data.user?.points ||
              0
          ),

          store_credit: Number(
            data.user?.store_credit ||
              data.user?.storeCredit ||
              data.user?.credit ||
              0
          ),
          storeCredit: Number(
            data.user?.storeCredit ||
              data.user?.store_credit ||
              data.user?.credit ||
              0
          ),
          credit: Number(
            data.user?.credit ||
              data.user?.store_credit ||
              data.user?.storeCredit ||
              0
          ),

          redemptions:
            data.user?.redemptions ||
            data.user?.store_credit_redemptions ||
            data.user?.storeCreditRedemptions ||
            [],
        },

        expires_at: data.expires_at || null,
      },
      200
    );
  } catch (error) {
    const isAbortError = error?.name === "AbortError";

    return jsonResponse(
      {
        success: false,
        error: isAbortError
          ? "Login request timed out. Please try again."
          : "Login request failed. Please try again.",
        details: error?.message || "",
      },
      500
    );
  }
}