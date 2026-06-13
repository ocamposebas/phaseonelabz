export const prerender = false;

export async function POST({ request, cookies }) {
  const WOO_URL = import.meta.env.WOOCOMMERCE_URL2;
  const token = cookies.get("lab_auth_token")?.value;

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
    const body = await request.json();
    const cleanUrl = WOO_URL.replace(/\/$/, "");

    const response = await fetch(`${cleanUrl}/wp-json/lab/v1/redeem-points`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
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
        error: "Failed to redeem points.",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}