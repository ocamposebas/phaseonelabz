import { getReputation } from "../../lib/reputation.js";

export const prerender = false;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400",
};

export async function GET() {
  const payload = await getReputation();
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

