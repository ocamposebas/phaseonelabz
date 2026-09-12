export const prerender = false;

const REQUEST_TIMEOUT_MS = 15000;
const AUTH_COOKIE_NAMES = ["lab_auth_token", "lab_token", "auth_token"];

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getToken(request, cookies) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  return (
    bearer ||
    AUTH_COOKIE_NAMES.map((name) => cookies.get(name)?.value).find(Boolean) ||
    ""
  );
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function summarizeItems(items) {
  const availableIds = new Set();
  const productKeys = new Set();
  let latestDate = "";
  let latestTime = 0;

  items.forEach((item) => {
    productKeys.add(`${Number(item?.product_id || 0)}:${Number(item?.variation_id || 0)}`);
    if (item?.status !== "available" || !item?.coa) return;
    availableIds.add(String(item.coa.id || item.key));
    const testedTime = Date.parse(item.coa.testing_date || "");
    if (Number.isFinite(testedTime) && testedTime > latestTime) {
      latestTime = testedTime;
      latestDate = item.coa.testing_date;
    }
  });

  return {
    available_coas: availableIds.size,
    products_purchased: productKeys.size,
    most_recent_testing_date: latestDate,
  };
}

function preserveFulfillmentAssociations(items) {
  return items.map((item) => {
    if (item?.association !== "current_product") return item;

    return {
      ...item,
      status: "pending",
      association: "pending_fulfillment",
      lot: "",
      coa: null,
      message:
        "COA pending — lot information has not been assigned to this order.",
    };
  });
}

export async function GET({ request, cookies, url }) {
  const baseUrl = String(
    import.meta.env.WOOCOMMERCE_URL2 ||
      import.meta.env.WOOCOMMERCE_URL ||
      import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
      ""
  ).replace(/\/$/, "");
  const token = getToken(request, cookies);

  if (!baseUrl) {
    return jsonResponse({ error: "The account service is not configured." }, 500);
  }

  if (!token) {
    return jsonResponse({ error: "Your session has expired. Please sign in again." }, 401);
  }

  const upstreamUrl = new URL(`${baseUrl}/wp-json/phaseone/v1/account/coas`);
  const requestedOrder = String(url.searchParams.get("order") || "")
    .replace(/^#/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);

  if (requestedOrder) upstreamUrl.searchParams.set("order", requestedOrder);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Phase One Account COAs",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await readJson(response);

    if (!response.ok) {
      const status = response.status === 401 ? 401 : response.status === 404 ? 503 : 502;
      return jsonResponse(
        {
          error:
            data?.message ||
            data?.error ||
            (status === 503
              ? "The COA account service has not been activated yet."
              : "Your COAs are temporarily unavailable."),
        },
        status
      );
    }

    const rawItems = Array.isArray(data?.items) ? data.items : [];
    const items = preserveFulfillmentAssociations(rawItems);

    return jsonResponse({ items, summary: summarizeItems(items) }, 200);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return jsonResponse(
      {
        error: timedOut
          ? "The COA service took too long to respond. Please try again."
          : "Your COAs are temporarily unavailable.",
      },
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}
