export const prerender = false;

export async function POST({ request, cookies }) {
  const WOO_URL = import.meta.env.WOOCOMMERCE_URL2;

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

  try {
    const body = await request.json();

    const first_name = body.first_name;
    const last_name = body.last_name;
    const email = body.email;
    const password = body.password;

    if (!first_name || !last_name || !email || !password) {
      return new Response(
        JSON.stringify({
          error: "First name, last name, email, and password are required.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const cleanUrl = WOO_URL.replace(/\/$/, "");

    const response = await fetch(`${cleanUrl}/wp-json/lab/v1/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        first_name,
        last_name,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
      return new Response(
        JSON.stringify({
          error: data.message || "Registration failed.",
          details: data,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    cookies.set("lab_auth_token", data.token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: data.user,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Registration request failed.",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}