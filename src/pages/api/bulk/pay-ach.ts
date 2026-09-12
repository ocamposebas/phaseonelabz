import type { APIRoute } from "astro";
import {
  BULK_INTENT_COOKIE,
  BULK_SESSION_COOKIE,
  accountToken,
  cookieValue,
  jsonResponse,
  originAllowed,
  requestJson,
  wordpressBulkRequest,
} from "../../../lib/bulkServer";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!originAllowed(request)) return jsonResponse({ success: false, error: "Origin not allowed." }, 403);
  const body = await requestJson(request);
  if (!body || !accountToken(request)) return jsonResponse({ success: false, error: "You must be signed in to complete a Bulk order." }, 401);
  try {
    const result = await wordpressBulkRequest("phase/v1/create-edebit-order", request, {
      method: "POST",
      auth: true,
      body: {
        ...body,
        checkout_mode: "bulk",
        bulk_session_token: cookieValue(request, BULK_SESSION_COOKIE),
        bulk_intent_token: cookieValue(request, BULK_INTENT_COOKIE),
      },
    });
    return jsonResponse(result.data, result.status);
  } catch (error) {
    console.error("Bulk ACH checkout failed", error);
    return jsonResponse({ success: false, error: "Unable to start Bulk ACH checkout." }, 502);
  }
};
