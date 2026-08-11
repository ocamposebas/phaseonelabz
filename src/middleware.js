import { defineMiddleware } from "astro:middleware";

const CANONICAL_HOST = "phaseonelabz.com";

export const onRequest = defineMiddleware((context, next) => {
  if (context.url.hostname.toLowerCase() !== `www.${CANONICAL_HOST}`) {
    return next();
  }

  const canonicalUrl = new URL(context.url);
  canonicalUrl.protocol = "https:";
  canonicalUrl.hostname = CANONICAL_HOST;
  canonicalUrl.port = "";

  return Response.redirect(canonicalUrl, 308);
});
