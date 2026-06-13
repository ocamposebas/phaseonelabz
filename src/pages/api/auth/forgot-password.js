export const prerender = false;

const MAX_EMAIL_LENGTH = 254;
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

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function getCleanWpUrl() {
  const wpUrl =
    import.meta.env.WP_SITE_URL ||
    import.meta.env.PUBLIC_WP_SITE_URL ||
    import.meta.env.WOOCOMMERCE_URL2;

  if (!wpUrl) return null;

  return String(wpUrl).replace(/\/$/, "");
}

function getBridgeSecret() {
  return (
    import.meta.env.PHASEONE_AFFILIATE_BRIDGE_SECRET ||
    import.meta.env.WP_PHASEONE_AFFILIATE_BRIDGE_SECRET ||
    ""
  );
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function safeSuccess() {
  return jsonResponse(
    {
      success: true,
      ok: true,
      message:
        "If an account exists for this email, reset instructions will be sent.",
    },
    200
  );
}

export async function POST({ request }) {
  const body = await readJsonBody(request);

  if (!body) {
    return jsonResponse(
      {
        error: "Invalid request body.",
      },
      400
    );
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return jsonResponse(
      {
        error: "Email is required.",
      },
      400
    );
  }

  if (!isValidEmail(email)) {
    return jsonResponse(
      {
        error: "Please enter a valid email address.",
      },
      400
    );
  }

  const cleanUrl = getCleanWpUrl();
  const bridgeSecret = getBridgeSecret();

  if (!cleanUrl || !bridgeSecret) {
    return safeSuccess();
  }

  try {
    await fetchWithTimeout(
      `${cleanUrl}/wp-json/phaseone/v1/account/request-password-reset`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-PhaseOne-Secret": bridgeSecret,
          "User-Agent": "Phase One Labz Password Reset",
        },
        body: JSON.stringify({
          email,
        }),
      }
    );

    return safeSuccess();
  } catch {
    return safeSuccess();
  }
}