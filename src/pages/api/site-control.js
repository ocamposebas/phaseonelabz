import { getSiteControlConfig } from "../../lib/siteControl.js";

export const prerender = false;

export async function GET() {
  const siteControl = await getSiteControlConfig();

  return new Response(JSON.stringify(siteControl), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
