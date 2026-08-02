import { getStatusSnapshot } from "../../../lib/statusMonitor.js";
import {
  hasPrivateStatusAccess,
  isStatusAccessConfigured,
} from "../../../lib/statusAccess.js";

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

export async function GET({ cookies }) {
  if (!isStatusAccessConfigured()) {
    return jsonResponse(
      {
        status: "unavailable",
        error: "Private status access is unavailable.",
      },
      503,
    );
  }

  if (!hasPrivateStatusAccess(cookies)) {
    return jsonResponse(
      {
        status: "unauthorized",
        error: "Private status access is required.",
      },
      401,
    );
  }

  try {
    const snapshot = await getStatusSnapshot();
    return jsonResponse(snapshot);
  } catch {
    return jsonResponse(
      {
        status: "unknown",
        overall: {
          status: "unknown",
          title: "Status temporarily unavailable",
          message: "The monitor could not complete its checks.",
        },
        generatedAt: new Date().toISOString(),
        stale: true,
      },
      503,
    );
  }
}
