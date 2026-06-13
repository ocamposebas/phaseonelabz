export const prerender = false;

function cleanUrl(value = "") {
  return String(value || "").replace(/\/$/, "");
}

function getCookieValue(cookieHeader = "", name = "") {
  if (!cookieHeader || !name) return "";

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  const target = cookies.find((cookie) =>
    cookie.toLowerCase().startsWith(`${name.toLowerCase()}=`)
  );

  if (!target) return "";

  return decodeURIComponent(target.split("=").slice(1).join("="));
}

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader) return "";

  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function normalizeAccountResponse(data = {}) {
  const user = data.user || data.customer || data;

  return {
    authenticated: true,
    user: {
      id: user.id || user.customer_id || data.id || data.customer_id || null,
      customer_id: user.customer_id || user.id || data.customer_id || data.id || null,

      name: user.name || user.displayName || data.name || "",
      displayName: user.displayName || user.name || data.name || "",

      email: user.email || data.email || "",

      firstName:
        user.firstName ||
        user.first_name ||
        user.billing_first_name ||
        data.firstName ||
        data.first_name ||
        "",
      first_name:
        user.first_name ||
        user.firstName ||
        user.billing_first_name ||
        data.first_name ||
        data.firstName ||
        "",

      lastName:
        user.lastName ||
        user.last_name ||
        user.billing_last_name ||
        data.lastName ||
        data.last_name ||
        "",
      last_name:
        user.last_name ||
        user.lastName ||
        user.billing_last_name ||
        data.last_name ||
        data.lastName ||
        "",

      phone:
        user.phone ||
        user.billing_phone ||
        data.phone ||
        data.billing_phone ||
        "",

      address1:
        user.address1 ||
        user.address_1 ||
        user.billing_address_1 ||
        data.address1 ||
        data.address_1 ||
        data.billing_address_1 ||
        "",
      address_1:
        user.address_1 ||
        user.address1 ||
        user.billing_address_1 ||
        data.address_1 ||
        data.address1 ||
        data.billing_address_1 ||
        "",

      address2:
        user.address2 ||
        user.address_2 ||
        user.billing_address_2 ||
        data.address2 ||
        data.address_2 ||
        data.billing_address_2 ||
        "",
      address_2:
        user.address_2 ||
        user.address2 ||
        user.billing_address_2 ||
        data.address_2 ||
        data.address2 ||
        data.billing_address_2 ||
        "",

      city: user.city || user.billing_city || data.city || data.billing_city || "",
      state: user.state || user.billing_state || data.state || data.billing_state || "",
      postcode:
        user.postcode ||
        user.zip ||
        user.billing_postcode ||
        data.postcode ||
        data.zip ||
        data.billing_postcode ||
        "",
      zip:
        user.zip ||
        user.postcode ||
        user.billing_postcode ||
        data.zip ||
        data.postcode ||
        data.billing_postcode ||
        "",
      country:
        user.country ||
        user.billing_country ||
        data.country ||
        data.billing_country ||
        "US",

      points: Number(user.points || user.pointsBalance || user.points_balance || data.points || 0),
      pointsBalance: Number(
        user.pointsBalance || user.points || user.points_balance || data.pointsBalance || data.points || 0
      ),
      points_balance: Number(
        user.points_balance || user.pointsBalance || user.points || data.points_balance || data.points || 0
      ),

      storeCredit: Number(
        user.storeCredit ||
          user.store_credit ||
          user.credit ||
          data.storeCredit ||
          data.store_credit ||
          data.credit ||
          0
      ),
      store_credit: Number(
        user.store_credit ||
          user.storeCredit ||
          user.credit ||
          data.store_credit ||
          data.storeCredit ||
          data.credit ||
          0
      ),
      credit: Number(
        user.credit ||
          user.store_credit ||
          user.storeCredit ||
          data.credit ||
          data.store_credit ||
          data.storeCredit ||
          0
      ),

      redemptions:
        user.redemptions ||
        user.store_credit_redemptions ||
        user.storeCreditRedemptions ||
        data.redemptions ||
        data.store_credit_redemptions ||
        [],

      recent_orders: user.recent_orders || data.recent_orders || [],
    },
  };
}

export async function GET({ request }) {
  const WOO_URL =
    import.meta.env.WOOCOMMERCE_URL2 ||
    import.meta.env.WOOCOMMERCE_URL ||
    import.meta.env.PUBLIC_WOOCOMMERCE_URL;

  if (!WOO_URL) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        user: null,
        error: "Missing WooCommerce/WordPress URL environment variable.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const cookieHeader = request.headers.get("cookie") || "";

    const tokenFromAuthorization = getBearerToken(request);

    const tokenFromCookie =
      getCookieValue(cookieHeader, "lab_auth_token") ||
      getCookieValue(cookieHeader, "lab_token") ||
      getCookieValue(cookieHeader, "auth_token");

    const token = tokenFromAuthorization || tokenFromCookie;

    if (!token) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          user: null,
          message: "Not authenticated.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const cleanWooUrl = cleanUrl(WOO_URL);

    /*
      IMPORTANT:
      Your rewards plugin already uses this endpoint for token auth.
      Do not call /account-me here.
    */
    const response = await fetch(`${cleanWooUrl}/wp-json/lab/v1/account-token`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          user: null,
          error:
            data?.message ||
            data?.error ||
            data?.code ||
            "Invalid or expired token.",
          details: data,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return new Response(JSON.stringify(normalizeAccountResponse(data)), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        user: null,
        error: "Could not load account.",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}