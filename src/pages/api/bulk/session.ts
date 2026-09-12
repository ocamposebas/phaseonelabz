import type { APIRoute } from "astro";
import {
  clearBulkCookies,
  jsonResponse,
  originAllowed,
  wordpressBulkRequest,
} from "../../../lib/bulkServer";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/session", request, { session: true });
    return jsonResponse(result.data, result.status, result.status === 401 ? clearBulkCookies(request) : []);
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
