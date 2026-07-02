export const prerender = false;

const WEBHOOK_TOKEN = import.meta.env.TAGADA_WEBHOOK_TOKEN;

export async function POST({ request, url }: { request: Request; url: URL }) {
  try {
    const token = url.searchParams.get("token");

    if (!WEBHOOK_TOKEN || token !== WEBHOOK_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized webhook request",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await request.json();

    console.log("✅ Tagada webhook received:", body);

    const eventType =
      body?.event ||
      body?.type ||
      body?.event_type ||
      body?.eventType ||
      null;

    const orderId =
      body?.order?.id ||
      body?.order_id ||
      body?.orderId ||
      body?.data?.order?.id ||
      null;

    const status =
      body?.order?.status ||
      body?.payment?.status ||
      body?.status ||
      null;

    console.log("Event Type:", eventType);
    console.log("Order ID:", orderId);
    console.log("Status:", status);

    if (
      eventType === "order/paid" ||
      eventType === "order.paid" ||
      eventType === "Order paid" ||
      status === "paid" ||
      status === "succeeded"
    ) {
      console.log("💰 Phase One Labz payment confirmed:", orderId);

      // Aquí después podemos hacer:
      // - actualizar orden en WooCommerce
      // - enviarte notificación
      // - mandar email al cliente
      // - guardar el pago como confirmado
    }

    return new Response(
      JSON.stringify({
        success: true,
        received: true,
        message: "Phase One Labz webhook received",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Phase One Labz webhook error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Webhook error",
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

export async function GET() {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Phase One Labz Tagada webhook endpoint is active",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}