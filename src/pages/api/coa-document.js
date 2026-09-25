export const prerender = false;

const ALLOWED_HOSTS = new Set([
  "staging.phaseonelabz.com",
  "coas.freedomdiagnosticstesting.com",
  "d2xsxph8kpxj0f.cloudfront.net",
  "files.ils-lab.com",
]);
const MAX_REDIRECTS = 3;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 12_000;
const SUCCESS_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400";
const ERROR_CACHE_CONTROL = "no-store, no-cache, must-revalidate, private";

class ProxyError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "ProxyError";
    this.status = status;
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": ERROR_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function validatePdfUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate || candidate.length > 8_192) {
    throw new ProxyError("A valid COA PDF URL is required.", 400);
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new ProxyError("A valid COA PDF URL is required.", 400);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:") {
    throw new ProxyError("Only HTTPS COA documents are allowed.", 400);
  }
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new ProxyError("This COA document host is not allowed.", 403);
  }
  if (parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) {
    throw new ProxyError("The COA document URL is not allowed.", 400);
  }
  if (parsed.hash) {
    throw new ProxyError("COA document fragments are not allowed.", 400);
  }
  if (!parsed.pathname.toLowerCase().endsWith(".pdf")) {
    throw new ProxyError("Only PDF COA documents are allowed.", 400);
  }

  return parsed;
}

function isRedirectStatus(status) {
  return [301, 302, 303, 307, 308].includes(status);
}

async function fetchAllowedPdf(initialUrl, signal) {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/pdf, application/octet-stream;q=0.8",
        "User-Agent": "Phase One COA Viewer/1.0",
      },
    });

    if (!isRedirectStatus(response.status)) {
      return response;
    }

    if (redirectCount === MAX_REDIRECTS) {
      response.body?.cancel?.().catch?.(() => {});
      throw new ProxyError("The COA document redirected too many times.", 502);
    }

    const location = response.headers.get("location");
    response.body?.cancel?.().catch?.(() => {});
    if (!location) {
      throw new ProxyError("The COA document returned an invalid redirect.", 502);
    }

    let redirected;
    try {
      redirected = new URL(location, currentUrl);
    } catch {
      throw new ProxyError("The COA document returned an invalid redirect.", 502);
    }

    currentUrl = validatePdfUrl(redirected.toString());
  }

  throw new ProxyError("The COA document could not be loaded.", 502);
}

async function readLimitedBody(response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PDF_BYTES) {
    response.body?.cancel?.().catch?.(() => {});
    throw new ProxyError("The COA PDF is too large to preview.", 413);
  }
  if (!response.body) {
    throw new ProxyError("The COA document returned an empty response.", 502);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_PDF_BYTES) {
        await reader.cancel();
        throw new ProxyError("The COA PDF is too large to preview.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (!totalBytes) {
    throw new ProxyError("The COA document returned an empty response.", 502);
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  });

  return output;
}

function hasPdfSignature(bytes) {
  if (bytes.byteLength < 5) return false;
  const searchLimit = Math.min(bytes.byteLength - 4, 1_024);
  for (let index = 0; index < searchLimit; index += 1) {
    if (
      bytes[index] === 0x25 &&
      bytes[index + 1] === 0x50 &&
      bytes[index + 2] === 0x44 &&
      bytes[index + 3] === 0x46 &&
      bytes[index + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

export async function GET({ url }) {
  let targetUrl;
  try {
    targetUrl = validatePdfUrl(url.searchParams.get("url"));
  } catch (error) {
    const status = error instanceof ProxyError ? error.status : 400;
    return jsonError(error?.message || "Invalid COA document URL.", status);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetchAllowedPdf(targetUrl, controller.signal);
    if (!upstream.ok) {
      upstream.body?.cancel?.().catch?.(() => {});
      throw new ProxyError("The COA document could not be loaded.", 502);
    }

    const contentType = String(upstream.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (contentType && !["application/pdf", "application/octet-stream"].includes(contentType)) {
      upstream.body?.cancel?.().catch?.(() => {});
      throw new ProxyError("The upstream document is not a PDF.", 502);
    }

    const bytes = await readLimitedBody(upstream);
    if (!hasPdfSignature(bytes)) {
      throw new ProxyError("The upstream document is not a valid PDF.", 502);
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": 'inline; filename="certificate.pdf"',
        "Cache-Control": SUCCESS_CACHE_CONTROL,
        "CDN-Cache-Control": SUCCESS_CACHE_CONTROL,
        "Vercel-CDN-Cache-Control": SUCCESS_CACHE_CONTROL,
        "Cross-Origin-Resource-Policy": "same-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return jsonError("The COA document request timed out.", 504);
    }

    const status = error instanceof ProxyError ? error.status : 502;
    return jsonError(
      error instanceof ProxyError
        ? error.message
        : "The COA document could not be loaded.",
      status,
    );
  } finally {
    clearTimeout(timeout);
  }
}
