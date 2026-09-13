import type { APIRoute } from "astro";
import { jsonResponse, wordpressBulkRequest } from "../../../lib/bulkServer";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const result = await wordpressBulkRequest("phaseone/v1/bulk/program", request);
    return jsonResponse(result.data, result.status);
  } catch (error) {
    console.error("Bulk program details failed", error);
    return jsonResponse({ success: false, error: "Bulk program information is temporarily unavailable." }, 502);
  }
};
