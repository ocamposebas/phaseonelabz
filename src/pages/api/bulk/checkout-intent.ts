import type { APIRoute } from "astro";
import {
  BULK_INTENT_COOKIE,
  bulkCookie,
  clearBulkCookies,
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
  if (!body || !Array.isArray(body.items)) return jsonResponse({ success: false, error: "Invalid Bulk cart." }, 400);
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/checkout-intent", request, {
      method: "POST",
      session: true,
      body: { items: body.items },
    });
    const token = String(result.data.token || "");
    if (result.status >= 400 || !token) return jsonResponse(publicBulkData(result.data), result.status);
    return jsonResponse(publicBulkData(result.data), result.status, [
      bulkCookie(request, BULK_INTENT_COOKIE, token, Number(result.data.max_age || 1)),
    ]);
  } catch (error) {
    console.error("Bulk checkout intent failed", error);
    return jsonResponse({ success: false, error: "Bulk checkout could not be prepared." }, 502);
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/checkout-intent", request, {
      session: true,
      intent: true,
    });
    const data = publicBulkData(result.data);
    delete data.customer_id;
    return jsonResponse(data, result.status, result.status === 401 ? clearBulkCookies(request) : []);
  } catch (error) {
    console.error("Bulk checkout intent lookup failed", error);
    return jsonResponse({ success: false, error: "Bulk checkout could not be loaded." }, 502);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!originAllowed(request)) return jsonResponse({ success: false, error: "Origin not allowed." }, 403);
  return jsonResponse({ success: true }, 200, [
    bulkCookie(request, BULK_INTENT_COOKIE, "", 0),
  ]);
};
