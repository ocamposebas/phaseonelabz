export const prerender = false;

export async function GET() {
  if (!import.meta.env.DEV) {
    return new Response(JSON.stringify({ error: "Not found." }), {
      status: 404,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new Response(
    JSON.stringify(
      {
        development: true,
        wordpressConfigured: Boolean(
          import.meta.env.WORDPRESS_URL ||
            import.meta.env.WOOCOMMERCE_URL2 ||
            import.meta.env.WOOCOMMERCE_URL,
        ),
        wooCredentialsConfigured: Boolean(
          import.meta.env.WOOCOMMERCE_CONSUMER_KEY &&
            import.meta.env.WOOCOMMERCE_CONSUMER_SECRET,
        ),
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
