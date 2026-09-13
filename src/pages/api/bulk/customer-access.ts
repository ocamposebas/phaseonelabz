import type { APIRoute } from "astro";
import { jsonResponse, wordpressBulkRequest } from "../../../lib/bulkServer";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/customer-access", request, { auth: true });
    return jsonResponse(result.data, result.status);
  } catch (error) {
    console.error("Bulk customer access lookup failed", error);
    return jsonResponse({ success: false, error: "Customer access information is temporarily unavailable." }, 502);
  }
};
