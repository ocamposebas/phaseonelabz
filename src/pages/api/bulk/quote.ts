import type { APIRoute } from "astro";
import { jsonResponse, originAllowed, requestJson, wordpressBulkRequest } from "../../../lib/bulkServer";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!originAllowed(request)) return jsonResponse({ success: false, error: "Origin not allowed." }, 403);
  const body = await requestJson(request);
  if (!body || !Array.isArray(body.items)) {
    return jsonResponse({ success: false, error: "Invalid Bulk cart." }, 400);
  }
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/quote", request, {
      method: "POST",
      session: true,
      body: { items: body.items },
    });
    return jsonResponse(result.data, result.status);
  } catch (error) {
    console.error("Bulk quote failed", error);
    return jsonResponse({ success: false, error: "The Bulk quote is temporarily unavailable." }, 502);
  }
};
