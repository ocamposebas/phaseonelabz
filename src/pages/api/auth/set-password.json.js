export const prerender = false;

function sendJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function POST({ request }) {
  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return sendJson(
        {
          ok: false,
          message: "Invalid JSON body.",
        },
        400
      );
    }

    const login = String(body?.login || "").trim();
    const key = String(body?.key || "").trim();
    const password = String(body?.password || "");

    if (!login || !key || !password) {
      return sendJson(
        {
          ok: false,
          message: "Missing login, key, or password.",
        },
        400
      );
    }

    if (password.length < 8) {
      return sendJson(
        {
          ok: false,
          message: "Password must be at least 8 characters.",
        },
        400
      );
    }

    const wpSiteUrl = import.meta.env.PUBLIC_WP_SITE_URL;
    const bridgeSecret = import.meta.env.PHASEONE_AFFILIATE_BRIDGE_SECRET;

    if (!wpSiteUrl) {
      return sendJson(
        {
          ok: false,
          message: "PUBLIC_WP_SITE_URL is missing on the server.",
        },
        500
      );
    }

    if (!bridgeSecret) {
      return sendJson(
        {
          ok: false,
          message: "PHASEONE_AFFILIATE_BRIDGE_SECRET is missing on the server.",
        },
        500
      );
    }

    const endpoint =
      String(wpSiteUrl).replace(/\/$/, "") +
      "/wp-json/phaseone/v1/account/set-password";

    const wpResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-PhaseOne-Secret": bridgeSecret,
      },
      body: JSON.stringify({
        login,
        key,
        password,
      }),
    });

    const rawText = await wpResponse.text();

    let data;

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = {
        ok: false,
        message: rawText || "Invalid WordPress response.",
      };
    }

    if (!wpResponse.ok) {
      return sendJson(
        {
          ok: false,
          message:
            data?.message ||
            data?.error ||
            `WordPress request failed with status ${wpResponse.status}.`,
          details: data,
        },
        wpResponse.status
      );
    }

    return sendJson(
      {
        ok: true,
        message:
          data?.message ||
          "Password created successfully. You can now access your affiliate portal.",
        portal_url: data?.portal_url || "/account",
        user_id: data?.user_id || null,
        email: data?.email || null,
      },
      200
    );
  } catch (error) {
    return sendJson(
      {
        ok: false,
        message: error?.message || "Password setup failed.",
      },
      500
    );
  }
}