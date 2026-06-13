export const prerender = false;

export async function GET() {
  const WOO_URL = import.meta.env.WOOCOMMERCE_URL;
  const DEV_SECRET = import.meta.env.LAB_POINTS_DEV_SECRET;
  const USER_ID = import.meta.env.LAB_POINTS_TEST_USER_ID;

  if (!WOO_URL || !DEV_SECRET || !USER_ID) {
    return new Response(
      JSON.stringify({
        error: "Missing environment variables.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const cleanUrl = WOO_URL.replace(/\/$/, "");

    const url = new URL(`${cleanUrl}/wp-json/lab/v1/account-dev`);
    url.searchParams.set("secret", DEV_SECRET);
    url.searchParams.set("user_id", USER_ID);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Astro Account Points",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
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
        error: "Failed to fetch account points.",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}