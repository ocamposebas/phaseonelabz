import { useEffect } from "react";

function normalizeCoupon(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 32);
}

function getCouponFromUrl() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);

  return normalizeCoupon(
    params.get("coupon") ||
      params.get("coupon_code") ||
      params.get("discount_code") ||
      params.get("phaseone_coupon") ||
      params.get("affiliate_coupon") ||
      params.get("promo") ||
      params.get("ref") ||
      ""
  );
}

function getVisitorId() {
  if (typeof window === "undefined") return "";

  const key = "phaseone_affiliate_visitor_id";
  const existing = localStorage.getItem(key);

  if (existing) return existing;

  const visitorId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `visitor_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(key, visitorId);

  try {
    const maxAge = 60 * 60 * 24 * 90;
    const encoded = encodeURIComponent(visitorId);
    const cookie = `phaseone_affiliate_visitor_id=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;

    document.cookie = cookie;
    document.cookie = `${cookie}; Domain=.phaseonelabz.com`;
  } catch {
    // Ignore cookie errors.
  }

  return visitorId;
}

function persistCoupon(coupon = "") {
  const cleanCoupon = normalizeCoupon(coupon);

  if (!cleanCoupon || typeof window === "undefined") return "";

  localStorage.setItem("phaseone_checkout_coupon", cleanCoupon);
  localStorage.setItem("phaseone_affiliate_coupon", cleanCoupon);
  localStorage.setItem("phaseone_affiliate_last_touch_coupon", cleanCoupon);
  localStorage.setItem("phaseone_affiliate_last_touch_at", new Date().toISOString());

  if (!localStorage.getItem("phaseone_affiliate_first_touch_coupon")) {
    localStorage.setItem("phaseone_affiliate_first_touch_coupon", cleanCoupon);
    localStorage.setItem("phaseone_affiliate_first_touch_at", new Date().toISOString());
  }

  try {
    const maxAge = 60 * 60 * 24 * 7;
    const encoded = encodeURIComponent(cleanCoupon);
    const cookie = `phaseone_tagada_coupon=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;

    document.cookie = cookie;
    document.cookie = `${cookie}; Domain=.phaseonelabz.com`;
  } catch {
    // Ignore cookie errors.
  }

  return cleanCoupon;
}

async function sendAffiliateClick(coupon = "") {
  if (typeof window === "undefined") return;

  const cleanCoupon = normalizeCoupon(coupon);

  if (!cleanCoupon) return;

  const payload = {
    event: "click",
    coupon: cleanCoupon,
    couponCode: cleanCoupon,
    visitorId: getVisitorId(),
    pageUrl: window.location.href,
    path: window.location.pathname || "",
    query: window.location.search || "",
    referrer: document.referrer || "",
    userAgent: navigator.userAgent || "",
    occurredAt: new Date().toISOString(),
    source: "phaseone_global_affiliate_tracker",
  };

  console.log("[Phase One Affiliate] Sending click:", payload);

  const response = await fetch("/api/affiliate/track.json", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  console.log("[Phase One Affiliate] Track response:", response.status, text);

  if (!response.ok) {
    throw new Error(text || `Tracking failed with status ${response.status}`);
  }
}

export default function AffiliateCouponTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const coupon = getCouponFromUrl();

    console.log("[Phase One Affiliate] URL coupon:", coupon || "none");

    if (!coupon) return;

    persistCoupon(coupon);

    // Para testing, NO deduplicamos todavía.
    // Después de confirmar que funciona, agregamos la protección por día.
    sendAffiliateClick(coupon).catch((error) => {
      console.warn("[Phase One Affiliate] Click tracking failed:", error);
    });
  }, []);

  return null;
}