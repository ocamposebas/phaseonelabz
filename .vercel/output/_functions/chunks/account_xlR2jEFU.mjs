const prerender = false;
async function GET({ cookies }) {
  const WOO_URL = "http://labone.local:10007";
  const token = cookies.get("lab_auth_token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({
        error: "Not authenticated."
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    const cleanUrl = WOO_URL.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/wp-json/lab/v1/account-token`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to load account data.",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
