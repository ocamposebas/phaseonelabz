const ALLOWED_STATUSES = new Set([
  "active",
  "widget",
  "link_only",
  "stale",
  "unavailable",
]);

function cleanText(value, maximum = 160) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function finiteRating(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 5
    ? Math.round(number * 10) / 10
    : null;
}

function finiteCount(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function isoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeWidget(value) {
  if (!value || value.provider !== "trustpilot") return null;
  const businessUnitId = cleanText(value.business_unit_id || value.businessUnitId, 100);
  const templateId = cleanText(value.template_id || value.templateId, 100);
  if (!businessUnitId || !templateId) return null;

  const height = /^\d{2,4}px$/.test(String(value.height || ""))
    ? String(value.height)
    : "52px";

  return {
    provider: "trustpilot",
    businessUnitId,
    templateId,
    locale: cleanText(value.locale, 12) || "en-US",
    theme: value.theme === "light" ? "light" : "dark",
    height,
  };
}

export function normalizeReputationSource(value) {
  if (!value || typeof value !== "object") return null;

  const provider = cleanText(value.provider, 80).toLowerCase();
  const name = cleanText(value.name, 100);
  const publicUrl = safeUrl(value.public_url || value.publicUrl);
  if (!provider || !name || !publicUrl) return null;

  const status = ALLOWED_STATUSES.has(value.status)
    ? value.status
    : "link_only";
  const rating = finiteRating(value.rating);
  const reviewCount = finiteCount(value.review_count ?? value.reviewCount);
  const hasCurrentMetrics =
    status === "active" && rating !== null && reviewCount !== null;

  return {
    provider,
    name,
    type: cleanText(value.type, 120) || "Independent source",
    logo: safeUrl(value.logo),
    rating: hasCurrentMetrics ? rating : null,
    reviewCount: hasCurrentMetrics ? reviewCount : null,
    publicUrl,
    leaveReviewUrl: safeUrl(value.leave_review_url || value.leaveReviewUrl),
    lastUpdated: isoDate(value.last_updated || value.lastUpdated),
    status,
    widget: normalizeWidget(value.widget),
  };
}

export function normalizeReputationPayload(value) {
  const sources = Array.isArray(value?.sources)
    ? value.sources.map(normalizeReputationSource).filter(Boolean)
    : [];

  return {
    schemaVersion: Number(value?.schema_version ?? value?.schemaVersion) || 1,
    generatedAt: isoDate(value?.generated_at || value?.generatedAt),
    sources,
    disclosure:
      cleanText(value?.disclosure, 260) ||
      "Each rating belongs to its named source. Scores are never combined.",
  };
}
