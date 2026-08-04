export const prerender = false;

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET({ cookies, request }) {
  const wordpressUrl = import.meta.env.WOOCOMMERCE_URL2;
  const authorization = request.headers.get("authorization") || "";
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const token = cookies.get("lab_auth_token")?.value || bearerToken;

  if (!wordpressUrl) return jsonError("WordPress is not configured.", 500);
  if (!token) return jsonError("Not authenticated.", 401);

  const url = new URL(request.url);
  const orderId = url.searchParams.get("order") || "";
  const evidenceId = url.searchParams.get("evidence") || "";

  if (!/^\d+$/.test(orderId) || !/^[a-f0-9-]{20,50}$/i.test(evidenceId)) {
    return jsonError("Invalid evidence request.", 400);
  }

  try {
    const cleanUrl = wordpressUrl.replace(/\/$/, "");
    const response = await fetch(
      `${cleanUrl}/wp-json/phaseone/v1/order-evidence/${encodeURIComponent(orderId)}/${encodeURIComponent(evidenceId)}`,
      {
        headers: {
          Accept: "image/jpeg,image/webp,image/png",
          Authorization: `Bearer ${token}`,
        },
        redirect: "error",
      }
    );

    if (!response.ok) {
      return jsonError(
        response.status === 403 || response.status === 404
          ? "Evidence image not found."
          : "Evidence image is temporarily unavailable.",
        response.status
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp)$/i.test(contentType)) {
      return jsonError("The evidence service returned an invalid file.", 502);
    }

    const imageBytes = await response.arrayBuffer();

    if (imageBytes.byteLength === 0) {
      return jsonError("The evidence service returned an empty file.", 502);
    }

    return new Response(imageBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(imageBytes.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return jsonError("Evidence image is temporarily unavailable.", 502);
  }
}
