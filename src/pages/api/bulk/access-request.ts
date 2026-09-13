import type { APIRoute } from "astro";
import {
  accountToken,
  jsonResponse,
  originAllowed,
  requestJson,
  wordpressBulkRequest,
} from "../../../lib/bulkServer";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!originAllowed(request)) return jsonResponse({ success: false, error: "Origin not allowed." }, 403);
  if (!accountToken(request)) return jsonResponse({ success: false, error: "Sign in before requesting Bulk access." }, 401);
  const body = await requestJson(request);
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/access-request", request, {
      method: "POST",
      auth: true,
      body: { note: String(body?.note || "").slice(0, 1000) },
    });
    return jsonResponse(result.data, result.status);
  } catch (error) {
    console.error("Bulk access request failed", error);
    return jsonResponse({ success: false, error: "The Bulk access request could not be sent." }, 502);
  }
};
