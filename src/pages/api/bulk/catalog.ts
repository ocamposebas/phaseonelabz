import type { APIRoute } from "astro";
import { clearBulkCookies, jsonResponse, wordpressBulkRequest } from "../../../lib/bulkServer";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/catalog", request, { session: true, auth: true });
    return jsonResponse(result.data, result.status, result.status === 401 || result.status === 403 ? clearBulkCookies(request) : []);
  } catch (error) {
    console.error("Bulk catalog failed", error);
    return jsonResponse({ success: false, error: "The Bulk catalog is temporarily unavailable." }, 502);
  }
};
