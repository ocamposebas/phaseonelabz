import type { APIRoute } from "astro";
import {
  BULK_SESSION_COOKIE,
  bulkCookie,
  clearBulkCookies,
  jsonResponse,
  originAllowed,
  publicBulkData,
  wordpressBulkRequest,
} from "../../../lib/bulkServer";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/session", request, { session: true, auth: true });
    const token = String(result.data.token || "");
    const cookies = result.status === 401 || result.status === 403
      ? clearBulkCookies(request)
      : token
        ? [bulkCookie(request, BULK_SESSION_COOKIE, token, Number(result.data.max_age || 1))]
        : [];
    return jsonResponse(publicBulkData(result.data), result.status, cookies);
  } catch (error) {
    console.error("Bulk session check failed", error);
    return jsonResponse({ success: false, error: "Bulk access is temporarily unavailable." }, 502);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!originAllowed(request)) return jsonResponse({ success: false, error: "Origin not allowed." }, 403);
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/session", request, {
      method: "DELETE",
      session: true,
    });
    return jsonResponse(result.data, result.status, clearBulkCookies(request));
  } catch {
    return jsonResponse({ success: true }, 200, clearBulkCookies(request));
  }
};
