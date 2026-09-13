import type { APIRoute } from "astro";
import {
  BULK_INTENT_COOKIE,
  BULK_SESSION_COOKIE,
  bulkCookie,
  jsonResponse,
  originAllowed,
  publicBulkData,
  requestJson,
  wordpressBulkRequest,
} from "../../../lib/bulkServer";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!originAllowed(request)) return jsonResponse({ success: false, error: "Origin not allowed." }, 403);
  const body = await requestJson(request);
  const code = String(body?.code || "").trim();
  if (!code) return jsonResponse({ success: false, error: "Enter your Bulk access code." }, 400);

  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/access", request, {
      method: "POST",
      auth: true,
      body: { code },
    });
    const token = String(result.data.token || "");
    if (result.status >= 400 || !token) {
      return jsonResponse(publicBulkData(result.data), result.status);
    }
    return jsonResponse(publicBulkData(result.data), result.status, [
      bulkCookie(request, BULK_SESSION_COOKIE, token, Number(result.data.max_age || 1)),
      bulkCookie(request, BULK_INTENT_COOKIE, "", 0),
    ]);
  } catch (error) {
    console.error("Bulk access failed", error);
    return jsonResponse({ success: false, error: "Bulk access is temporarily unavailable." }, 502);
  }
};
