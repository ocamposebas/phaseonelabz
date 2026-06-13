export const prerender = false;

export async function GET() {
  return new Response(
    JSON.stringify(
      {
        cwd: process.cwd(),
        WOOCOMMERCE_URL2: import.meta.env.WOOCOMMERCE_URL2 || null,
        WOOCOMMERCE_URL: import.meta.env.WOOCOMMERCE_URL || null,
        envKeys: Object.keys(import.meta.env).filter((key) =>
          key.includes("WOO")
        ),
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}