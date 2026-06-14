export const prerender = false;

const WORDPRESS_FEED_URL =
  "https://staging.phaseonelabz.com/wp-json/phaseone/v1/feed";

export async function GET() {
  try {
    const response = await fetch(WORDPRESS_FEED_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify(
          {
            success: false,
            message: "Could not fetch product feed.",
            status: response.status,
          },
          null,
          2
        ),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify(
        {
          success: false,
          message: "Product feed proxy error.",
          error: error?.message || "Unknown error",
        },
        null,
        2
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }
}