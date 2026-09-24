import { getSiteControlConfig } from "../../lib/siteControl.js";

export const prerender = false;

const BROWSER_CACHE_CONTROL =
  "public, max-age=15, stale-while-revalidate=120, stale-if-error=3600";
const EDGE_CACHE_CONTROL =
  "public, s-maxage=30, stale-while-revalidate=300, stale-if-error=86400";

export async function GET({ url }) {
  const forceFresh = url.searchParams.get("fresh") === "1";
  const siteControl = await getSiteControlConfig({ force: forceFresh });

  const cacheHeaders = forceFresh
    ? {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
      }
    : {
        "Cache-Control": BROWSER_CACHE_CONTROL,
        "CDN-Cache-Control": EDGE_CACHE_CONTROL,
        "Vercel-CDN-Cache-Control": EDGE_CACHE_CONTROL,
      };

  return new Response(JSON.stringify(siteControl), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...cacheHeaders,
    },
  });
}
