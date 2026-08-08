import {
  hasPrivateStatusAccess,
  isStatusAccessConfigured,
} from "../../../lib/statusAccess.js";
import { setMaintenanceMode } from "../../../lib/siteControl.js";

export const prerender = false;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function POST({ cookies, request }) {
  if (!isStatusAccessConfigured() || !hasPrivateStatusAccess(cookies)) {
    return jsonResponse({ error: "Private status access is required." }, 401);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return jsonResponse({ error: "A boolean enabled value is required." }, 400);
  }

  try {
    const siteControl = await setMaintenanceMode(body.enabled);
    return jsonResponse(siteControl);
  } catch (error) {
    return jsonResponse(
      { error: error?.message || "Maintenance mode could not be changed." },
      502,
    );
  }
}
