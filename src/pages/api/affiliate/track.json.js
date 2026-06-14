export const prerender = false;

export async function POST({ request }) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const rawBody = await request.text();

    if (!rawBody) {
      return jsonResponse(
        {
          ok: false,
          message: "The request body is empty. No tracking data was sent.",
          debug: {
            method: request.method,
            contentType,
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
          message: "Invalid JSON body received by Astro tracking API.",
          debug: {
            contentType,
            rawBody,
          },
        },
        400
      );
    }

    const coupon = normalizeCouponCode(
      body?.coupon ||
        body?.couponCode ||
        body?.coupon_code ||
        body?.ref ||
        body?.promo ||
        ""
    );

    if (!coupon) {
      return jsonResponse(
        {
          ok: false,
          message: "Missing affiliate coupon code.",
          debug: {
            receivedBody: body,
          },
        },
        400
      );
    }

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
            "Affiliate tracking bridge is not configured. Check WORDPRESS_URL and PHASEONE_AFFILIATE_BRIDGE_SECRET in .env.",
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
    )}/wp-json/phaseone/v1/coupon-affiliate/track`;

    const wpResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-PhaseOne-Secret": bridgeSecret,
      },
      body: JSON.stringify({
        event: body?.event || "click",
        coupon,
        couponCode: coupon,
        visitorId: body?.visitorId || "",
        pageUrl: body?.pageUrl || "",
        referrer: body?.referrer || "",
        userAgent: body?.userAgent || "",
        occurredAt: body?.occurredAt || new Date().toISOString(),

        // Helpful server-side context.
        clientIp:
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "",
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
        message: data?.message || "Affiliate tracking event saved.",
        data,
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error?.message || "Affiliate tracking event could not be saved.",
        debug: {
          errorName: error?.name || null,
          errorStack: error?.stack || null,
        },
      },
      500
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
}

function normalizeCouponCode(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 32);
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}