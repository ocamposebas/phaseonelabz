export const prerender = false;

export async function POST({ request }) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const rawBody = await request.text();

    if (!rawBody) {
      return jsonResponse(
        {
          ok: false,
          message: "The request body is empty. The form is not sending data.",
          debug: {
            method: request.method,
            contentType,
            rawBody,
          },
        },
        400
      );
    }

    let body = null;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse(
        {
          ok: false,
          message: "Invalid JSON body received by Astro API.",
          debug: {
            contentType,
            rawBody,
          },
        },
        400
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const tokenFromHeader = authHeader.replace(/^Bearer\s+/i, "").trim();
    const tokenFromBody = String(body?.authToken || "").trim();
    const authToken = tokenFromHeader || tokenFromBody;

    const wordpressUrl =
      import.meta.env.WORDPRESS_URL ||
      import.meta.env.WOOCOMMERCE_URL2 ||
      import.meta.env.PUBLIC_WP_SITE_URL;

    const bridgeSecret = import.meta.env.PHASEONE_AFFILIATE_BRIDGE_SECRET;

    if (!wordpressUrl || !bridgeSecret) {
      return jsonResponse(
        {
          ok: false,
          message:
            "Affiliate bridge is not configured. Check WORDPRESS_URL and PHASEONE_AFFILIATE_BRIDGE_SECRET in .env.",
          env: {
            WORDPRESS_URL: Boolean(import.meta.env.WORDPRESS_URL),
            WOOCOMMERCE_URL2: Boolean(import.meta.env.WOOCOMMERCE_URL2),
            PUBLIC_WP_SITE_URL: Boolean(import.meta.env.PUBLIC_WP_SITE_URL),
            PHASEONE_AFFILIATE_BRIDGE_SECRET: Boolean(bridgeSecret),
          },
        },
        500
      );
    }

    const endpoint = `${String(wordpressUrl).replace(
      /\/$/,
      ""
    )}/wp-json/phaseone/v1/coupon-affiliate/apply`;

    const wpResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-PhaseOne-Secret": bridgeSecret,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        ...body,
        authToken,
      }),
    });

    const wpRawText = await wpResponse.text();

    let data = null;

    try {
      data = wpRawText ? JSON.parse(wpRawText) : null;
    } catch {
      data = null;
    }

    if (!wpResponse.ok) {
      return jsonResponse(
        {
          ok: false,
          message:
            data?.message ||
            data?.error ||
            wpRawText ||
            `WordPress returned status ${wpResponse.status}.`,
          debug: {
            endpoint,
            status: wpResponse.status,
            wpRawText,
            data,
          },
        },
        wpResponse.status
      );
    }

    return jsonResponse(
      {
        ok: true,
        message:
          data?.message ||
          "Application submitted successfully. It is pending review.",
        data,
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error?.message || "Application could not be submitted.",
        debug: {
          errorName: error?.name || null,
          errorStack: error?.stack || null,
        },
      },
      500
    );
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}