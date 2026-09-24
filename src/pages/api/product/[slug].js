import { getProductPageData } from "../../../lib/productPageData.js";

export const prerender = false;

const BROWSER_CACHE_CONTROL =
  "public, max-age=60, stale-while-revalidate=900, stale-if-error=86400";
const EDGE_CACHE_CONTROL =
  "public, s-maxage=900, stale-while-revalidate=86400, stale-if-error=604800";
const NOT_FOUND_EDGE_CACHE_CONTROL =
  "public, s-maxage=120, stale-while-revalidate=300, stale-if-error=3600";

function jsonResponse(payload, status, edgeCacheControl = EDGE_CACHE_CONTROL) {
  const cacheable = status === 200 || status === 404;

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": cacheable
        ? BROWSER_CACHE_CONTROL
        : "no-store, no-cache, must-revalidate, private",
      ...(cacheable
        ? {
            "CDN-Cache-Control": edgeCacheControl,
            "Vercel-CDN-Cache-Control": edgeCacheControl,
          }
        : {}),
    },
  });
}

export async function GET({ params }) {
  const slug = String(params.slug || "").trim().toLowerCase();

  if (!slug || slug.length > 180 || !/^[a-z0-9-]+$/.test(slug)) {
    return jsonResponse({ error: "Invalid product slug." }, 400);
  }

  try {
    const pageData = await getProductPageData(slug);

    if (!pageData.product) {
      return jsonResponse(
        { error: "Product not found.", product: null, recommendedProducts: [] },
        404,
        NOT_FOUND_EDGE_CACHE_CONTROL,
      );
    }

    return jsonResponse({ success: true, ...pageData }, 200);
  } catch (error) {
    const isTimeout = error?.name === "AbortError";
    return jsonResponse(
      {
        error: isTimeout
          ? "Product service timed out."
          : "Product service is temporarily unavailable.",
      },
      503,
    );
  }
}
