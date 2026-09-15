export const prerender = false;

function optionalSessionResponse() {
  return new Response("null", {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function GET({ cookies, request }) {
  const WOO_URL = import.meta.env.WOOCOMMERCE_URL2;
  const optionalSession = new URL(request.url).searchParams.get("optional") === "1";
  const bearerToken = String(request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const token = cookies.get("lab_auth_token")?.value || bearerToken;

  if (!WOO_URL) {
    return new Response(
      JSON.stringify({
        error: "Missing WOOCOMMERCE_URL2 environment variable.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!token) {
    if (optionalSession) return optionalSessionResponse();

    return new Response(
      JSON.stringify({
        error: "Not authenticated.",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const cleanUrl = WOO_URL.replace(/\/$/, "");

    const response = await fetch(`${cleanUrl}/wp-json/lab/v1/account-token`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (optionalSession && (response.status === 401 || response.status === 403)) {
        return optionalSessionResponse();
      }

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to load account data.",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
